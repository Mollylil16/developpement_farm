/**
 * Composant carte de statistique moderne avec animations
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';

interface StatCardProps {
  value: string | number;
  label: string;
  unit?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
  valueColor?: string;
  gradient?: boolean;
}

export default function StatCard({
  value,
  label,
  unit,
  icon,
  style,
  valueColor = COLORS.primary,
  gradient = false,
}: StatCardProps) {
  return (
    <View style={[styles.container, gradient && styles.gradient, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[styles.value, { color: valueColor }]}>
        {value}
        {unit && <Text style={styles.unit}> {unit}</Text>}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: SPACING.xs,
    ...COLORS.shadow.medium,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  gradient: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.primaryLight,
    borderWidth: 1,
  },
  iconContainer: {
    marginBottom: SPACING.sm,
  },
  value: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  unit: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.regular,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: FONT_WEIGHTS.medium,
  },
});

