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
  useWindowDimensions,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import { colors, spacing, radius, typography, globalStyles } from "../theme";
import { ReporteDiario } from "../types";
import { ScreenProps } from "../navigation/AppNavigator";

type Props = ScreenProps<"AdminHome">;
type Tab = "stats" | "users";

const CHART_H = 150;

export default function AdminHome({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1100;
  const isTablet = width >= 768;

  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("stats");
  const [reportes, setReportes] = useState<ReporteDiario[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generando, setGenerando] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const data = await api.getReportes();
      setReportes(data);
    } catch (_e) {
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
      Alert.alert("Corte generado", res.mensaje);
      await loadData();
    } catch (e: any) {
      Alert.alert("Error", e?.data?.detail ?? "No se pudo generar el corte");
    } finally {
      setGenerando(false);
    }
  };

  const hoy = reportes[0] ?? null;
  const ultimos7 = [...reportes].slice(0, 7).reverse();
  const maxIngreso = Math.max(
    ...ultimos7.map((r) => parseFloat(String(r.ingresos_totales))),
    1,
  );

  const formatMoney = (v: number) => `$${v.toLocaleString("es-CO")}`;

  const formatShort = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
    return `$${v.toFixed(0)}`;
  };

  const getDayLabel = (fecha: string) => {
    const [y, m, d] = fecha.split("-").map(Number);
    return new Date(y, m - 1, d)
      .toLocaleDateString("es-CO", { weekday: "short" })
      .slice(0, 3)
      .toUpperCase();
  };

  const kpiItems = hoy
    ? [
        {
          label: "INGRESOS HOY",
          value: formatMoney(parseFloat(String(hoy.ingresos_totales))),
          icon: "💰",
          color: colors.mesero,
        },
        {
          label: "PEDIDOS COMPLETADOS",
          value: String(hoy.pedidos_completados),
          icon: "🧾",
          color: colors.admin,
        },
        {
          label: "TOP PRODUCTO",
          value: hoy.producto_estrella || "—",
          icon: "⭐",
          color: colors.bartender,
        },
        {
          label: "TOP MESERO",
          value: hoy.mesero_destacado || "—",
          icon: "🏆",
          color: colors.delivered,
        },
      ]
    : [];

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.admin} size="large" />
        <Text style={styles.loadingText}>Cargando panel...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <View style={[styles.container, isDesktop && styles.containerDesktop]}>
        {/* ── TOP BAR ── */}
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
            onPress={() => { signOut(); navigation.replace("RoleSelector"); }}
            style={styles.logoutBtn}
          >
            <Text style={styles.logoutText}>SALIR</Text>
          </TouchableOpacity>
        </View>

        {/* ── TABS ── */}
        <View style={[styles.tabsBar, isTablet && styles.tabsBarWide]}>
          {[
            { key: "stats", label: "📊  ESTADÍSTICAS" },
            { key: "users", label: "👥  INFORMACIÓN" },
          ].map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key as Tab)}
            >
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── STATS TAB ── */}
        {tab === "stats" ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.admin} />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* Corte button */}
            <TouchableOpacity
              style={[styles.corteBtn, generando && { opacity: 0.6 }]}
              onPress={handleGenerarCorte}
              disabled={generando}
            >
              {generando ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <View style={styles.corteBtnInner}>
                  <Text style={styles.corteBtnIcon}>⚡</Text>
                  <View>
                    <Text style={styles.corteBtnTitle}>GENERAR CORTE DE HOY</Text>
                    <Text style={styles.corteBtnSub}>Calcula ingresos y métricas del día</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* KPI cards */}
            {hoy && (
              <>
                <Text style={styles.sectionLabel}>REPORTE · {hoy.fecha}</Text>
                <View style={[styles.kpiGrid, isTablet && styles.kpiGridTablet]}>
                  {kpiItems.map((k, i) => (
                    <View
                      key={i}
                      style={[
                        styles.kpiCard,
                        { borderColor: k.color + "35" },
                        isTablet && styles.kpiCardTablet,
                      ]}
                    >
                      <View style={[styles.kpiIconBubble, { backgroundColor: k.color + "18" }]}>
                        <Text style={styles.kpiIconText}>{k.icon}</Text>
                      </View>
                      <Text
                        style={[styles.kpiValue, { color: k.color }]}
                        numberOfLines={2}
                      >
                        {k.value}
                      </Text>
                      <Text style={styles.kpiLabel}>{k.label}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Bar chart */}
            <Text style={styles.sectionLabel}>INGRESOS ÚLTIMOS 7 DÍAS</Text>
            <View style={styles.chartCard}>
              {ultimos7.length === 0 ? (
                <Text style={styles.emptyText}>Sin reportes generados aún</Text>
              ) : (
                <View style={styles.chartRow}>
                  {ultimos7.map((r, i) => {
                    const val = parseFloat(String(r.ingresos_totales));
                    const pct = Math.log(val + 1) / Math.log(maxIngreso + 1);
                    const barH = Math.max(14, pct * CHART_H);
                    const isToday = i === ultimos7.length - 1;

                    return (
                      <View key={i} style={styles.barCol}>
                        {/* value label above bar */}
                        <Text
                          style={[
                            styles.barValueLabel,
                            isToday && { color: colors.admin },
                          ]}
                          numberOfLines={1}
                        >
                          {formatShort(val)}
                        </Text>

                        {/* bar track */}
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: barH,
                                backgroundColor: isToday
                                  ? colors.admin
                                  : colors.admin + "4D",
                              },
                            ]}
                          />
                        </View>

                        {/* day label + today indicator */}
                        <Text
                          style={[
                            styles.barDayLabel,
                            isToday && { color: colors.textSecondary, ...typography.subheading },
                          ]}
                        >
                          {getDayLabel(r.fecha)}
                        </Text>
                        {isToday && (
                          <View style={[styles.maxDot, { backgroundColor: colors.admin }]} />
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* History */}
            <Text style={styles.sectionLabel}>HISTORIAL DE CORTES</Text>
            <View style={styles.historyCard}>
              {reportes.length === 0 ? (
                <Text style={styles.emptyText}>Presiona "GENERAR CORTE DE HOY" para comenzar</Text>
              ) : (
                reportes.map((r, i) => (
                  <View
                    key={r.id}
                    style={[styles.historyRow, i < reportes.length - 1 && styles.historyDivider]}
                  >
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyFecha}>{r.fecha}</Text>
                      <View style={styles.historyBadges}>
                        <View style={styles.chip}>
                          <Text style={styles.chipText}>🧾 {r.pedidos_completados} pedidos</Text>
                        </View>
                        <View style={styles.chip}>
                          <Text style={styles.chipText}>⭐ {r.producto_estrella}</Text>
                        </View>
                        <View style={styles.chip}>
                          <Text style={styles.chipText}>🏆 {r.mesero_destacado}</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.historyIngreso}>
                      {formatMoney(parseFloat(String(r.ingresos_totales)))}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={{ height: 48 }} />
          </ScrollView>
        ) : (
          /* ── INFO TAB ── */
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionLabel}>ROLES DEL SISTEMA</Text>
            <View style={[styles.rolesGrid, isTablet && styles.rolesGridTablet]}>
              {[
                {
                  rol: "Mesero",
                  desc: "Crea y gestiona comandas desde las mesas del bar",
                  color: colors.mesero,
                  icon: "🧑‍🍳",
                },
                {
                  rol: "Bartender",
                  desc: "Cola FIFO — prepara y despacha los pedidos",
                  color: colors.bartender,
                  icon: "🍸",
                },
                {
                  rol: "Administrador",
                  desc: "Control total del sistema, reportes y usuarios",
                  color: colors.admin,
                  icon: "👔",
                },
              ].map((r, i) => (
                <View
                  key={i}
                  style={[styles.roleCard, { borderColor: r.color + "30" }, isTablet && styles.roleCardTablet]}
                >
                  <View style={[styles.roleIconWrap, { backgroundColor: r.color + "18" }]}>
                    <Text style={styles.roleIconText}>{r.icon}</Text>
                  </View>
                  <Text style={[styles.roleName, { color: r.color }]}>{r.rol}</Text>
                  <Text style={styles.roleDesc}>{r.desc}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionLabel}>USUARIO ACTUAL</Text>
            <View style={[styles.userCard, isTablet && styles.userCardTablet]}>
              {[
                { label: "Nombre", value: user?.nombre ?? "—" },
                { label: "Email", value: user?.email ?? "—" },
                { label: "Username", value: user?.username ?? "—" },
                { label: "Rol", value: user?.rol ?? "—" },
              ].map((f, i) => (
                <View key={i} style={[styles.userField, isTablet && styles.userFieldTablet]}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <Text style={styles.fieldValue}>{f.value}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionLabel}>GESTIÓN DE USUARIOS</Text>
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                Los usuarios se crean y gestionan desde Django Admin en{" "}
                <Text style={{ color: colors.admin, ...typography.subheading }}>/admin/</Text>
              </Text>
            </View>

            <View style={{ height: 48 }} />
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, width: "100%", alignSelf: "center" },
  containerDesktop: { maxWidth: 1700 },

  loadingWrap: {
    flex: 1, backgroundColor: colors.bg,
    alignItems: "center", justifyContent: "center",
  },
  loadingText: { color: colors.textMuted, marginTop: spacing.md, ...typography.caption },

  // TOP BAR
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
  topBarRole: { color: colors.admin, fontSize: 12, ...typography.caption, letterSpacing: 2 },
  topBarUser: { color: colors.textPrimary, fontSize: 16, ...typography.heading, marginTop: 2 },
  logoutBtn: {
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
  },
  logoutText: { color: colors.textMuted, fontSize: 10, ...typography.caption, letterSpacing: 1 },

  // TABS
  tabsBar: {
    flexDirection: "row",
    padding: spacing.xs,
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  tabsBarWide: { maxWidth: 480, alignSelf: "center", width: "100%", marginHorizontal: "auto" as any },
  tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: "center" },
  tabActive: { backgroundColor: colors.admin },
  tabText: { color: colors.textMuted, fontSize: 12, ...typography.caption, letterSpacing: 1 },
  tabTextActive: { color: colors.white, fontWeight: "800" },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg },

  sectionLabel: {
    color: colors.textMuted,
    fontSize: 10,
    ...typography.caption,
    letterSpacing: 3,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  // CORTE BUTTON
  corteBtn: {
    backgroundColor: colors.admin,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
    minHeight: 64,
  },
  corteBtnInner: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  corteBtnIcon: { fontSize: 26 },
  corteBtnTitle: { color: colors.white, fontSize: 14, ...typography.heading, letterSpacing: 1 },
  corteBtnSub: { color: colors.white + "BB", fontSize: 11, ...typography.body, marginTop: 2 },

  // KPI GRID
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  kpiGridTablet: { flexWrap: "nowrap" },
  kpiCard: {
    flexBasis: "47.5%",
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  kpiCardTablet: { flexBasis: 0, flexGrow: 1 },
  kpiIconBubble: {
    width: 44, height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  kpiIconText: { fontSize: 22 },
  kpiValue: {
    fontSize: 24,
    ...typography.display,
    marginTop: 2,
    lineHeight: 30,
  },
  kpiLabel: {
    color: colors.textMuted,
    fontSize: 9,
    ...typography.caption,
    letterSpacing: 2,
    marginTop: 2,
  },

  // CHART
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  barValueLabel: {
    color: colors.textMuted,
    fontSize: 8,
    ...typography.caption,
    textAlign: "center",
  },
  barTrack: {
    width: "72%",
    height: CHART_H,
    justifyContent: "flex-end",
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
  },
  barDayLabel: {
    color: colors.textMuted,
    fontSize: 9,
    ...typography.caption,
  },
  maxDot: {
    width: 5, height: 5, borderRadius: 3,
  },

  // HISTORY
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  historyDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyLeft: { flex: 1 },
  historyFecha: { color: colors.textPrimary, fontSize: 14, ...typography.subheading },
  historyBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.textSecondary, fontSize: 10, ...typography.caption },
  historyIngreso: {
    color: colors.admin,
    fontSize: 18,
    ...typography.heading,
    flexShrink: 0,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    ...typography.body,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },

  // ROLES
  rolesGrid: { gap: spacing.sm },
  rolesGridTablet: { flexDirection: "row" },
  roleCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  roleCardTablet: { flex: 1 },
  roleIconWrap: {
    width: 48, height: 48, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.xs,
  },
  roleIconText: { fontSize: 24 },
  roleName: { fontSize: 15, ...typography.subheading, letterSpacing: 1 },
  roleDesc: { color: colors.textMuted, fontSize: 12, ...typography.body, marginTop: 2, lineHeight: 18 },

  // USER CARD
  userCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  userCardTablet: { flexDirection: "row", flexWrap: "wrap" },
  userField: { paddingVertical: spacing.xs },
  userFieldTablet: { minWidth: 200, flexGrow: 1 },
  fieldLabel: { color: colors.textMuted, fontSize: 10, ...typography.caption, letterSpacing: 2 },
  fieldValue: { color: colors.textPrimary, fontSize: 15, ...typography.subheading, marginTop: 4 },

  // INFO
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 13,
    ...typography.body,
    lineHeight: 20,
  },
});
