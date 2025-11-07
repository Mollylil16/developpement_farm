/**
 * Composant Card moderne avec animations et effets visuels
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { SPACING, BORDER_RADIUS, TRANSITIONS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

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
  const { colors } = useTheme();
  
  // Mapping explicite pour éviter les erreurs TypeScript
  const elevationMap: Record<'small' | 'medium' | 'large', any> = {
    small: colors.shadow.small,
    medium: colors.shadow.medium,
    large: colors.shadow.large,
  };

  const paddingMap: Record<'none' | 'small' | 'medium' | 'large', keyof typeof styles> = {
    none: 'paddingNone',
    small: 'paddingSmall',
    medium: 'paddingMedium',
    large: 'paddingLarge',
  };

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: colors.borderLight,
      ...elevationMap[elevation],
    },
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
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
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

