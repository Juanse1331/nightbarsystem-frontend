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
  Modal,
  Image,
  useWindowDimensions,
  Platform,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import { colors, spacing, radius, typography, globalStyles } from "../theme";
import { Producto, Mesa, Pedido, EstadoPedido } from "../types";
import { ScreenProps } from "../navigation/AppNavigator";

type Props = ScreenProps<"MeseroHome">;
type Tab = "order" | "history";

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

const CATEGORY_ICONS: Record<string, string> = {
  Whisky: "🥃",
  Ron: "🍹",
  Vodka: "❄️",
  Tequila: "🌵",
  Aguardiente: "🔥",
  Cerveza: "🍺",
};

interface CartMap {
  [productoId: number]: number;
}

export default function MeseroHome({ navigation }: Props) {
  const { width } = useWindowDimensions();

  const isDesktop = width >= 1200;
  const isTablet = width >= 768 && width < 1200;
  const isMobile = width < 768;

  const CARD_WIDTH = isDesktop ? "23%" : isTablet ? "31%" : "47%";

  const CONTENT_WIDTH = isDesktop ? 1500 : 1000;

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

  const [productoSeleccionado, setProductoSeleccionado] =
    useState<Producto | null>(null);

  const [modalVisible, setModalVisible] = useState(false);

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

      setProductos(prods);
      setMesas(ms);
      setPedidos(peds);
    } catch (e) {
      Alert.alert("Error", "No se pudieron cargar los datos");
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

  const addToCart = (id: number) =>
    setCart((prev) => ({
      ...prev,
      [id]: (prev[id] ?? 0) + 1,
    }));

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

  const pedidoTotal = (pedido: Pedido) =>
    pedido.detalles.reduce((sum, d) => {
      const precio = d.precio_unitario ? parseFloat(d.precio_unitario) : 0;

      return sum + precio * d.cantidad;
    }, 0);

  const enviarPedido = async () => {
    if (!mesaSeleccionada) {
      Alert.alert("Mesa requerida", "Selecciona una mesa");
      return;
    }

    if (cartCount() === 0) {
      Alert.alert("Carrito vacío", "Agrega bebidas");
      return;
    }

    setSending(true);

    try {
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
      const msg = e?.data?.detail ?? "No se pudo enviar el pedido";

      Alert.alert("Error", msg);
    } finally {
      setSending(false);
    }
  };

  if (loadingData) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.mesero} size="large" />
      </View>
    );
  }

  const pedidosActivos = pedidos.filter((p) => p.estado !== "delivered");

  const pedidosEntregados = pedidos.filter((p) => p.estado === "delivered");

  const productosPorCategoria = productos.reduce(
    (acc, producto) => {
      const categoria = producto.categoria_nombre || "Sin categoría";

      if (!acc[categoria]) {
        acc[categoria] = [];
      }

      acc[categoria].push(producto);

      return acc;
    },
    {} as Record<string, Producto[]>,
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* TOPBAR */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topBarRole}>🧑‍🍳 MESERO PANEL</Text>

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

      {/* TABS */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabs}>
          {(
            [
              {
                key: "order",
                label: "+ PEDIDO",
                icon: "📋",
              },
              {
                key: "history",
                label: "HISTORIAL",
                icon: "🕐",
              },
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
      </View>

      {/* ORDER */}
      {tab === "order" ? (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.contentContainer, { maxWidth: CONTENT_WIDTH }]}>
            {/* MESAS */}
            <Text style={styles.sectionLabel}>MESAS</Text>

            <View style={styles.tablesGrid}>
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
            </View>

            {/* PRODUCTOS */}
            <Text style={styles.sectionLabel}>BEBIDAS</Text>

            {Object.entries(productosPorCategoria).map(([categoria, items]) => (
              <View key={categoria} style={{ marginBottom: spacing.xl }}>
                <Text style={styles.categoryTitle}>
                  {CATEGORY_ICONS[categoria]} {categoria.toUpperCase()}
                </Text>

                <View style={styles.productsGrid}>
                  {items.map((p) => {
                    const qty = cart[p.id] ?? 0;

                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.productCard,
                          {
                            width: CARD_WIDTH,
                          },
                          qty > 0 && styles.productCardSelected,
                        ]}
                        activeOpacity={0.9}
                        onPress={() => {
                          setProductoSeleccionado(p);
                          setModalVisible(true);
                        }}
                      >
                        {p.imagen_url ? (
                          <Image
                            source={{ uri: p.imagen_url }}
                            style={styles.productImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.placeholderMini}>
                            <Text
                              style={{
                                color: "white",
                              }}
                            >
                              SIN IMAGEN
                            </Text>
                          </View>
                        )}

                        <Text style={styles.productName} numberOfLines={2}>
                          {p.nombre}
                        </Text>

                        <Text style={styles.productPrice}>
                          ${parseFloat(p.precio).toLocaleString()}
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
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            <View style={{ height: 160 }} />
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.mesero}
            />
          }
        >
          <View style={[styles.contentContainer, { maxWidth: 1100 }]}>
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
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: s.bg,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              {
                                color: s.color,
                              },
                            ]}
                          >
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
                        TOTAL ${pedidoTotal(pedido).toLocaleString()}
                      </Text>
                    </View>
                  );
                })}
              </>
            )}

            <Text style={styles.sectionLabel}>ENTREGADOS</Text>

            {pedidosEntregados.map((pedido) => (
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
                      {
                        backgroundColor: colors.delivered + "20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: colors.delivered,
                        },
                      ]}
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
                  TOTAL ${pedidoTotal(pedido).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* FOOTER */}
      {tab === "order" && (
        <View style={[styles.footer, isDesktop && styles.footerDesktop]}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerCount}>{cartCount()} items</Text>

            <Text style={styles.footerTotal}>
              ${cartTotal().toLocaleString()}
            </Text>
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

      {/* MODAL */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              isDesktop && {
                width: 550,
              },
            ]}
          >
            {productoSeleccionado?.imagen_url ? (
              <Image
                source={{
                  uri: productoSeleccionado.imagen_url,
                }}
                style={styles.modalImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={{ color: "white" }}>SIN IMAGEN</Text>
              </View>
            )}

            <Text style={styles.modalTitle}>
              {productoSeleccionado?.nombre}
            </Text>

            <Text style={styles.modalCategory}>
              {productoSeleccionado?.categoria_nombre}
            </Text>

            <Text style={styles.modalDescription}>
              {productoSeleccionado?.descripcion}
            </Text>

            <Text style={styles.modalPrice}>
              ${productoSeleccionado?.precio}
            </Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                if (productoSeleccionado) {
                  addToCart(productoSeleccionado.id);
                }

                setModalVisible(false);
              }}
            >
              <Text style={styles.modalButtonText}>AGREGAR AL PEDIDO</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
  },

  scroll: {
    flex: 1,
  },

  contentContainer: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === "web" ? 30 : 54,
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
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },

  logoutText: {
    color: colors.textMuted,
    fontSize: 11,
  },

  tabsWrapper: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xs,
    alignSelf: "center",
    width: "100%",
    maxWidth: 1500,
  },

  tab: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
  },

  tabActive: {
    backgroundColor: colors.mesero,
  },

  tabText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },

  tabTextActive: {
    color: colors.black,
  },

  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 3,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  tablesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  tableBtn: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  tableBtnActive: {
    backgroundColor: colors.mesero,
    borderColor: colors.mesero,
  },

  tableNum: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },

  tableNumActive: {
    color: colors.black,
  },

  tableDot: {
    width: 8,
    height: 8,
    borderRadius: 10,
    position: "absolute",
    top: 8,
    right: 8,
  },

  categoryTitle: {
    color: colors.mesero,
    fontSize: 22,
    marginBottom: spacing.md,
    fontWeight: "800",
  },

  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  productCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },

  productCardSelected: {
    borderColor: colors.mesero,
    backgroundColor: colors.meseroGlow,
  },

  productImage: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    marginBottom: spacing.md,
  },

  placeholderMini: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },

  productName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },

  productPrice: {
    color: colors.mesero,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6,
    marginBottom: spacing.md,
  },

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  qtyBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },

  qtyBtnAdd: {
    backgroundColor: colors.mesero,
  },

  qtyBtnText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
  },

  qtyNum: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  footerDesktop: {
    alignSelf: "center",
    maxWidth: 1500,
    borderRadius: 20,
    marginBottom: 10,
    left: 20,
    right: 20,
  },

  footerInfo: {
    flex: 1,
  },

  footerCount: {
    color: colors.textMuted,
    fontSize: 12,
  },

  footerTotal: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "800",
  },

  sendBtn: {
    flex: 2,
    backgroundColor: colors.mesero,
    borderRadius: radius.lg,
    paddingVertical: 18,
    alignItems: "center",
  },

  sendBtnText: {
    color: colors.black,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1,
  },

  orderCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  orderTable: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800",
  },

  orderItem: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 6,
  },

  orderTotal: {
    color: colors.mesero,
    fontSize: 16,
    marginTop: spacing.md,
    fontWeight: "800",
  },

  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },

  modalContent: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: spacing.lg,
  },

  modalImage: {
    width: "100%",
    height: 280,
    borderRadius: 18,
    marginBottom: spacing.md,
  },

  placeholderImage: {
    width: "100%",
    height: 280,
    borderRadius: 18,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },

  modalTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
  },

  modalCategory: {
    color: colors.mesero,
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
  },

  modalDescription: {
    color: colors.textSecondary,
    marginTop: spacing.md,
    lineHeight: 24,
    fontSize: 15,
  },

  modalPrice: {
    color: colors.delivered,
    fontSize: 28,
    marginTop: spacing.lg,
    fontWeight: "800",
  },

  modalButton: {
    backgroundColor: colors.mesero,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    marginTop: spacing.xl,
  },

  modalButtonText: {
    color: colors.black,
    fontWeight: "800",
    letterSpacing: 1,
  },

  closeText: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
  },
});
