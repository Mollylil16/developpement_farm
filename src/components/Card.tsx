import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { SPACING, TRANSITIONS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { getNeomorphismRaised, neomorphismToStyle } from '../utils/neomorphism';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevation?: 'small' | 'medium' | 'large';
  padding?: 'none' | 'small' | 'medium' | 'large';
  neomorphism?: boolean;
}

export default function Card({
  children,
  style,
  onPress,
  elevation = 'medium',
  padding = 'medium',
  neomorphism = false,
}: CardProps) {
  const { colors, isDark } = useTheme();
  
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

  const neomorphismStyle = neomorphism
    ? neomorphismToStyle(getNeomorphismRaised(colors.surface, isDark))
    : {};

  const cardStyle = [
    styles.card,
    neomorphism
      ? {
          ...neomorphismStyle,
          borderColor: colors.border,
        }
      : {
          backgroundColor: colors.surface,
          borderColor: colors.border,
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
    borderRadius: 16,
    borderWidth: 1.5,
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

