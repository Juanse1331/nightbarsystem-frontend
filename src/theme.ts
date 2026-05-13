import { StyleSheet, TextStyle, ViewStyle } from 'react-native';

export const colors = {
  // Base
  bg: '#0A0A0F',
  surface: '#12121A',
  card: '#1A1A26',
  border: '#2A2A3E',

  // Mesero (amber/gold)
  mesero: '#F59E0B',
  meseroDark: '#B45309',
  meseroGlow: 'rgba(245,158,11,0.15)',

  // Bartender (purple/violet)
  bartender: '#8B5CF6',
  bartenderDark: '#6D28D9',
  bartenderGlow: 'rgba(139,92,246,0.15)',

  // Admin (pink/rose)
  admin: '#EC4899',
  adminDark: '#BE185D',
  adminGlow: 'rgba(236,72,153,0.15)',

  // Status
  pending: '#F59E0B',
  preparing: '#3B82F6',
  delivered: '#10B981',

  // Text
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#475569',

  // Misc
  danger: '#EF4444',
  success: '#10B981',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const typography = {
  display: { fontWeight: '900', letterSpacing: -1 } as TextStyle,
  heading: { fontWeight: '800', letterSpacing: -0.5 } as TextStyle,
  subheading: { fontWeight: '700' } as TextStyle,
  body: { fontWeight: '400' } as TextStyle,
  caption: { fontWeight: '500', letterSpacing: 1 } as TextStyle,
  mono: { fontFamily: 'Courier New', fontWeight: '600' } as TextStyle,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

interface RoleColors {
  accent: string;
  glow: string;
}

export const roleColors: Record<'mesero' | 'bartender' | 'admin', RoleColors> = {
  mesero: { accent: colors.mesero, glow: colors.meseroGlow },
  bartender: { accent: colors.bartender, glow: colors.bartenderGlow },
  admin: { accent: colors.admin, glow: colors.adminGlow },
};

export const globalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  } as ViewStyle,
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  } as ViewStyle,
  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
});
