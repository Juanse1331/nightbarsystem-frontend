import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { colors, spacing, radius, typography } from '../theme';
import { ScreenProps } from '../navigation/AppNavigator';

const { height } = Dimensions.get('window');

interface RoleOption {
  key: 'mesero' | 'bartender' | 'admin';
  label: string;
  subtitle: string;
  icon: string;
  accent: string;
  glow: string;
  screen: keyof import('../types').RootStackParamList;
}

const ROLES: RoleOption[] = [
  {
    key: 'mesero',
    label: 'MESERO',
    subtitle: 'Crear y enviar pedidos',
    icon: '🧑‍🍳',
    accent: colors.mesero,
    glow: colors.meseroGlow,
    screen: 'MeseroLogin',
  },
  {
    key: 'bartender',
    label: 'BARTENDER',
    subtitle: 'Gestionar la barra',
    icon: '🍸',
    accent: colors.bartender,
    glow: colors.bartenderGlow,
    screen: 'BartenderLogin',
  },
  {
    key: 'admin',
    label: 'ADMIN',
    subtitle: 'Panel de control',
    icon: '👔',
    accent: colors.admin,
    glow: colors.adminGlow,
    screen: 'AdminLogin',
  },
];

type Props = ScreenProps<'RoleSelector'>;

export default function RoleSelector({ navigation }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const cardAnims = useRef(ROLES.map(() => new Animated.Value(60))).current;
  const cardFades = useRef(ROLES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    ROLES.forEach((_, i) => {
      Animated.parallel([
        Animated.timing(cardAnims[i], {
          toValue: 0, duration: 500, delay: 300 + i * 120, useNativeDriver: true,
        }),
        Animated.timing(cardFades[i], {
          toValue: 1, duration: 500, delay: 300 + i * 120, useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Background decorative circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />
      <View style={styles.decorCircle3} />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={styles.logo}>🍹</Text>
        <Text style={styles.appName}>NIGHTBAR</Text>
        <Text style={styles.appSubtitle}>Sistema de Gestión</Text>
        <View style={styles.divider} />
        <Text style={styles.prompt}>¿Cómo ingresas hoy?</Text>
      </Animated.View>

      {/* Role Cards */}
      <View style={styles.cardsContainer}>
        {ROLES.map((role, i) => (
          <Animated.View
            key={role.key}
            style={{ opacity: cardFades[i], transform: [{ translateY: cardAnims[i] }] }}
          >
            <TouchableOpacity
              style={[styles.roleCard, { borderColor: role.accent + '40' }]}
              onPress={() => navigation.navigate(role.screen)}
              activeOpacity={0.8}
            >
              <View style={[styles.cardGlow, { backgroundColor: role.glow }]} />

              <View style={styles.cardContent}>
                <View style={[
                  styles.iconBadge,
                  { backgroundColor: role.accent + '20', borderColor: role.accent + '50' },
                ]}>
                  <Text style={styles.icon}>{role.icon}</Text>
                </View>

                <View style={styles.cardText}>
                  <Text style={[styles.roleLabel, { color: role.accent }]}>
                    {role.label}
                  </Text>
                  <Text style={styles.roleSubtitle}>{role.subtitle}</Text>
                </View>

                <View style={[styles.arrow, { backgroundColor: role.accent }]}>
                  <Text style={styles.arrowText}>›</Text>
                </View>
              </View>

              <View style={[styles.cardLine, { backgroundColor: role.accent }]} />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      <Animated.Text style={[styles.footer, { opacity: fadeAnim }]}>
        NightBarSystem © 2026 · UIS
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.xl,
  },
  decorCircle1: {
    position: 'absolute', top: -80, right: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: colors.meseroGlow,
  },
  decorCircle2: {
    position: 'absolute', top: height * 0.35, left: -100,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: colors.bartenderGlow,
  },
  decorCircle3: {
    position: 'absolute', bottom: -60, right: -60,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: colors.adminGlow,
  },
  header: { alignItems: 'center', marginBottom: spacing.xxl },
  logo: { fontSize: 56, marginBottom: spacing.sm },
  appName: {
    fontSize: 38, color: colors.textPrimary,
    letterSpacing: 8, ...typography.display,
  },
  appSubtitle: {
    fontSize: 13, color: colors.textMuted,
    letterSpacing: 3, textTransform: 'uppercase',
    marginTop: 2, ...typography.caption,
  },
  divider: {
    width: 40, height: 2,
    backgroundColor: colors.border,
    marginVertical: spacing.md, borderRadius: 1,
  },
  prompt: { fontSize: 15, color: colors.textSecondary, ...typography.body },
  cardsContainer: { flex: 1, justifyContent: 'center', gap: spacing.md },
  roleCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  cardGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  cardContent: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.lg, gap: spacing.md,
  },
  iconBadge: {
    width: 56, height: 56, borderRadius: 16,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 26 },
  cardText: { flex: 1 },
  roleLabel: { fontSize: 20, ...typography.heading, letterSpacing: 1 },
  roleSubtitle: {
    fontSize: 13, color: colors.textSecondary,
    marginTop: 2, ...typography.body,
  },
  arrow: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  arrowText: {
    color: colors.black, fontSize: 22, fontWeight: '800', marginTop: -2,
  },
  cardLine: { height: 3, width: '100%' },
  footer: {
    textAlign: 'center', color: colors.textMuted,
    fontSize: 12, ...typography.caption, marginTop: spacing.lg,
  },
});
