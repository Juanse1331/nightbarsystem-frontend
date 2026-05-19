import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  useWindowDimensions,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import {
  colors,
  spacing,
  radius,
  typography,
  globalStyles,
} from '../theme';

import { Pedido, EstadoPedido } from '../types';
import { ScreenProps } from '../navigation/AppNavigator';

type Props = ScreenProps<'BartenderHome'>;

interface KanbanColumn {
  key: EstadoPedido;
  label: string;
  color: string;
  nextStatus: EstadoPedido | null;
  nextLabel: string;
}

const COLUMNS: KanbanColumn[] = [
  {
    key: 'pending',
    label: 'PENDIENTES',
    color: colors.pending,
    nextStatus: 'preparing',
    nextLabel: '+ COMENZAR',
  },
  {
    key: 'preparing',
    label: 'PREPARANDO',
    color: colors.preparing,
    nextStatus: 'delivered',
    nextLabel: '✓ MARCAR LISTO',
  },
  {
    key: 'delivered',
    label: 'LISTOS',
    color: colors.delivered,
    nextStatus: null,
    nextLabel: '+ ENTREGAR',
  },
];

const POLL_MS = 8000;

export default function BartenderHome({ navigation }: Props) {
  const { user, signOut } = useAuth();

  const { width } = useWindowDimensions();

  const isDesktop = width >= 1000;
  const isTablet = width >= 768;

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [clock, setClock] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tick = () => {
      setClock(new Date().toTimeString().slice(0, 8));
    };

    tick();

    const id = setInterval(tick, 1000);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    loadData();

    pollRef.current = setInterval(loadData, POLL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const loadData = async () => {
    try {
      const peds = await api.getPedidos();

      setPedidos(peds);

      console.log('PEDIDOS:\n', JSON.stringify(peds, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    await loadData();

    setRefreshing(false);
  }, []);

  const handleAdvance = async (
    pedido: Pedido,
    nextStatus: EstadoPedido,
  ) => {
    setUpdatingId(pedido.id);

    try {
      await api.cambiarEstadoPedido(pedido.id, nextStatus);

      await loadData();
    } catch (e: any) {
      const msg =
        e?.data?.error ?? 'No se pudo actualizar el estado';

      Alert.alert('Error', msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const getAgeMinutes = (creado_en?: string): number => {
    if (!creado_en) return 0;

    return Math.floor(
      (Date.now() - new Date(creado_en).getTime()) / 60000,
    );
  };

  const pedidoTotal = (pedido: Pedido): number =>
    pedido.detalles.reduce((sum, d) => {
      const precio = d.precio_unitario
        ? parseFloat(d.precio_unitario)
        : 0;

      return sum + precio * d.cantidad;
    }, 0);

  const colPedidos = (status: EstadoPedido) =>
    pedidos.filter((p) => p.estado === status);

  const stats = {
    total: pedidos.length,
    pending: colPedidos('pending').length,
    preparing: colPedidos('preparing').length,
    delivered: colPedidos('delivered').length,
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          color={colors.bartender}
          size="large"
        />

        <Text style={styles.loadingText}>
          Cargando cola...
        </Text>
      </View>
    );
  }

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
            <Text style={styles.topBarIcon}>🍸</Text>

            <View style={{ marginLeft: spacing.sm }}>
              <Text style={styles.topBarRole}>
                BARTENDER PANEL
              </Text>

              <Text style={styles.topBarUser}>
                {(
                  user?.nombre ??
                  user?.username ??
                  ''
                ).toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.clock}>{clock}</Text>

            <TouchableOpacity
              onPress={async () => {
                await signOut();

                navigation.replace('RoleSelector');
              }}
              style={styles.logoutBtn}
            >
              <Text style={styles.logoutText}>
                SALIR
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* STATS */}
        <View
          style={[
            styles.statsRow,
            isDesktop && styles.statsRowDesktop,
          ]}
        >
          {[
            {
              label: 'TOTAL',
              value: stats.total,
              color: colors.bartender,
            },
            {
              label: 'PENDIENTES',
              value: stats.pending,
              color: colors.pending,
            },
            {
              label: 'PREPARANDO',
              value: stats.preparing,
              color: colors.preparing,
            },
            {
              label: 'LISTOS',
              value: stats.delivered,
              color: colors.delivered,
            },
          ].map((s, i) => (
            <View
              key={i}
              style={[
                styles.statCard,
                {
                  borderColor: s.color + '40',
                },
              ]}
            >
              <Text
                style={[
                  styles.statValue,
                  { color: s.color },
                ]}
              >
                {s.value}
              </Text>

              <Text style={styles.statLabel}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {/* KANBAN */}
        <ScrollView
          style={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.bartender}
            />
          }
          horizontal={isDesktop}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.kanbanContent,
            isDesktop && styles.kanbanDesktop,
          ]}
        >
          {COLUMNS.map((col) => {
            const colItems = colPedidos(col.key);

            return (
              <View
                key={col.key}
                style={[
                  styles.column,
                  isDesktop && styles.columnDesktop,
                ]}
              >
                {/* HEADER */}
                <View style={styles.columnHeader}>
                  <View
                    style={[
                      styles.columnDot,
                      {
                        backgroundColor: col.color,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.columnTitle,
                      {
                        color: col.color,
                      },
                    ]}
                  >
                    {col.label}
                  </Text>

                  <View
                    style={[
                      styles.columnCount,
                      {
                        backgroundColor:
                          col.color + '25',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.columnCountText,
                        { color: col.color },
                      ]}
                    >
                      {colItems.length}
                    </Text>
                  </View>
                </View>

                {/* EMPTY */}
                {colItems.length === 0 ? (
                  <View style={styles.emptyCol}>
                    <Text style={styles.emptyText}>
                      Sin pedidos
                    </Text>
                  </View>
                ) : (
                  colItems.map((pedido) => {
                    const age = getAgeMinutes(
                      pedido.creado_en,
                    );

                    const urgent =
                      col.key === 'pending' &&
                      age >= 5;

                    const busy =
                      updatingId === pedido.id;

                    return (
                      <View
                        key={pedido.id}
                        style={[
                          styles.orderCard,
                          urgent &&
                            styles.orderCardUrgent,
                          isDesktop &&
                            styles.orderCardDesktop,
                        ]}
                      >
                        {/* TOP */}
                        <View
                          style={
                            globalStyles.spaceBetween
                          }
                        >
                          <Text
                            style={styles.orderTable}
                          >
                            MESA{' '}
                            {pedido.numero_mesa ??
                              pedido.mesa}
                          </Text>

                          <View
                            style={styles.badgesRow}
                          >
                            {urgent && (
                              <View
                                style={
                                  styles.urgentBadge
                                }
                              >
                                <Text
                                  style={
                                    styles.urgentText
                                  }
                                >
                                  ⚠ {age}m
                                </Text>
                              </View>
                            )}

                            {!urgent &&
                              age > 0 &&
                              col.key ===
                                'pending' && (
                                <Text
                                  style={
                                    styles.ageText
                                  }
                                >
                                  {age}m
                                </Text>
                              )}

                            {col.key ===
                              'pending' && (
                              <View
                                style={
                                  styles.newBadge
                                }
                              >
                                <Text
                                  style={
                                    styles.newBadgeText
                                  }
                                >
                                  NUEVO
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* MESERO */}
                        {pedido.nombre_mesero && (
                          <Text
                            style={styles.meseroLabel}
                          >
                            Mesero:{' '}
                            {pedido.nombre_mesero}
                          </Text>
                        )}

                        {/* ITEMS */}
                        {pedido.detalles.map(
                          (d, i) => (
                            <Text
                              key={i}
                              style={
                                styles.orderItem
                              }
                            >
                              {d.cantidad}×{' '}
                              {d.nombre_producto ??
                                `Producto ${d.producto}`}
                            </Text>
                          ),
                        )}

                        {/* FOOTER */}
                        <View
                          style={[
                            globalStyles.spaceBetween,
                            {
                              marginTop:
                                spacing.sm,
                            },
                          ]}
                        >
                          <Text
                            style={styles.orderTotal}
                          >
                            $
                            {pedidoTotal(
                              pedido,
                            ).toLocaleString(
                              'es-CO',
                            )}
                          </Text>

                          {col.nextStatus ? (
                            <TouchableOpacity
                              style={[
                                styles.actionBtn,
                                {
                                  backgroundColor:
                                    col.color,
                                },
                              ]}
                              onPress={() =>
                                handleAdvance(
                                  pedido,
                                  col.nextStatus!,
                                )
                              }
                              disabled={busy}
                            >
                              {busy ? (
                                <ActivityIndicator
                                  color={
                                    colors.black
                                  }
                                  size="small"
                                />
                              ) : (
                                <Text
                                  style={
                                    styles.actionBtnText
                                  }
                                >
                                  {col.nextLabel}
                                </Text>
                              )}
                            </TouchableOpacity>
                          ) : (
                            <View
                              style={
                                styles.doneBadge
                              }
                            >
                              <Text
                                style={
                                  styles.doneBadgeText
                                }
                              >
                                ¡LISTO!
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            );
          })}

          <View style={{ height: 40, width: 20 }} />
        </ScrollView>
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
    width: '100%',
    alignSelf: 'center',
  },

  containerDesktop: {
    maxWidth: 1700,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: colors.textMuted,
    marginTop: spacing.md,
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

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
    color: colors.bartender,
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

  clock: {
    color: colors.textPrimary,
    fontSize: 20,
    ...typography.mono,
    marginBottom: spacing.xs,
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

  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,

    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  statsRowDesktop: {
    maxWidth: 900,
  },

  statCard: {
    flex: 1,

    backgroundColor: colors.card,

    borderRadius: radius.md,

    padding: spacing.sm,

    alignItems: 'center',

    borderWidth: 1,
  },

  statValue: {
    fontSize: 22,
    ...typography.display,
  },

  statLabel: {
    color: colors.textMuted,
    fontSize: 9,
    ...typography.caption,
    letterSpacing: 1,
    marginTop: 2,
  },

  scroll: {
    flex: 1,
  },

  kanbanContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  kanbanDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },

  column: {
    marginBottom: spacing.lg,
  },

  columnDesktop: {
    width: 420,
    minHeight: '100%',
  },

  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',

    gap: spacing.sm,

    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,

    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  columnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  columnTitle: {
    fontSize: 12,
    ...typography.caption,
    letterSpacing: 3,
    flex: 1,
  },

  columnCount: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },

  columnCountText: {
    fontSize: 11,
    ...typography.subheading,
  },

  emptyCol: {
    backgroundColor: colors.surface,

    borderRadius: radius.md,

    padding: spacing.md,

    alignItems: 'center',

    borderWidth: 1,
    borderColor: colors.border,
  },

  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    ...typography.body,
  },

  orderCard: {
    backgroundColor: colors.card,

    borderRadius: radius.lg,

    padding: spacing.md,

    marginBottom: spacing.sm,

    borderWidth: 1,
    borderColor: colors.border,
  },

  orderCardDesktop: {
    padding: spacing.sm,
  },

  orderCardUrgent: {
    borderColor: colors.danger + '80',
    backgroundColor: colors.danger + '08',
  },

  orderTable: {
    color: colors.textPrimary,
    fontSize: 16,
    ...typography.heading,
  },

  meseroLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    ...typography.caption,
  },

  badgesRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },

  urgentBadge: {
    backgroundColor: colors.danger + '20',

    borderRadius: radius.full,

    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },

  urgentText: {
    color: colors.danger,
    fontSize: 10,
    ...typography.caption,
  },

  ageText: {
    color: colors.textMuted,
    fontSize: 11,
    ...typography.caption,
  },

  newBadge: {
    backgroundColor: colors.pending + '25',

    borderRadius: radius.full,

    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },

  newBadgeText: {
    color: colors.pending,
    fontSize: 9,
    ...typography.caption,
    letterSpacing: 1,
  },

  orderItem: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },

  orderTotal: {
    color: colors.bartender,
    fontSize: 16,
    ...typography.heading,
  },

  actionBtn: {
    borderRadius: radius.md,

    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,

    minWidth: 120,

    alignItems: 'center',
  },

  actionBtnText: {
    color: colors.black,
    fontSize: 11,
    ...typography.heading,
    letterSpacing: 0.5,
  },

  doneBadge: {
    backgroundColor: colors.delivered + '20',

    borderRadius: radius.full,

    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },

  doneBadgeText: {
    color: colors.delivered,
    fontSize: 11,
    ...typography.caption,
    letterSpacing: 1,
  },
});