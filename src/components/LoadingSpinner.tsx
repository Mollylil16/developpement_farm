/**
 * Composant spinner de chargement moderne
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { SPACING, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { SafeTextWrapper } from '../utils/textRenderingGuard';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
}

export default function LoadingSpinner({ message, size = 'large', color }: LoadingSpinnerProps) {
  const { colors } = useTheme();
  const spinnerColor = color || colors.primary;

  return (
    <SafeTextWrapper componentName="LoadingSpinner">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size={size} color={spinnerColor} />
        {message && <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>}
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
  message: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    fontWeight: FONT_WEIGHTS.medium,
  },
});
