/**
 * Composant Badge moderne et réutilisable
 * Pour afficher des étiquettes colorées avec différents variants
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Badge({
  children,
  variant = 'primary',
  size = 'medium',
  style,
  textStyle,
}: BadgeProps) {
  const { colors } = useTheme();

  const getBackgroundColor = (): string => {
    switch (variant) {
      case 'primary':
        return colors.primary + '15'; // 15% opacity
      case 'secondary':
        return colors.secondary + '15';
      case 'success':
        return colors.success + '15';
      case 'warning':
        return colors.warning + '15';
      case 'error':
        return colors.error + '15';
      case 'info':
        return colors.info + '15';
      case 'neutral':
        return colors.textSecondary + '15';
      default:
        return colors.primary + '15';
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.secondary;
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'error':
        return colors.error;
      case 'info':
        return colors.info;
      case 'neutral':
        return colors.textSecondary;
      default:
        return colors.primary;
    }
  };

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: SPACING.xs,
          paddingVertical: SPACING.xs / 2,
        };
      case 'medium':
        return {
          paddingHorizontal: SPACING.sm,
          paddingVertical: SPACING.xs,
        };
      case 'large':
        return {
          paddingHorizontal: SPACING.md,
          paddingVertical: SPACING.sm,
        };
      default:
        return {
          paddingHorizontal: SPACING.sm,
          paddingVertical: SPACING.xs,
        };
    }
  };

  const getTextSizeStyles = (): TextStyle => {
    switch (size) {
      case 'small':
        return { fontSize: FONT_SIZES.xs };
      case 'medium':
        return { fontSize: FONT_SIZES.sm };
      case 'large':
        return { fontSize: FONT_SIZES.md };
      default:
        return { fontSize: FONT_SIZES.sm };
    }
  };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: getBackgroundColor(),
        },
        getSizeStyles(),
        style,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: getTextColor(),
          },
          getTextSizeStyles(),
          textStyle,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: BORDER_RADIUS.full,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontWeight: FONT_WEIGHTS.semiBold,
    textAlign: 'center',
  },
});

