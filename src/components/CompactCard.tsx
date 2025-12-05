/**
 * CompactCard - Composant carte compacte standardisé
 * Style uniforme pour toute l'application
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';

interface CompactCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
}

export function CompactCard({ children, style, noPadding = false }: CompactCardProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        noPadding && styles.noPadding,
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface CompactCardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  style?: ViewStyle;
  titleStyle?: TextStyle;
}

export function CompactCardHeader({
  title,
  subtitle,
  icon,
  action,
  style,
  titleStyle,
}: CompactCardHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.cardHeader, style]}>
      <View style={styles.cardHeaderLeft}>
        {icon && <View style={styles.cardIcon}>{icon}</View>}
        <View style={styles.cardHeaderText}>
          <Text style={[styles.cardTitle, { color: colors.text }, titleStyle]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {action && <View style={styles.cardHeaderAction}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  noPadding: {
    padding: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: FONT_SIZES.xs,
  },
  cardHeaderAction: {
    marginLeft: SPACING.sm,
  },
});
