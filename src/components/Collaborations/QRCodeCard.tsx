/**
 * Composant réutilisable pour afficher les cards QR Code
 * Utilisé dans CollaborationScreen et autres écrans nécessitant des actions QR
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, LIGHT_COLORS } from '../../constants/theme';

export interface QRCodeCardProps {
  variant: 'my-qr' | 'scan-qr' | 'invite';
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean; // Version compacte pour petits espaces
}

type VariantConfig = {
  icon: keyof typeof Ionicons.glyphMap;
  gradientColors: [string, string];
  title: string;
  description: string;
  accessibilityLabel: string;
  accessibilityHint: string;
};

const VARIANT_CONFIG: Record<'my-qr' | 'scan-qr' | 'invite', VariantConfig> = {
  'my-qr': {
    icon: 'qr-code',
    gradientColors: ['#4A90E2', '#5BA3F0'],
    title: 'Mon QR Code',
    description: 'Partagez votre profil',
    accessibilityLabel: 'Afficher mon QR Code professionnel',
    accessibilityHint: 'Ouvre l\'écran pour afficher et partager votre QR code professionnel',
  },
  'scan-qr': {
    icon: 'scan',
    gradientColors: ['#50E3C2', '#6BEDD4'],
    title: 'Scanner un QR',
    description: 'Ajouter un collaborateur',
    accessibilityLabel: 'Scanner un QR code de collaborateur',
    accessibilityHint: 'Ouvre le scanner pour ajouter un collaborateur en scannant son QR code',
  },
  'invite': {
    icon: 'person-add',
    gradientColors: ['#FF6B6B', '#FF8E8E'],
    title: 'Inviter',
    description: 'Invitation manuelle',
    accessibilityLabel: 'Inviter un collaborateur manuellement',
    accessibilityHint: 'Ouvre le formulaire pour inviter un collaborateur par email ou téléphone',
  },
};

export default function QRCodeCard({
  variant,
  onPress,
  disabled = false,
  compact = false,
}: QRCodeCardProps) {
  const config = VARIANT_CONFIG[variant];
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(disabled ? 0.5 : 1)).current;

  // Animation au touch
  const handlePressIn = () => {
    if (disabled) return;
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        friction: 3,
        tension: 40,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled) return;

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 3,
        tension: 40,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = () => {
    if (disabled) return;
    onPress();
  };

  // Mise à jour de l'opacité quand disabled change
  React.useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: disabled ? 0.5 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [disabled, opacityAnim]);

  if (compact) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={config.accessibilityLabel}
        accessibilityHint={config.accessibilityHint}
        accessibilityState={{ disabled }}
        style={styles.compactContainer}
      >
        <Animated.View
          style={[
            styles.compactCard,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <LinearGradient
            colors={config.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.compactGradient}
          >
            <View style={styles.compactContent}>
              {/* Icône à gauche */}
              <View style={styles.compactIconContainer}>
                <Ionicons name={config.icon} size={24} color="#FFFFFF" />
              </View>

              {/* Texte au centre */}
              <View style={styles.compactTextContainer}>
                <Text style={styles.compactTitle}>{config.title}</Text>
                {config.description && (
                  <Text style={styles.compactDescription} numberOfLines={1}>
                    {config.description}
                  </Text>
                )}
              </View>

              {/* Chevron à droite */}
              <View style={styles.compactChevronContainer}>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  // Mode normal (vertical)
  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={config.accessibilityLabel}
      accessibilityHint={config.accessibilityHint}
      accessibilityState={{ disabled }}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <LinearGradient
          colors={config.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.content}>
            {/* Icône en haut */}
            <View style={styles.iconContainer}>
              <Ionicons name={config.icon} size={28} color="#FFFFFF" />
            </View>

            {/* Titre */}
            <Text style={styles.title}>{config.title}</Text>

            {/* Description */}
            <Text style={styles.description} numberOfLines={2}>
              {config.description}
            </Text>

            {/* Chevron en bas */}
            <View style={styles.chevronContainer}>
              <Ionicons name="chevron-down" size={16} color="rgba(255, 255, 255, 0.9)" />
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Mode normal (vertical)
  container: {
    flex: 1,
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...LIGHT_COLORS.shadow.medium,
  },
  gradient: {
    padding: SPACING.lg,
    minHeight: 120,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FFFFFF',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  description: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: SPACING.xs,
    lineHeight: 16,
  },
  chevronContainer: {
    marginTop: SPACING.xs,
  },

  // Mode compact (horizontal)
  compactContainer: {
    marginBottom: SPACING.sm,
  },
  compactCard: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    ...LIGHT_COLORS.shadow.small,
  },
  compactGradient: {
    padding: SPACING.md,
    minHeight: 60,
    justifyContent: 'center',
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  compactTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  compactTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  compactDescription: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 14,
  },
  compactChevronContainer: {
    marginLeft: SPACING.sm,
  },
});
