/**
 * Composant Card moderne avec animations et effets visuels
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, TRANSITIONS } from '../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevation?: 'small' | 'medium' | 'large';
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export default function Card({
  children,
  style,
  onPress,
  elevation = 'medium',
  padding = 'medium',
}: CardProps) {
  // Mapping explicite pour éviter les erreurs TypeScript
  const elevationMap: Record<'small' | 'medium' | 'large', keyof typeof styles> = {
    small: 'elevationSmall',
    medium: 'elevationMedium',
    large: 'elevationLarge',
  };

  const paddingMap: Record<'none' | 'small' | 'medium' | 'large', keyof typeof styles> = {
    none: 'paddingNone',
    small: 'paddingSmall',
    medium: 'paddingMedium',
    large: 'paddingLarge',
  };

  const cardStyle = [
    styles.card,
    styles[elevationMap[elevation]],
    styles[paddingMap[padding]],
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={TRANSITIONS.opacity.pressed}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  elevationSmall: {
    ...COLORS.shadow.small,
  },
  elevationMedium: {
    ...COLORS.shadow.medium,
  },
  elevationLarge: {
    ...COLORS.shadow.large,
  },
  paddingNone: {
    padding: 0,
  },
  paddingSmall: {
    padding: SPACING.sm,
  },
  paddingMedium: {
    padding: SPACING.md,
  },
  paddingLarge: {
    padding: SPACING.lg,
  },
});

