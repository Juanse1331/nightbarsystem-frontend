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

import {
  colors,
  spacing,
  radius,
  typography,
  globalStyles,
} from "../theme";

import { ReporteDiario } from "../types";
import { ScreenProps } from "../navigation/AppNavigator";

type Props = ScreenProps<"AdminHome">;
type Tab = "stats" | "users";

const CHART_HEIGHT = 120;

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await api.getReportes();

      setReportes(data);

      console.log(
        "REPORTES:\n",
        JSON.stringify(data, null, 2),
      );
    } catch (e: any) {
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

      Alert.alert(
        "✅ Corte generado",
        res.mensaje,
      );

      await loadData();
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.data?.detail ??
          "No se pudo generar el corte",
      );
    } finally {
      setGenerando(false);
    }
  };

  const hoy = reportes[0] ?? null;

  const ultimos7 = [...reportes]
    .slice(0, 7)
    .reverse();

  const maxIngreso = Math.max(
    ...ultimos7.map((r) =>
      parseFloat(String(r.ingresos_totales)),
    ),
    1,
  );

  const formatMoney = (value: number) =>
    `$${value.toLocaleString("es-CO")}`;

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.bg}
      />

      <View
        style={[
          styles.container,
          isDesktop && styles.containerDesktop,
        ]}
      >
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <View style={globalStyles.row}>
            <Text style={styles.topBarIcon}>
              👔
            </Text>

            <View
              style={{ marginLeft: spacing.sm }}
            >
              <Text style={styles.topBarRole}>
                ADMIN PANEL
              </Text>

              <Text style={styles.topBarUser}>
                {(
                  user?.nombre ??
                  user?.email ??
                  ""
                ).toUpperCase()}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={async () => {
              await signOut();

              navigation.replace(
                "RoleSelector",
              );
            }}
            style={styles.logoutBtn}
          >
            <Text style={styles.logoutText}>
              SALIR
            </Text>
          </TouchableOpacity>
        </View>

        {/* TABS */}
        <View
          style={[
            styles.tabs,
            isDesktop && styles.tabsDesktop,
          ]}
        >
          {[
            {
              key: "stats",
              label: "📊 ESTADÍSTICAS",
            },
            {
              key: "users",
              label: "👥 INFO",
            },
          ].map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.tab,
                tab === t.key &&
                  styles.tabActive,
              ]}
              onPress={() =>
                setTab(t.key as Tab)
              }
            >
              <Text
                style={[
                  styles.tabText,
                  tab === t.key &&
                    styles.tabTextActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator
              color={colors.admin}
              size="large"
            />
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
            {/* BOTÓN */}
            <TouchableOpacity
              style={[
                styles.corteBtn,
                generando && {
                  opacity: 0.6,
                },
              ]}
              onPress={handleGenerarCorte}
              disabled={generando}
            >
              {generando ? (
                <ActivityIndicator
                  color={colors.black}
                  size="small"
                />
              ) : (
                <Text
                  style={styles.corteBtnText}
                >
                  ⚡ GENERAR CORTE DE HOY
                </Text>
              )}
            </TouchableOpacity>

            {/* KPI */}
            {hoy && (
              <>
                <Text
                  style={styles.sectionLabel}
                >
                  REPORTE: {hoy.fecha}
                </Text>

                <View
                  style={[
                    styles.kpiGrid,
                    isDesktop &&
                      styles.kpiGridDesktop,
                  ]}
                >
                  {[
                    {
                      label: "INGRESOS",
                      value: formatMoney(
                        parseFloat(
                          String(
                            hoy.ingresos_totales,
                          ),
                        ),
                      ),
                      color: colors.mesero,
                    },
                    {
                      label: "PEDIDOS",
                      value: String(
                        hoy.pedidos_completados,
                      ),
                      color: colors.admin,
                    },
                    {
                      label: "TOP PROD.",
                      value:
                        hoy.producto_estrella ??
                        "—",
                      color:
                        colors.bartender,
                    },
                    {
                      label: "TOP MESERO",
                      value:
                        hoy.mesero_destacado ??
                        "—",
                      color:
                        colors.delivered,
                    },
                  ].map((k, i) => (
                    <View
                      key={i}
                      style={[
                        styles.kpiCard,
                        {
                          borderColor:
                            k.color + "40",
                        },
                      ]}
                    >
                      <Text
                        style={
                          styles.kpiLabel
                        }
                      >
                        {k.label}
                      </Text>

                      <Text
                        style={[
                          styles.kpiValue,
                          {
                            color: k.color,
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {k.value}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* CHART */}
            <Text style={styles.sectionLabel}>
              INGRESOS ÚLTIMOS 7 DÍAS
            </Text>

            <View style={styles.chartCard}>
              {ultimos7.length === 0 ? (
                <Text style={styles.emptyText}>
                  Sin reportes generados aún
                </Text>
              ) : (
                <View style={styles.barsRow}>
                  {ultimos7.map((r, i) => {
                    const val =
                      parseFloat(
                        String(
                          r.ingresos_totales,
                        ),
                      );

                    const normalized =
                      Math.log(val + 1) /
                      Math.log(
                        maxIngreso + 1,
                      );

                    const barH =
                      Math.max(
                        10,
                        normalized *
                          CHART_HEIGHT,
                      );

                    const [
                      year,
                      month,
                      day,
                    ] = r.fecha
                      .split("-")
                      .map(Number);

                    const fecha =
                      new Date(
                        year,
                        month - 1,
                        day,
                      );

                    const label = fecha
                      .toLocaleDateString(
                        "es-CO",
                        {
                          weekday:
                            "short",
                        },
                      )
                      .slice(0, 3)
                      .toUpperCase();

                    return (
                      <View
                        key={i}
                        style={styles.barCol}
                      >
                        <Text
                          style={
                            styles.barValue
                          }
                        >
                          {formatMoney(val)}
                        </Text>

                        <View
                          style={
                            styles.barTrack
                          }
                        >
                          <View
                            style={[
                              styles.bar,
                              {
                                height: barH,
                              },
                            ]}
                          />
                        </View>

                        <Text
                          style={
                            styles.barLabel
                          }
                        >
                          {label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* HISTORIAL */}
            <Text style={styles.sectionLabel}>
              HISTORIAL DE CORTES
            </Text>

            <View style={styles.card}>
              {reportes.length === 0 ? (
                <Text style={styles.emptyText}>
                  Presiona "GENERAR CORTE
                  DE HOY"
                </Text>
              ) : (
                reportes.map((r, i) => (
                  <View
                    key={r.id}
                    style={[
                      styles.historyRow,
                      i <
                        reportes.length -
                          1 &&
                        styles.rowDivider,
                    ]}
                  >
                    <View>
                      <Text
                        style={
                          styles.reporteFecha
                        }
                      >
                        {r.fecha}
                      </Text>

                      <Text
                        style={
                          styles.reporteDetalle
                        }
                      >
                        {
                          r.pedidos_completados
                        }{" "}
                        pedidos · ⭐{" "}
                        {
                          r.producto_estrella
                        }
                      </Text>
                    </View>

                    <Text
                      style={
                        styles.reporteIngreso
                      }
                    >
                      {formatMoney(
                        parseFloat(
                          String(
                            r.ingresos_totales,
                          ),
                        ),
                      )}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={
              false
            }
          >
            <Text style={styles.sectionLabel}>
              ROLES DEL SISTEMA
            </Text>

            <View style={styles.card}>
              <Text style={styles.infoText}>
                Los usuarios se crean y
                gestionan desde Django
                Admin en{" "}
                <Text
                  style={{
                    color: colors.admin,
                  }}
                >
                  /admin/
                </Text>
              </Text>

              <View style={styles.divider} />

              <View
                style={[
                  styles.rolesGrid,
                  isDesktop &&
                    styles.rolesGridDesktop,
                ]}
              >
                {[
                  {
                    rol: "Mesero",
                    desc:
                      "Crea pedidos desde mesas",
                    color:
                      colors.mesero,
                    icon: "🧑‍🍳",
                  },
                  {
                    rol: "Bartender",
                    desc:
                      "Gestiona pedidos FIFO",
                    color:
                      colors.bartender,
                    icon: "🍸",
                  },
                  {
                    rol: "Administrador",
                    desc:
                      "Gestión total",
                    color: colors.admin,
                    icon: "👔",
                  },
                ].map((r, i) => (
                  <View
                    key={i}
                    style={[
                      styles.roleRow,
                      {
                        borderColor:
                          r.color + "30",
                      },
                    ]}
                  >
                    <Text
                      style={
                        styles.roleIcon
                      }
                    >
                      {r.icon}
                    </Text>

                    <View
                      style={{ flex: 1 }}
                    >
                      <Text
                        style={[
                          styles.roleName,
                          {
                            color:
                              r.color,
                          },
                        ]}
                      >
                        {r.rol}
                      </Text>

                      <Text
                        style={
                          styles.roleDesc
                        }
                      >
                        {r.desc}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <Text style={styles.sectionLabel}>
              USUARIO ACTUAL
            </Text>

            <View
              style={[
                styles.card,
                isDesktop &&
                  styles.userCardDesktop,
              ]}
            >
              {[
                {
                  label: "Nombre",
                  value:
                    user?.nombre ?? "—",
                },
                {
                  label: "Email",
                  value:
                    user?.email ?? "—",
                },
                {
                  label: "Username",
                  value:
                    user?.username ??
                    "—",
                },
                {
                  label: "Rol",
                  value:
                    user?.rol ?? "—",
                },
              ].map((f, i) => (
                <View
                  key={i}
                  style={
                    styles.userField
                  }
                >
                  <Text
                    style={
                      styles.fieldLabel
                    }
                  >
                    {f.label}
                  </Text>

                  <Text
                    style={
                      styles.fieldValue
                    }
                  >
                    {f.value}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  container: {
    flex: 1,
    width: "100%",
    alignSelf: "center",
  },

  containerDesktop: {
    maxWidth: 1700,
  },

  scroll: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

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

  topBarIcon: {
    fontSize: 28,
  },

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

  tabsDesktop: {
    maxWidth: 700,
    alignSelf: "center",
    width: "100%",
  },

  tab: {
    flex: 1,

    paddingVertical: spacing.sm,

    borderRadius: radius.md,

    alignItems: "center",
  },

  tabActive: {
    backgroundColor: colors.admin,
  },

  tabText: {
    color: colors.textMuted,
    fontSize: 12,
    ...typography.caption,
    letterSpacing: 1,
  },

  tabTextActive: {
    color: colors.white,
    fontWeight: "800",
  },

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

  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },

  kpiGridDesktop: {
    justifyContent: "space-between",
  },

  kpiCard: {
    flexGrow: 1,

    minWidth: 160,

    backgroundColor: colors.card,

    borderRadius: radius.lg,

    padding: spacing.md,

    borderWidth: 1,
  },

  kpiLabel: {
    color: colors.textMuted,
    fontSize: 10,
    ...typography.caption,
    letterSpacing: 2,
  },

  kpiValue: {
    fontSize: 24,
    ...typography.display,
    marginTop: 6,
  },

  chartCard: {
    backgroundColor: colors.card,

    borderRadius: radius.lg,

    padding: spacing.lg,

    borderWidth: 1,
    borderColor: colors.border,

    marginBottom: spacing.sm,
  },

  barsRow: {
    flexDirection: "row",

    alignItems: "flex-end",

    justifyContent: "space-around",

    height: 170,
  },

  barCol: {
    flex: 1,

    alignItems: "center",

    gap: 6,
  },

  barValue: {
    color: colors.textMuted,
    fontSize: 10,
    ...typography.caption,
  },

  barTrack: {
    width: "70%",

    height: CHART_HEIGHT,

    justifyContent: "flex-end",

    borderRadius: 12,

    backgroundColor: colors.surface,

    overflow: "hidden",
  },

  bar: {
    width: "100%",

    backgroundColor: colors.admin,

    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,

    minHeight: 10,
  },

  barLabel: {
    color: colors.textMuted,
    fontSize: 11,
    ...typography.caption,
  },

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

  historyRow: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    paddingVertical: spacing.md,
  },

  reporteFecha: {
    color: colors.textPrimary,
    fontSize: 14,
    ...typography.subheading,
  },

  reporteDetalle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  reporteIngreso: {
    color: colors.admin,
    fontSize: 22,
    ...typography.heading,
  },

  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

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

  rolesGrid: {
    gap: spacing.sm,
  },

  rolesGridDesktop: {
    flexDirection: "row",
  },

  roleRow: {
    flex: 1,

    flexDirection: "row",

    alignItems: "center",

    gap: spacing.md,

    paddingVertical: spacing.md,

    borderRadius: radius.md,

    borderWidth: 1,

    paddingHorizontal: spacing.md,
  },

  roleIcon: {
    fontSize: 24,
  },

  roleName: {
    fontSize: 14,
    ...typography.subheading,
    letterSpacing: 1,
  },

  roleDesc: {
    color: colors.textMuted,
    fontSize: 12,
    ...typography.body,
    marginTop: 2,
  },

  userCardDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
  },

  userField: {
    minWidth: 220,
    flexGrow: 1,
    paddingVertical: spacing.xs,
  },

  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    ...typography.caption,
    letterSpacing: 1,
  },

  fieldValue: {
    color: colors.textPrimary,
    fontSize: 14,
    marginTop: 4,
    ...typography.subheading,
  },
});