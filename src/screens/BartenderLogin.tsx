import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Alert, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import QuickLoginList, { QuickUser } from '../components/QuickLoginList';
import { colors, spacing, radius, typography } from '../theme';
import { ScreenProps } from '../navigation/AppNavigator';

const QUICK_USERS: QuickUser[] = [
  { name: 'Pedro',  email: 'pedro@disco.com',  password: 'Tabajofuerte123*',  color: '#F59E0B' },
  { name: 'Doña paca',  email: 'paca@disco.com', password: 'Trabajofuerte321*',  color: '#8B5CF6' },
  { name: 'Juan',   email: 'juan@disco.com',   password: 'Trabajofuerte231*',   color: '#3B82F6' },
];

type Props = ScreenProps<'BartenderLogin'>;

export default function BartenderLogin({ navigation }: Props) {
  const { signIn } = useAuth();
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);

  const handleLogin = async (user: QuickUser) => {
    setLoadingEmail(user.email);
    try {
      const me = await signIn(user.email, user.password);
      // El rol en el token es 'Bartender' (con mayúscula)
      if (me.rol !== 'Bartender') {
        Alert.alert('Acceso denegado', 'Este usuario no tiene rol de Bartender');
        return;
      }
      navigation.replace('BartenderHome');
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
        <Text style={[styles.backText, { color: colors.bartender }]}>‹</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={[styles.iconWrap, {
          backgroundColor: colors.bartenderGlow,
          borderColor: colors.bartender + '40',
        }]}>
          <Text style={styles.icon}>🍸</Text>
        </View>
        <Text style={styles.title}>NIGHTBAR PRO</Text>
        <Text style={styles.subtitle}>Panel Bartender</Text>
        <View style={[styles.badge, {
          backgroundColor: colors.bartenderGlow,
          borderColor: colors.bartender + '40',
        }]}>
          <Text style={[styles.badgeText, { color: colors.bartender }]}>
            ACCESO RÁPIDO AL PANEL DE TRABAJO
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
  title: { fontSize: 28, color: colors.textPrimary, letterSpacing: 5, ...typography.display },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4, ...typography.caption, letterSpacing: 2 },
  badge: {
    marginTop: spacing.sm, borderRadius: radius.full, borderWidth: 1,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  badgeText: { fontSize: 10, ...typography.caption, letterSpacing: 2 },
  sectionLabel: {
    color: colors.textMuted, fontSize: 11, ...typography.caption,
    letterSpacing: 3, marginBottom: spacing.md,
  },
  hint: {
    textAlign: 'center', color: colors.textMuted,
    fontSize: 12, marginTop: spacing.xl, marginBottom: spacing.xl, ...typography.body,
  },
});
