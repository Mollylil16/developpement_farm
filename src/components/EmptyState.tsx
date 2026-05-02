/**
 * Composant état vide moderne
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SPACING, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { SafeTextWrapper } from '../utils/textRenderingGuard';

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ReactNode | string;
  action?: React.ReactNode;
  compact?: boolean;
}

export default function EmptyState({ title, message, icon, action, compact }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <SafeTextWrapper componentName="EmptyState">
      <View style={[styles.container, compact && styles.containerCompact]}>
        {icon && (
          <View style={[styles.iconContainer, compact && styles.iconContainerCompact]}>
            {typeof icon === 'string' ? (
              <Text style={[styles.iconText, compact && styles.iconTextCompact, { color: colors.textSecondary }]}>{icon}</Text>
            ) : (
              icon
            )}
          </View>
        )}
        <Text style={[styles.title, compact && styles.titleCompact, { color: colors.text }]}>{title}</Text>
        {message && (
          <Text style={[styles.message, compact && styles.messageCompact, { color: colors.textSecondary }]}>{message}</Text>
        )}
        {action && <View style={[styles.actionContainer, compact && styles.actionContainerCompact]}>{action}</View>}
      </View>
    </SafeTextWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  iconContainer: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  actionContainer: {
    marginTop: SPACING.md,
  },
  actionContainerCompact: {
    marginTop: SPACING.sm,
  },
  iconText: {
    fontSize: FONT_SIZES.xxxl,
    textAlign: 'center',
  },
  iconTextCompact: {
    fontSize: FONT_SIZES.xl,
  },
  containerCompact: {
    padding: SPACING.sm,
  },
  iconContainerCompact: {
    marginBottom: SPACING.xs,
  },
  titleCompact: {
    fontSize: FONT_SIZES.lg,
    marginBottom: SPACING.xs,
  },
  messageCompact: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
  },
});
