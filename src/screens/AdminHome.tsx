import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import { colors, spacing, radius, typography, globalStyles } from "../theme";
import { ReporteDiario } from "../types";
import { ScreenProps } from "../navigation/AppNavigator";

type Props = ScreenProps<"AdminHome">;
type Tab = "stats" | "users";

const { width } = Dimensions.get("window");
const BAR_MAX_W = width - spacing.lg * 2 - 110;

export default function AdminHome({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("stats");
  const [reportes, setReportes] = useState<ReporteDiario[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await api.getReportes();
      setReportes(data);
    } catch (e: any) {
      // Si no hay reportes aún, no es un error crítico
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleGenerarCorte = async () => {
    setGenerando(true);
    try {
      const res = await api.generarCorteDiario();
      Alert.alert("✅ Corte generado", res.mensaje);
      await loadData();
    } catch (e: any) {
      Alert.alert("Error", e?.data?.detail ?? "No se pudo generar el corte");
    } finally {
      setGenerando(false);
    }
  };

  // Reporte de hoy (primero de la lista, ordenado por -fecha)
  const hoy = reportes[0] ?? null;
  // Últimos 7 días para la gráfica
  const ultimos7 = [...reportes].slice(0, 7).reverse();
  const maxIngreso = Math.max(
    ...ultimos7.map((r) => parseFloat(String(r.ingresos_totales))),
    1,
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={globalStyles.row}>
          <Text style={styles.topBarIcon}>👔</Text>
          <View style={{ marginLeft: spacing.sm }}>
            <Text style={styles.topBarRole}>ADMIN PANEL</Text>
            <Text style={styles.topBarUser}>
              {(user?.nombre ?? user?.email ?? "").toUpperCase()}
            </Text>
          </View>
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
            { key: "stats", label: "📊 ESTADÍSTICAS" },
            { key: "users", label: "👥 INFO" },
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
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.admin} size="large" />
        </View>
      ) : tab === "stats" ? (
        <ScrollView
          style={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.admin}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Botón generar corte */}
          <TouchableOpacity
            style={[styles.corteBtn, generando && { opacity: 0.6 }]}
            onPress={handleGenerarCorte}
            disabled={generando}
          >
            {generando ? (
              <ActivityIndicator color={colors.black} size="small" />
            ) : (
              <Text style={styles.corteBtnText}>⚡ GENERAR CORTE DE HOY</Text>
            )}
          </TouchableOpacity>

          {/* KPIs del reporte más reciente */}
          {hoy && (
            <>
              <Text style={styles.sectionLabel}>REPORTE: {hoy.fecha}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(
                  [
                    {
                      label: "INGRESOS",
                      value: `$${parseFloat(String(hoy.ingresos_totales)).toFixed(0)}`,
                      color: colors.mesero,
                    },
                    {
                      label: "PEDIDOS",
                      value: String(hoy.pedidos_completados),
                      color: colors.admin,
                    },
                    {
                      label: "TOP PROD.",
                      value: hoy.producto_estrella,
                      color: colors.bartender,
                    },
                    {
                      label: "TOP MESERO",
                      value: hoy.mesero_destacado,
                      color: colors.delivered,
                    },
                  ] as const
                ).map((k, i) => (
                  <View
                    key={i}
                    style={[styles.kpiCard, { borderColor: k.color + "40" }]}
                  >
                    <Text style={styles.kpiLabel}>{k.label}</Text>
                    <Text
                      style={[styles.kpiValue, { color: k.color }]}
                      numberOfLines={2}
                    >
                      {k.value}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </>
          )}

          {/* Gráfica de barras últimos 7 días */}
          <Text style={styles.sectionLabel}>INGRESOS ÚLTIMOS 7 DÍAS</Text>
          <View style={styles.chartCard}>
            {ultimos7.length === 0 ? (
              <Text style={styles.emptyText}>Sin reportes generados aún</Text>
            ) : (
              <View style={styles.barsRow}>
                {ultimos7.map((r, i) => {
                  const val = parseFloat(String(r.ingresos_totales));
                  const barH = Math.max(4, (val / maxIngreso) * 100);
                  const fecha = new Date(r.fecha);
                  const label = fecha
                    .toLocaleDateString("es", { weekday: "short" })
                    .slice(0, 3)
                    .toUpperCase();
                  return (
                    <View key={i} style={styles.barCol}>
                      <Text style={styles.barValue}>${Math.round(val)}</Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.bar,
                            { height: barH, backgroundColor: colors.admin },
                          ]}
                        />
                      </View>
                      <Text style={styles.barLabel}>{label}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Historial de reportes */}
          <Text style={styles.sectionLabel}>HISTORIAL DE CORTES</Text>
          <View style={styles.card}>
            {reportes.length === 0 ? (
              <Text style={styles.emptyText}>
                Presiona "GENERAR CORTE DE HOY" para crear el primer reporte
              </Text>
            ) : (
              reportes.map((r, i) => (
                <View
                  key={r.id}
                  style={[
                    globalStyles.spaceBetween,
                    { paddingVertical: spacing.sm },
                    i < reportes.length - 1 && styles.rowDivider,
                  ]}
                >
                  <View>
                    <Text style={styles.reporteFecha}>{r.fecha}</Text>
                    <Text style={styles.reporteDetalle}>
                      {r.pedidos_completados} pedidos · ⭐ {r.producto_estrella}
                    </Text>
                  </View>
                  <Text style={styles.reporteIngreso}>
                    ${parseFloat(String(r.ingresos_totales)).toFixed(0)}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* ── INFO TAB ── */
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>ROLES DEL SISTEMA</Text>
          <View style={styles.card}>
            <Text style={styles.infoText}>
              Los usuarios se crean y gestionan desde el panel de administración
              web de Django en{" "}
              <Text style={{ color: colors.admin }}>/admin/</Text>
            </Text>
            <View style={styles.divider} />
            {(
              [
                {
                  rol: "Mesero",
                  desc: "Crea pedidos desde mesas",
                  color: colors.mesero,
                  icon: "🧑‍🍳",
                },
                {
                  rol: "Bartender",
                  desc: "Gestiona la cola FIFO de pedidos",
                  color: colors.bartender,
                  icon: "🍸",
                },
                {
                  rol: "Administrador",
                  desc: "Gestión total + cortes de caja",
                  color: colors.admin,
                  icon: "👔",
                },
              ] as const
            ).map((r, i) => (
              <View
                key={i}
                style={[styles.roleRow, { borderColor: r.color + "30" }]}
              >
                <Text style={styles.roleIcon}>{r.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleName, { color: r.color }]}>
                    {r.rol}
                  </Text>
                  <Text style={styles.roleDesc}>{r.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.sectionLabel}>USUARIO ACTUAL</Text>
          <View style={styles.card}>
            {[
              { label: "Nombre", value: user?.nombre ?? "—" },
              { label: "Email", value: user?.email ?? "—" },
              { label: "Username", value: user?.username ?? "—" },
              { label: "Rol", value: user?.rol ?? "—" },
            ].map((f, i) => (
              <View
                key={i}
                style={[
                  globalStyles.spaceBetween,
                  { paddingVertical: spacing.xs },
                ]}
              >
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <Text style={styles.fieldValue}>{f.value}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, paddingHorizontal: spacing.lg },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  topBarIcon: { fontSize: 28 },
  topBarRole: {
    color: colors.admin,
    fontSize: 12,
    ...typography.caption,
    letterSpacing: 2,
  },
  topBarUser: {
    color: colors.textPrimary,
    fontSize: 16,
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
  tabActive: { backgroundColor: colors.admin },
  tabText: {
    color: colors.textMuted,
    fontSize: 12,
    ...typography.caption,
    letterSpacing: 1,
  },
  tabTextActive: { color: colors.white, fontWeight: "800" },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    ...typography.caption,
    letterSpacing: 3,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  corteBtn: {
    backgroundColor: colors.admin,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  corteBtnText: {
    color: colors.white,
    fontSize: 14,
    ...typography.heading,
    letterSpacing: 1,
  },
  kpiCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    marginRight: spacing.sm,
    minWidth: 110,
  },
  kpiLabel: {
    color: colors.textMuted,
    fontSize: 10,
    ...typography.caption,
    letterSpacing: 2,
  },
  kpiValue: { fontSize: 20, ...typography.display, marginTop: 4 },
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xs,
    height: 130,
  },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barValue: { color: colors.textMuted, fontSize: 8, ...typography.caption },
  barTrack: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  bar: { width: "70%", borderRadius: 4, minHeight: 4 },
  barLabel: { color: colors.textMuted, fontSize: 9, ...typography.caption },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    ...typography.body,
    textAlign: "center",
    paddingVertical: spacing.sm,
  },
  reporteFecha: {
    color: colors.textPrimary,
    fontSize: 14,
    ...typography.subheading,
  },
  reporteDetalle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  reporteIngreso: { color: colors.admin, fontSize: 18, ...typography.heading },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  infoText: {
    color: colors.textSecondary,
    fontSize: 13,
    ...typography.body,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  roleIcon: { fontSize: 24 },
  roleName: { fontSize: 14, ...typography.subheading, letterSpacing: 1 },
  roleDesc: {
    color: colors.textMuted,
    fontSize: 12,
    ...typography.body,
    marginTop: 2,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    ...typography.caption,
    letterSpacing: 1,
  },
  fieldValue: {
    color: colors.textPrimary,
    fontSize: 13,
    ...typography.subheading,
  },
});
