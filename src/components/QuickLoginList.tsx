import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { colors, spacing, radius, typography } from '../theme';

export interface QuickUser {
  name: string;
  email: string;
  password?: string;
  color: string;
}

interface Props {
  users: QuickUser[];
  loadingEmail: string | null;
  onSelect: (user: QuickUser) => void;
}

export default function QuickLoginList({ users, loadingEmail, onSelect }: Props) {
  return (
    <View style={styles.list}>
      {users.map((item) => (
        <TouchableOpacity
          key={item.email}
          style={[styles.userBtn, { borderColor: item.color + '60' }]}
          onPress={() => onSelect(item)}
          disabled={loadingEmail !== null}
          activeOpacity={0.8}
        >
          <View style={[styles.colorBar, { backgroundColor: item.color }]} />
          <View style={[styles.avatar, { backgroundColor: item.color + '25' }]}>
            <Text style={[styles.avatarLetter, { color: item.color }]}>
              {item.name[0]}
            </Text>
          </View>
          <Text style={styles.userName}>{item.name.toUpperCase()}</Text>
          {loadingEmail === item.email ? (
            <ActivityIndicator color={item.color} size="small" />
          ) : (
            <View style={[styles.dot, { backgroundColor: item.color }]} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  userBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, overflow: 'hidden',
    paddingRight: spacing.md, paddingVertical: spacing.sm,
  },
  colorBar: { width: 4, alignSelf: 'stretch', marginRight: spacing.md },
  avatar: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  avatarLetter: { fontSize: 22, ...typography.heading },
  userName: {
    flex: 1, color: colors.textPrimary,
    fontSize: 18, ...typography.subheading, letterSpacing: 2,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
