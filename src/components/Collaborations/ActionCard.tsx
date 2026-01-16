/**
 * Composant réutilisable ActionCard pour les actions de collaboration
 * Utilisé pour les 3 actions principales : Mon QR Code, Scanner un QR, Inviter
 * Design harmonieux avec gradients, animations et responsive
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, LIGHT_COLORS } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_TABLET = SCREEN_WIDTH >= 768;
const CARD_MAX_WIDTH = 600;

export interface ActionCardProps {
  variant: 'my-qr' | 'scan-qr' | 'invite';
  onPress: () => void;
  disabled?: boolean;
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

export default function ActionCard({
  variant,
  onPress,
  disabled = false,
}: ActionCardProps) {
  const config = VARIANT_CONFIG[variant];
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(disabled ? 0.6 : 1)).current;

  // Animation au press
  const handlePressIn = () => {
    if (disabled) return;

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        friction: 3,
        tension: 300,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.9,
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
        tension: 300,
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
      toValue: disabled ? 0.6 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [disabled, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={config.accessibilityLabel}
        accessibilityHint={config.accessibilityHint}
        accessibilityState={{ disabled }}
        style={styles.touchable}
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
            <Text style={styles.title} numberOfLines={1}>
              {config.title}
            </Text>

            {/* Description */}
            <Text style={styles.description} numberOfLines={2}>
              {config.description}
            </Text>

            {/* Chevron en bas */}
            <View style={styles.chevronContainer}>
              <Ionicons name="chevron-down" size={14} color="rgba(255, 255, 255, 0.9)" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    minHeight: 120,
    maxHeight: 140,
  },
  touchable: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...LIGHT_COLORS.shadow.medium,
  },
  gradient: {
    flex: 1,
    padding: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: '#FFFFFF',
    marginBottom: SPACING.xs / 2,
    textAlign: 'center',
  },
  description: {
    fontSize: FONT_SIZES.xs - 1,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: FONT_SIZES.xs + 2,
    marginBottom: SPACING.xs / 2,
  },
  chevronContainer: {
    marginTop: SPACING.xs / 2,
  },
});
