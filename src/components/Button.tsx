/**
 * Composant bouton moderne avec animations fluides
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, TRANSITIONS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const { colors } = useTheme();
  
  const getButtonStyle = (): ViewStyle[] => {
    const baseStyle: ViewStyle[] = [styles.button, styles[size]];
    
    switch (variant) {
      case 'primary':
        baseStyle.push({ backgroundColor: colors.primary });
        break;
      case 'secondary':
        baseStyle.push({ backgroundColor: colors.secondary });
        break;
      case 'outline':
        baseStyle.push({
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.primary,
          ...colors.shadow.small,
        });
        break;
      case 'text':
        baseStyle.push({
          backgroundColor: 'transparent',
          shadowOpacity: 0,
          elevation: 0,
        });
        break;
    }
    
    if (disabled || loading) {
      baseStyle.push(styles.disabled);
    }
    
    if (fullWidth) {
      baseStyle.push(styles.fullWidth);
    }
    
    return baseStyle;
  };

  const getTextStyle = (): TextStyle[] => {
    const baseStyle: TextStyle[] = [styles.buttonText, styles[`${size}Text`]];
    
    switch (variant) {
      case 'primary':
      case 'secondary':
        baseStyle.push({ color: colors.textOnPrimary });
        break;
      case 'outline':
      case 'text':
        baseStyle.push({ color: colors.primary });
        break;
    }
    
    if (disabled || loading) {
      baseStyle.push({ opacity: 0.6 });
    }
    
    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={[...getButtonStyle(), { ...colors.shadow.small }, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={TRANSITIONS.opacity.pressed}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'secondary' ? colors.textOnPrimary : colors.primary}
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={[...getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  // Tailles
  small: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 36,
  },
  medium: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 44,
  },
  large: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    minHeight: 52,
  },
  disabled: {
    opacity: TRANSITIONS.opacity.disabled,
  },
  fullWidth: {
    width: '100%',
  },
  // Styles de texte
  buttonText: {
    fontWeight: FONT_WEIGHTS.semiBold,
    textAlign: 'center',
  },
  smallText: {
    fontSize: FONT_SIZES.sm,
  },
  mediumText: {
    fontSize: FONT_SIZES.md,
  },
  largeText: {
    fontSize: FONT_SIZES.lg,
  },
});

