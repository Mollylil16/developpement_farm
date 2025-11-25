/**
 * Composant Card moderne avec animations et effets visuels
 * Support du néomorphisme pour les widgets du dashboard
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, Text } from 'react-native';
import { SPACING, TRANSITIONS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { getNeomorphismRaised, neomorphismToStyle } from '../utils/neomorphism';
import { SafeTextWrapper } from '../utils/textRenderingGuard';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevation?: 'small' | 'medium' | 'large';
  padding?: 'none' | 'small' | 'medium' | 'large';
  neomorphism?: boolean; // Active l'effet néomorphique
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

  // Si néomorphisme activé, utiliser le style néomorphique
  const neomorphismStyle = neomorphism
    ? neomorphismToStyle(getNeomorphismRaised(colors.surface, isDark))
    : {};

  const cardStyle = [
    styles.card,
    neomorphism
      ? {
          ...neomorphismStyle,
        }
      : {
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
        <SafeTextWrapper componentName="Card" silent={true}>
          {children}
        </SafeTextWrapper>
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle}>
      <SafeTextWrapper componentName="Card" silent={true}>
        {children}
      </SafeTextWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16, // BORDER_RADIUS.lg - valeur directe pour éviter les problèmes de chargement
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
