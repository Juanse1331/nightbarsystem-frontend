import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Alert, ScrollView, Modal, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import QuickLoginList, { QuickUser } from '../components/QuickLoginList';
import { getUsuariosPorRol } from '../services/api';
import { colors, spacing, radius, typography } from '../theme';
import { ScreenProps } from '../navigation/AppNavigator';

const PALETTE = ['#F59E0B', '#EC4899', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444', '#06B6D4', '#F97316'];

type Props = ScreenProps<'MeseroLogin'>;

export default function MeseroLogin({ navigation }: Props) {
  const { signIn } = useAuth();
  const [meseros, setMeseros] = useState<QuickUser[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<QuickUser | null>(null);
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const loadMeseros = useCallback(() => {
    setFetching(true);
    setFetchError(null);
    getUsuariosPorRol('Mesero')
      .then(users => {
        setMeseros(users.map((u, i) => ({
          name: u.nombre ?? u.username,
          email: u.email,
          color: PALETTE[i % PALETTE.length] ?? '#F59E0B',
        })));
      })
      .catch(() => setFetchError('No se pudo cargar la lista de meseros'))
      .finally(() => setFetching(false));
  }, []);

  useEffect(() => { loadMeseros(); }, [loadMeseros]);

  const handleSelect = (user: QuickUser) => {
    setSelectedUser(user);
    setPassword('');
  };

  const handleLogin = async () => {
    if (!selectedUser || !password) return;
    setSigningIn(true);
    try {
      const me = await signIn(selectedUser.email, password);
      if (me.rol !== 'Mesero') {
        Alert.alert('Acceso denegado', 'Este usuario no tiene rol de Mesero');
        return;
      }
      setSelectedUser(null);
      navigation.replace('MeseroHome');
    } catch (e: any) {
      const msg = e?.data?.detail ?? 'Contraseña incorrecta';
      Alert.alert('Error de acceso', msg);
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={[styles.backText, { color: colors.mesero }]}>‹</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={[styles.iconWrap, {
          backgroundColor: colors.meseroGlow,
          borderColor: colors.mesero + '40',
        }]}>
          <Text style={styles.icon}>🧑‍🍳</Text>
        </View>
        <Text style={styles.title}>NIGHTBAR</Text>
        <Text style={styles.subtitle}>Acceso Meseros</Text>
        <View style={[styles.badge, {
          backgroundColor: colors.meseroGlow,
          borderColor: colors.mesero + '40',
        }]}>
          <Text style={[styles.badgeText, { color: colors.mesero }]}>
            SELECCIONA · INGRESA CONTRASEÑA
          </Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>SELECCIONA TU PERFIL</Text>

      {fetching ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.mesero} size="large" />
        </View>
      ) : fetchError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{fetchError}</Text>
          <TouchableOpacity onPress={loadMeseros}>
            <Text style={[styles.retryText, { color: colors.mesero }]}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <QuickLoginList
            users={meseros}
            loadingEmail={null}
            onSelect={handleSelect}
          />
          <Text style={styles.hint}>
            ¿No apareces? Pide al administrador que cree tu usuario.
          </Text>
        </ScrollView>
      )}

      <Modal
        visible={selectedUser !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedUser(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            {selectedUser && (
              <>
                <View style={[styles.modalAvatar, { backgroundColor: selectedUser.color + '25' }]}>
                  <Text style={[styles.modalAvatarLetter, { color: selectedUser.color }]}>
                    {selectedUser.name[0]}
                  </Text>
                </View>
                <Text style={styles.modalName}>{selectedUser.name.toUpperCase()}</Text>
                <Text style={styles.modalLabel}>CONTRASEÑA</Text>
                <TextInput
                  style={[styles.modalInput, { borderColor: selectedUser.color + '60' }]}
                  placeholder="Ingresa tu contraseña"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  autoFocus
                  onSubmitEditing={handleLogin}
                  returnKeyType="go"
                />
                <TouchableOpacity
                  style={[
                    styles.modalBtn,
                    { backgroundColor: selectedUser.color },
                    (!password || signingIn) && styles.modalBtnDisabled,
                  ]}
                  onPress={handleLogin}
                  disabled={signingIn || !password}
                  activeOpacity={0.8}
                >
                  {signingIn ? (
                    <ActivityIndicator color={colors.black} size="small" />
                  ) : (
                    <Text style={styles.modalBtnText}>ENTRAR</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelectedUser(null)}
                  style={styles.modalCancel}
                >
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.bg,
    paddingTop: 50, paddingHorizontal: spacing.lg,
  },
  backBtn: { marginBottom: spacing.lg },
  backText: { fontSize: 32, fontWeight: '300' },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  iconWrap: {
    width: 80, height: 80, borderRadius: 24,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  icon: { fontSize: 36 },
  title: { fontSize: 32, color: colors.textPrimary, letterSpacing: 6, ...typography.display },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4, ...typography.caption, letterSpacing: 2 },
  badge: {
    marginTop: spacing.sm, borderRadius: radius.full, borderWidth: 1,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  badgeText: { fontSize: 11, ...typography.caption, letterSpacing: 2 },
  sectionLabel: {
    color: colors.textMuted, fontSize: 11, ...typography.caption,
    letterSpacing: 3, marginBottom: spacing.md,
  },
  hint: {
    textAlign: 'center', color: colors.textMuted,
    fontSize: 12, marginTop: spacing.xl, marginBottom: spacing.xl, ...typography.body,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  errorText: { color: colors.danger, fontSize: 14, textAlign: 'center' },
  retryText: { fontSize: 14, ...typography.subheading },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.80)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: '100%', backgroundColor: colors.card,
    borderRadius: radius.xl, padding: spacing.xl,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  modalAvatar: {
    width: 64, height: 64, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  modalAvatarLetter: { fontSize: 28, ...typography.heading },
  modalName: {
    color: colors.textPrimary, fontSize: 20, ...typography.subheading,
    letterSpacing: 3, marginBottom: spacing.lg,
  },
  modalLabel: {
    color: colors.textMuted, fontSize: 10, ...typography.caption,
    letterSpacing: 3, alignSelf: 'flex-start', marginBottom: spacing.xs,
  },
  modalInput: {
    width: '100%', backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    color: colors.textPrimary, fontSize: 16, marginBottom: spacing.lg,
  },
  modalBtn: {
    width: '100%', paddingVertical: spacing.sm + 4,
    borderRadius: radius.md, alignItems: 'center', marginBottom: spacing.sm,
  },
  modalBtnDisabled: { opacity: 0.45 },
  modalBtnText: { color: colors.black, fontSize: 15, ...typography.subheading, letterSpacing: 2 },
  modalCancel: { paddingVertical: spacing.sm },
  modalCancelText: { color: colors.textMuted, fontSize: 14, ...typography.body },
});
