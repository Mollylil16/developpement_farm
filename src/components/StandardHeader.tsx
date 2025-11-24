/**
 * StandardHeader - Composant header standardisé pour tous les écrans
 * Style cohérent avec Planning Production
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { normalizeIconName } from '../utils/iconValidation';

interface StandardHeaderProps {
  icon: keyof typeof Ionicons.glyphMap | string;
  title: string;
  subtitle?: string;
  badge?: number;
  badgeColor?: string;
}

export default function StandardHeader({
  icon,
  title,
  subtitle,
  badge,
  badgeColor,
}: StandardHeaderProps) {
  const { colors } = useTheme();
  const validIcon = normalizeIconName(icon as string, 'help-circle-outline');

  return (
    <View style={[styles.header, { backgroundColor: colors.surface }]}>
      <View style={styles.headerContent}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name={validIcon} size={28} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        </View>
        {typeof badge === 'number' && badge > 0 && (
          <View style={[styles.alertBadge, { backgroundColor: badgeColor || colors.error }]}>
            <Text style={styles.alertBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      {subtitle && (
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.xs,
    marginTop: 4,
  },
  alertBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  alertBadgeText: {
    color: '#fff',
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
  },
});
