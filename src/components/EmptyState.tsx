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
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export default function EmptyState({ title, message, icon, action }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <SafeTextWrapper componentName="EmptyState">
      <View style={styles.container}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {message && <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>}
        {action && <View style={styles.actionContainer}>{action}</View>}
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
});
