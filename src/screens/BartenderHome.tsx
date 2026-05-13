import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import { colors, spacing, radius, typography, globalStyles } from '../theme';
import { Pedido, EstadoPedido } from '../types';
import { ScreenProps } from '../navigation/AppNavigator';

type Props = ScreenProps<'BartenderHome'>;

// Columnas del Kanban — el backend filtra pending+preparing automáticamente
// para el bartender en get_queryset()
interface KanbanColumn {
  key: EstadoPedido;
  label: string;
  color: string;
  nextStatus: EstadoPedido | null;
  nextLabel: string;
}

const COLUMNS: KanbanColumn[] = [
  { key: 'pending',   label: 'PENDIENTES', color: colors.pending,   nextStatus: 'preparing', nextLabel: '+ COMENZAR'     },
  { key: 'preparing', label: 'PREPARANDO', color: colors.preparing, nextStatus: 'delivered', nextLabel: '✓ MARCAR LISTO' },
  { key: 'delivered', label: 'LISTOS',     color: colors.delivered, nextStatus: null,        nextLabel: '+ ENTREGAR'     },
];

const POLL_MS = 8_000;

export default function BartenderHome({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [pedidos,    setPedidos]    = useState<Pedido[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [clock, setClock] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const tick = () => setClock(new Date().toTimeString().slice(0, 8));
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    loadData();
    pollRef.current = setInterval(loadData, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const loadData = async () => {
    try {
      // get_queryset() del backend retorna pending+preparing para Bartender (FIFO)
      const peds = await api.getPedidos();
      setPedidos(peds);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleAdvance = async (pedido: Pedido, nextStatus: EstadoPedido) => {
    setUpdatingId(pedido.id);
    try {
      // PATCH /api/orders/{id}/cambiar_estado/  body: { estado: '...' }
      await api.cambiarEstadoPedido(pedido.id, nextStatus);
      await loadData();
    } catch (e: any) {
      const msg = e?.data?.error ?? 'No se pudo actualizar el estado';
      Alert.alert('Error', msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const getAgeMinutes = (creado_en?: string): number => {
    if (!creado_en) return 0;
    return Math.floor((Date.now() - new Date(creado_en).getTime()) / 60_000);
  };

  const pedidoTotal = (pedido: Pedido): number =>
    pedido.detalles.reduce((sum, d) => {
      const precio = d.precio_unitario ? parseFloat(d.precio_unitario) : 0;
      return sum + precio * d.cantidad;
    }, 0);

  const colPedidos = (status: EstadoPedido) => pedidos.filter(p => p.estado === status);

  const stats = {
    total:     pedidos.length,
    pending:   colPedidos('pending').length,
    preparing: colPedidos('preparing').length,
    delivered: colPedidos('delivered').length,
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.bartender} size="large" />
        <Text style={styles.loadingText}>Cargando cola...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={globalStyles.row}>
          <Text style={styles.topBarIcon}>🍸</Text>
          <View style={{ marginLeft: spacing.sm }}>
            <Text style={styles.topBarRole}>BARTENDER PANEL</Text>
            <Text style={styles.topBarUser}>{(user?.nombre ?? user?.username ?? '').toUpperCase()}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
          <Text style={styles.clock}>{clock}</Text>
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
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {([
          { label: 'TOTAL',      value: stats.total,     color: colors.bartender },
          { label: 'PENDIENTES', value: stats.pending,   color: colors.pending   },
          { label: 'PREPARANDO', value: stats.preparing, color: colors.preparing },
          { label: 'LISTOS',     value: stats.delivered, color: colors.delivered },
        ] as const).map((s, i) => (
          <View key={i} style={[styles.statCard, { borderColor: s.color + '40' }]}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Kanban */}
      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.bartender} />
        }
        showsVerticalScrollIndicator={false}
      >
        {COLUMNS.map(col => {
          const colItems = colPedidos(col.key);
          return (
            <View key={col.key} style={styles.column}>
              <View style={styles.columnHeader}>
                <View style={[styles.columnDot, { backgroundColor: col.color }]} />
                <Text style={[styles.columnTitle, { color: col.color }]}>{col.label}</Text>
                <View style={[styles.columnCount, { backgroundColor: col.color + '25' }]}>
                  <Text style={[styles.columnCountText, { color: col.color }]}>{colItems.length}</Text>
                </View>
              </View>

              {colItems.length === 0 ? (
                <View style={styles.emptyCol}>
                  <Text style={styles.emptyText}>Sin pedidos</Text>
                </View>
              ) : (
                colItems.map(pedido => {
                  const age    = getAgeMinutes(pedido.creado_en);
                  const urgent = col.key === 'pending' && age >= 5;
                  const busy   = updatingId === pedido.id;

                  return (
                    <View key={pedido.id} style={[styles.orderCard, urgent && styles.orderCardUrgent]}>
                      <View style={globalStyles.spaceBetween}>
                        <Text style={styles.orderTable}>MESA {pedido.numero_mesa ?? pedido.mesa}</Text>
                        <View style={styles.badgesRow}>
                          {urgent && (
                            <View style={styles.urgentBadge}>
                              <Text style={styles.urgentText}>⚠ {age}m</Text>
                            </View>
                          )}
                          {!urgent && age > 0 && col.key === 'pending' && (
                            <Text style={styles.ageText}>{age}m</Text>
                          )}
                          {col.key === 'pending' && (
                            <View style={styles.newBadge}>
                              <Text style={styles.newBadgeText}>NUEVO</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* nombre_mesero viene del serializer */}
                      {pedido.nombre_mesero && (
                        <Text style={styles.meseroLabel}>Mesero: {pedido.nombre_mesero}</Text>
                      )}

                      {pedido.detalles.map((d, i) => (
                        <Text key={i} style={styles.orderItem}>
                          {d.cantidad}× {d.nombre_producto ?? `Producto ${d.producto}`}
                        </Text>
                      ))}

                      <View style={[globalStyles.spaceBetween, { marginTop: spacing.sm }]}>
                        <Text style={styles.orderTotal}>${pedidoTotal(pedido).toFixed(2)}</Text>

                        {col.nextStatus ? (
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: col.color }]}
                            onPress={() => handleAdvance(pedido, col.nextStatus!)}
                            disabled={busy}
                          >
                            {busy
                              ? <ActivityIndicator color={colors.black} size="small" />
                              : <Text style={styles.actionBtnText}>{col.nextLabel}</Text>
                            }
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.doneBadge}>
                            <Text style={styles.doneBadgeText}>¡LISTO!</Text>
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
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1, paddingHorizontal: spacing.lg },
  loadingText: { color: colors.textMuted, marginTop: spacing.md },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingTop: 54, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  topBarIcon: { fontSize: 28 },
  topBarRole: { color: colors.bartender, fontSize: 12, ...typography.caption, letterSpacing: 2 },
  topBarUser: { color: colors.textPrimary, fontSize: 16, ...typography.heading, marginTop: 2 },
  clock: { color: colors.textPrimary, fontSize: 20, ...typography.mono },
  logoutBtn: {
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
  },
  logoutText: { color: colors.textMuted, fontSize: 10, ...typography.caption, letterSpacing: 1 },
  statsRow: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  statCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.md,
    padding: spacing.sm, alignItems: 'center', borderWidth: 1,
  },
  statValue: { fontSize: 22, ...typography.display },
  statLabel: { color: colors.textMuted, fontSize: 9, ...typography.caption, letterSpacing: 1, marginTop: 2 },
  column: { marginBottom: spacing.lg },
  columnHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginBottom: spacing.sm, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  columnDot: { width: 8, height: 8, borderRadius: 4 },
  columnTitle: { fontSize: 12, ...typography.caption, letterSpacing: 3, flex: 1 },
  columnCount: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  columnCountText: { fontSize: 11, ...typography.subheading },
  emptyCol: {
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  emptyText: { color: colors.textMuted, fontSize: 13, ...typography.body },
  orderCard: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  orderCardUrgent: { borderColor: colors.danger + '80', backgroundColor: colors.danger + '08' },
  orderTable: { color: colors.textPrimary, fontSize: 16, ...typography.heading },
  meseroLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2, ...typography.caption },
  badgesRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  urgentBadge: {
    backgroundColor: colors.danger + '20', borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  urgentText: { color: colors.danger, fontSize: 10, ...typography.caption },
  ageText: { color: colors.textMuted, fontSize: 11, ...typography.caption },
  newBadge: {
    backgroundColor: colors.pending + '25', borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  newBadgeText: { color: colors.pending, fontSize: 9, ...typography.caption, letterSpacing: 1 },
  orderItem: { color: colors.textSecondary, fontSize: 13, marginTop: 4 },
  orderTotal: { color: colors.bartender, fontSize: 16, ...typography.heading },
  actionBtn: {
    borderRadius: radius.md, paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs, minWidth: 120, alignItems: 'center',
  },
  actionBtnText: { color: colors.black, fontSize: 11, ...typography.heading, letterSpacing: 0.5 },
  doneBadge: {
    backgroundColor: colors.delivered + '20', borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  doneBadgeText: { color: colors.delivered, fontSize: 11, ...typography.caption, letterSpacing: 1 },
});
