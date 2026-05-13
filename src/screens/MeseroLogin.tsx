import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Alert, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import QuickLoginList, { QuickUser } from '../components/QuickLoginList';
import { colors, spacing, radius, typography } from '../theme';
import { ScreenProps } from '../navigation/AppNavigator';

// ⚠️  El backend usa USERNAME_FIELD = 'email'
// Actualiza estos emails/contraseñas según los usuarios creados en el Django Admin
const QUICK_USERS: QuickUser[] = [
  { name: 'Carlos',  email: 'carlos@disco.com',  password: 'Afrocolombia12*',  color: '#F59E0B' },
  { name: 'Ana',     email: 'ana@disco.com',     password: 'Afrocolombia12*',     color: '#EC4899' },
  { name: 'Luis',    email: 'luis@disco.com',    password: 'Afrocolombia12*',    color: '#10B981' },
  { name: 'María',   email: 'maria@disco.com',   password: 'Afrocolombia12*',   color: '#3B82F6' },
];

type Props = ScreenProps<'MeseroLogin'>;

export default function MeseroLogin({ navigation }: Props) {
  const { signIn } = useAuth();
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);

  const handleLogin = async (user: QuickUser) => {
    setLoadingEmail(user.email);
    try {
      // El rol en el token es 'Mesero' (con mayúscula, según Rol.MESERO del modelo)
      const me = await signIn(user.email, user.password);
      if (me.rol !== 'Mesero') {
        Alert.alert('Acceso denegado', 'Este usuario no tiene rol de Mesero');
        return;
      }
      navigation.replace('MeseroHome');
    } catch (e: any) {
      const msg = e?.data?.detail ?? 'No se pudo iniciar sesión';
      Alert.alert('Error de acceso', msg);
    } finally {
      setLoadingEmail(null);
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
            1 TOQUE · ACCESO RÁPIDO
          </Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>SELECCIONA TU PERFIL</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        <QuickLoginList
          users={QUICK_USERS}
          loadingEmail={loadingEmail}
          onSelect={handleLogin}
        />
        <Text style={styles.hint}>
          ¿No apareces? Pide al administrador que cree tu usuario.
        </Text>
      </ScrollView>
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
});
