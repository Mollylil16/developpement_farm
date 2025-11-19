/**
 * Widget Secondaire - Widget compact pour modules secondaires
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface WidgetSecondaireProps {
  icon: string;
  title: string;
  value: string | number;
  subtitle?: string;
  onPress?: () => void;
}

export default function WidgetSecondaire({ 
  icon, 
  title, 
  value, 
  subtitle,
  onPress 
}: WidgetSecondaireProps) {
  const { colors } = useTheme();
  
  // Sécuriser la valeur pour éviter l'erreur "Text strings must be rendered within a <Text> component"
  const safeValue = value !== undefined && value !== null ? value : 0;
  const safeIcon = icon || '📊';
  const safeTitle = title || 'Widget';
  
  return (
    <TouchableOpacity 
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          ...colors.shadow.small,
        },
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>{safeIcon}</Text>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{safeTitle}</Text>
      <Text style={[styles.value, { color: colors.primary }]}>{safeValue}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: SPACING.xs,
    minHeight: 100,
    borderWidth: 1,
  },
  icon: {
    fontSize: FONT_SIZES.xxl,
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  value: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    textAlign: 'center',
  },
});

