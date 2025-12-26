/**
 * Animation "Kouakou réfléchit" avec 3 points animés
 * Affiche une animation de typing pendant que l'agent traite la question
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS } from '../../constants/theme';

interface TypingIndicatorProps {
  /** Message personnalisé à afficher (optionnel) */
  message?: string;
}

export default function TypingIndicator({ message = 'Kouakou réfléchit' }: TypingIndicatorProps) {
  // Animation refs pour les 3 points
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Créer l'animation de rebond pour chaque point avec un délai décalé
    const createBounceAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 300,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(600 - delay), // Compléter le cycle
        ])
      );
    };

    // Démarrer les animations avec décalage
    const anim1 = createBounceAnimation(dot1Anim, 0);
    const anim2 = createBounceAnimation(dot2Anim, 200);
    const anim3 = createBounceAnimation(dot3Anim, 400);

    anim1.start();
    anim2.start();
    anim3.start();

    // Cleanup
    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1Anim, dot2Anim, dot3Anim]);

  // Interpolation pour le mouvement vertical (rebond)
  const getTranslateY = (animValue: Animated.Value) => {
    return animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -8],
    });
  };

  // Interpolation pour l'opacité
  const getOpacity = (animValue: Animated.Value) => {
    return animValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.4, 1, 0.4],
    });
  };

  return (
    <View style={styles.container}>
      {/* Avatar de Kouakou */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>👨🏾‍🌾</Text>
        </View>
      </View>

      {/* Bulle de réflexion */}
      <View style={styles.bubble}>
        <Text style={styles.messageText}>{message}</Text>
        <View style={styles.dotsContainer}>
          <Animated.View
            style={[
              styles.dot,
              {
                transform: [{ translateY: getTranslateY(dot1Anim) }],
                opacity: getOpacity(dot1Anim),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                transform: [{ translateY: getTranslateY(dot2Anim) }],
                opacity: getOpacity(dot2Anim),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                transform: [{ translateY: getTranslateY(dot3Anim) }],
                opacity: getOpacity(dot3Anim),
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 24,
  },
  bubble: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
});

