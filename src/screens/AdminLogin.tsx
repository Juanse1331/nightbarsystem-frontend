import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, typography } from '../theme';
import { ScreenProps } from '../navigation/AppNavigator';

type Props = ScreenProps<'AdminLogin'>;

export default function AdminLogin({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed || !password) {
      Alert.alert('Campos requeridos', 'Ingresa email y contraseña');
      return;
    }
    setLoading(true);
    try {
      // El backend usa USERNAME_FIELD = 'email' → enviamos email directamente
      const me = await signIn(emailTrimmed, password);
      // El rol en el token es 'Administrador' (con mayúscula)
      if (me.rol !== 'Administrador') {
        Alert.alert('Acceso denegado', 'Este usuario no tiene rol de Administrador');
        return;
      }
      navigation.replace('AdminHome');
    } catch (e: any) {
      const msg = e?.data?.detail ?? 'Email o contraseña incorrectos';
      Alert.alert('Error de acceso', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.backText, { color: colors.admin }]}>‹</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={[styles.iconWrap, {
            backgroundColor: colors.adminGlow,
            borderColor: colors.admin + '50',
          }]}>
            <Text style={styles.icon}>👔</Text>
          </View>
          <Text style={[styles.title, { color: colors.admin }]}>ADMIN</Text>
          <Text style={styles.subtitle}>Panel de Administración</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>EMAIL</Text>
            <TextInput
              style={styles.input}
              placeholder="admin@disco.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>

          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>CONTRASEÑA</Text>
            <View style={styles.passRow}>
              <TextInput
                style={[styles.input, { flex: 1, borderWidth: 0, paddingRight: 0 }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
                <Text style={styles.eyeText}>{showPass ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.admin }, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.loginBtnText}>INGRESAR</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>Acceso solo para administradores autorizados</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: {
    paddingTop: 50, paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl, flexGrow: 1,
  },
  backBtn: { marginBottom: spacing.lg },
  backText: { fontSize: 32, fontWeight: '300' },
  header: { alignItems: 'center', marginBottom: spacing.xxl },
  iconWrap: {
    width: 88, height: 88, borderRadius: 26,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  icon: { fontSize: 40 },
  title: { fontSize: 36, letterSpacing: 8, ...typography.display },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4, ...typography.caption, letterSpacing: 2 },
  form: { gap: spacing.md },
  inputWrap: { gap: spacing.xs },
  inputLabel: { color: colors.textMuted, fontSize: 10, ...typography.caption, letterSpacing: 3 },
  input: {
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, color: colors.textPrimary, fontSize: 16, ...typography.body,
  },
  passRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingLeft: spacing.md, overflow: 'hidden',
  },
  eyeBtn: { padding: spacing.md },
  eyeText: { fontSize: 18 },
  loginBtn: { borderRadius: radius.lg, paddingVertical: spacing.md + 2, alignItems: 'center', marginTop: spacing.sm },
  loginBtnText: { color: colors.white, fontSize: 15, ...typography.heading, letterSpacing: 3 },
  hint: { textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: spacing.xl, ...typography.body },
});
