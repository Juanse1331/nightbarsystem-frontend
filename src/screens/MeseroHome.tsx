import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import { colors, spacing, radius, typography, globalStyles } from "../theme";
import { Producto, Mesa, Pedido, EstadoPedido } from "../types";
import { ScreenProps } from "../navigation/AppNavigator";

type Props = ScreenProps<"MeseroHome">;
type Tab = "order" | "history";

// Mapa de estados del pedido (los valores vienen del backend en minúscula)
const STATUS_CONFIG: Record<
  EstadoPedido,
  { label: string; color: string; bg: string }
> = {
  pending: {
    label: "PENDIENTE",
    color: colors.pending,
    bg: colors.pending + "20",
  },
  preparing: {
    label: "PREPARANDO",
    color: colors.preparing,
    bg: colors.preparing + "20",
  },
  delivered: {
    label: "ENTREGADO",
    color: colors.delivered,
    bg: colors.delivered + "20",
  },
};

interface CartMap {
  [productoId: number]: number;
}

export default function MeseroHome({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("order");

  const [productos, setProductos] = useState<Producto[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [mesaSeleccionada, setMesaSeleccionada] = useState<number | null>(null);
  const [cart, setCart] = useState<CartMap>({});
  const [sending, setSending] = useState(false);

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [prods, ms, peds] = await Promise.all([
        api.getProductos(),
        api.getMesas(),
        api.getPedidos(),
      ]);
      // Solo mesas disponibles para seleccionar
      setProductos(prods);
      setMesas(ms);
      setPedidos(peds);
    } catch (e: any) {
      Alert.alert("Error", "No se pudieron cargar los datos del servidor");
    } finally {
      setLoadingData(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const peds = await api.getPedidos();
      setPedidos(peds);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // ── Cart ──────────────────────────────────────────────────────────────────
  const addToCart = (id: number) =>
    setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));

  const removeFromCart = (id: number) =>
    setCart((prev) => {
      const next = { ...prev };
      if ((next[id] ?? 0) <= 1) delete next[id];
      else next[id]--;
      return next;
    });

  const cartCount = () => Object.values(cart).reduce((a, b) => a + b, 0);

  const cartTotal = () =>
    Object.entries(cart).reduce((sum, [id, qty]) => {
      const p = productos.find((x) => x.id === Number(id));
      return sum + (p ? parseFloat(p.precio) * qty : 0);
    }, 0);

  // El total del pedido se calcula localmente usando precio actual del catálogo
  const pedidoTotal = (pedido: Pedido) =>
    pedido.detalles.reduce((sum, d) => {
      const precio = d.precio_unitario ? parseFloat(d.precio_unitario) : 0;
      return sum + precio * d.cantidad;
    }, 0);

  // ── Enviar pedido ─────────────────────────────────────────────────────────
  const enviarPedido = async () => {
    if (!mesaSeleccionada) {
      Alert.alert("Mesa requerida", "Selecciona una mesa primero");
      return;
    }
    if (cartCount() === 0) {
      Alert.alert("Carrito vacío", "Agrega al menos una bebida");
      return;
    }
    setSending(true);
    try {
      // Body exacto: { mesa: id, detalles: [{ producto: id, cantidad: n }] }
      // NO enviar precio_unitario → el backend lo toma del catálogo (read_only)
      const detalles = Object.entries(cart).map(([producto, cantidad]) => ({
        producto: Number(producto),
        cantidad,
      }));
      await api.crearPedido(mesaSeleccionada, detalles);
      setCart({});
      setMesaSeleccionada(null);
      Alert.alert("✅ Pedido enviado", "El bartender ya lo recibió");
      const peds = await api.getPedidos();
      setPedidos(peds);
    } catch (e: any) {
      const msg =
        e?.data?.non_field_errors?.[0] ??
        e?.data?.detail ??
        "No se pudo enviar el pedido";
      Alert.alert("Error", msg);
    } finally {
      setSending(false);
    }
  };

  if (loadingData) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator color={colors.mesero} size="large" />
      </View>
    );
  }

  // Separar pedidos activos (pending/preparing) de entregados
  const pedidosActivos = pedidos.filter((p) => p.estado !== "delivered");
  const pedidosEntregados = pedidos.filter((p) => p.estado === "delivered");

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarRole}>🧑‍🍳 MESERO</Text>
          <Text style={styles.topBarUser}>
            {(user?.nombre ?? user?.username ?? "").toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity
          onPress={async () => {
            await signOut();
            navigation.replace("RoleSelector");
          }}
          style={styles.logoutBtn}
        >
          <Text style={styles.logoutText}>SALIR</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(
          [
            { key: "order", label: "+ PEDIDO", icon: "📋" },
            { key: "history", label: "HISTORIAL", icon: "🕐" },
          ] as const
        ).map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text
              style={[styles.tabText, tab === t.key && styles.tabTextActive]}
            >
              {t.icon} {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── ORDER TAB ── */}
      {tab === "order" ? (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>MESA</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tableRow}
          >
            {mesas.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.tableBtn,
                  mesaSeleccionada === m.id && styles.tableBtnActive,
                ]}
                onPress={() => setMesaSeleccionada(m.id)}
              >
                <Text
                  style={[
                    styles.tableNum,
                    mesaSeleccionada === m.id && styles.tableNumActive,
                  ]}
                >
                  {m.numero}
                </Text>
                {/* Indicador de ocupación */}
                <View
                  style={[
                    styles.tableDot,
                    {
                      backgroundColor:
                        m.estado === "occupied"
                          ? colors.danger
                          : colors.delivered,
                    },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.sectionLabel}>BEBIDAS</Text>
          <View style={styles.productsGrid}>
            {productos.map((p) => {
              const qty = cart[p.id] ?? 0;
              return (
                <View
                  key={p.id}
                  style={[
                    styles.productCard,
                    qty > 0 && styles.productCardSelected,
                  ]}
                >
                  {p.imagen ? null : null}
                  <Text style={styles.productName}>{p.nombre}</Text>
                  <Text style={styles.productPrice}>
                    ${parseFloat(p.precio).toFixed(2)}
                  </Text>
                  <View style={styles.qtyRow}>
                    {qty > 0 && (
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => removeFromCart(p.id)}
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                    )}
                    {qty > 0 && <Text style={styles.qtyNum}>{qty}</Text>}
                    <TouchableOpacity
                      style={[styles.qtyBtn, styles.qtyBtnAdd]}
                      onPress={() => addToCart(p.id)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
          <View style={{ height: 160 }} />
        </ScrollView>
      ) : (
        /* ── HISTORY TAB ── */
        <ScrollView
          style={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.mesero}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {pedidosActivos.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>ACTIVOS</Text>
              {pedidosActivos.map((pedido) => {
                const s = STATUS_CONFIG[pedido.estado];
                return (
                  <View key={pedido.id} style={styles.orderCard}>
                    <View style={globalStyles.spaceBetween}>
                      <Text style={styles.orderTable}>
                        MESA {pedido.numero_mesa ?? pedido.mesa}
                      </Text>
                      <View
                        style={[styles.statusBadge, { backgroundColor: s.bg }]}
                      >
                        <Text style={[styles.statusText, { color: s.color }]}>
                          {s.label}
                        </Text>
                      </View>
                    </View>
                    {pedido.detalles.map((d, i) => (
                      <Text key={i} style={styles.orderItem}>
                        {d.cantidad}×{" "}
                        {d.nombre_producto ?? `Producto ${d.producto}`}
                      </Text>
                    ))}
                    <Text style={styles.orderTotal}>
                      TOTAL ${pedidoTotal(pedido).toFixed(2)}
                    </Text>
                  </View>
                );
              })}
            </>
          )}

          <Text style={styles.sectionLabel}>ENTREGADOS HOY</Text>
          {pedidosEntregados.length === 0 ? (
            <Text style={styles.emptyText}>Sin pedidos entregados hoy</Text>
          ) : (
            pedidosEntregados.map((pedido) => (
              <View
                key={pedido.id}
                style={[styles.orderCard, { opacity: 0.7 }]}
              >
                <View style={globalStyles.spaceBetween}>
                  <Text style={styles.orderTable}>
                    MESA {pedido.numero_mesa ?? pedido.mesa}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: colors.delivered + "20" },
                    ]}
                  >
                    <Text
                      style={[styles.statusText, { color: colors.delivered }]}
                    >
                      ✓ ENTREGADO
                    </Text>
                  </View>
                </View>
                {pedido.detalles.map((d, i) => (
                  <Text key={i} style={styles.orderItem}>
                    {d.cantidad}×{" "}
                    {d.nombre_producto ?? `Producto ${d.producto}`}
                  </Text>
                ))}
                <Text style={styles.orderTotal}>
                  TOTAL ${pedidoTotal(pedido).toFixed(2)}
                </Text>
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Footer envío */}
      {tab === "order" && (
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerCount}>{cartCount()} items</Text>
            <Text style={styles.footerTotal}>${cartTotal().toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, sending && { opacity: 0.5 }]}
            onPress={enviarPedido}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color={colors.black} />
            ) : (
              <Text style={styles.sendBtnText}>ENVIAR PEDIDO</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, paddingHorizontal: spacing.lg },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: 54,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarRole: {
    color: colors.mesero,
    fontSize: 12,
    ...typography.caption,
    letterSpacing: 2,
  },
  topBarUser: {
    color: colors.textPrimary,
    fontSize: 18,
    ...typography.heading,
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: {
    color: colors.textMuted,
    fontSize: 10,
    ...typography.caption,
    letterSpacing: 1,
  },
  tabs: {
    flexDirection: "row",
    padding: spacing.sm,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: "center",
  },
  tabActive: { backgroundColor: colors.mesero },
  tabText: {
    color: colors.textMuted,
    fontSize: 12,
    ...typography.caption,
    letterSpacing: 1,
  },
  tabTextActive: { color: colors.black, fontWeight: "800" },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    ...typography.caption,
    letterSpacing: 3,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  tableRow: { marginBottom: spacing.sm },
  tableBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  tableBtnActive: {
    backgroundColor: colors.mesero,
    borderColor: colors.mesero,
  },
  tableNum: {
    color: colors.textSecondary,
    fontSize: 16,
    ...typography.subheading,
  },
  tableNumActive: { color: colors.black },
  tableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: "absolute",
    top: 6,
    right: 6,
  },
  productsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  productCard: {
    width: "47%",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productCardSelected: {
    borderColor: colors.mesero,
    backgroundColor: colors.meseroGlow,
  },
  productName: {
    color: colors.textPrimary,
    fontSize: 14,
    ...typography.subheading,
    marginBottom: 2,
  },
  productPrice: {
    color: colors.mesero,
    fontSize: 18,
    ...typography.heading,
    marginBottom: spacing.sm,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 4,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnAdd: { backgroundColor: colors.mesero },
  qtyBtnText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
  },
  qtyNum: {
    color: colors.textPrimary,
    fontSize: 16,
    ...typography.subheading,
    minWidth: 20,
    textAlign: "center",
  },
  orderCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderTable: {
    color: colors.textPrimary,
    fontSize: 16,
    ...typography.heading,
  },
  orderItem: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  orderTotal: {
    color: colors.mesero,
    fontSize: 14,
    ...typography.subheading,
    marginTop: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusText: { fontSize: 10, ...typography.caption, letterSpacing: 1 },
  emptyText: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    ...typography.body,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 36,
    gap: spacing.md,
  },
  footerInfo: { flex: 1 },
  footerCount: { color: colors.textMuted, fontSize: 12, ...typography.caption },
  footerTotal: {
    color: colors.textPrimary,
    fontSize: 20,
    ...typography.heading,
  },
  sendBtn: {
    flex: 2,
    backgroundColor: colors.mesero,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  sendBtnText: {
    color: colors.black,
    fontSize: 14,
    ...typography.heading,
    letterSpacing: 1,
  },
});
