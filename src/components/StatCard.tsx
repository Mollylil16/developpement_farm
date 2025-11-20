/**
 * Composant carte de statistique moderne avec animations
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

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
  valueColor,
  gradient = false,
}: StatCardProps) {
  const { colors } = useTheme();
  const finalValueColor = valueColor || colors.primary;
  
  // Sécuriser la valeur pour éviter l'erreur "Text strings must be rendered within a <Text> component"
  const safeValue = value !== undefined && value !== null ? value : 0;
  
  return (
    <View style={[
      styles.container,
      {
        backgroundColor: colors.surface,
        borderColor: gradient ? colors.primaryLight : colors.borderLight,
        ...colors.shadow.medium,
      },
      style
    ]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[styles.value, { color: finalValueColor }]}>
        {safeValue}
        {unit && <Text style={styles.unit}> {unit}</Text>}
      </Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: SPACING.xs,
    borderWidth: 1,
    minWidth: 90,
  },
  iconContainer: {
    marginBottom: SPACING.xs,
  },
  value: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs / 2,
  },
  unit: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.regular,
  },
  label: {
    fontSize: FONT_SIZES.xs,
    textAlign: 'center',
    fontWeight: FONT_WEIGHTS.medium,
  },
});

