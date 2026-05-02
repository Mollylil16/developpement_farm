/**
 * InfoCard - Composant de notification élégant avec card transparent
 * Affiche un message informatif avec animation
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface InfoCardProps {
  message: string;
  submessage?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  duration?: number; // Durée d'affichage en ms
  onHide?: () => void;
}

const { width } = Dimensions.get('window');

export const InfoCard: React.FC<InfoCardProps> = ({
  message,
  submessage,
  icon = 'checkmark-circle',
  iconColor = '#10B981',
  duration = 2500,
  onHide,
}) => {
  const { colors, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    // Animation d'entrée
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation de sortie après la durée spécifiée
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onHide) {
          onHide();
        }
      });
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark
              ? 'rgba(30, 41, 59, 0.95)' // Dark mode: slate-800 semi-transparent
              : 'rgba(255, 255, 255, 0.95)', // Light mode: white semi-transparent
            borderColor: isDark
              ? 'rgba(148, 163, 184, 0.2)' // slate-400 transparent
              : 'rgba(203, 213, 225, 0.5)', // slate-300 transparent
          },
        ]}
      >
        {/* Icône */}
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={28} color={iconColor} />
        </View>

        {/* Texte */}
        <View style={styles.textContainer}>
          <Text style={[styles.message, { color: colors.text }]}>
            {message}
          </Text>
          {submessage && (
            <Text style={[styles.submessage, { color: colors.textSecondary }]}>
              {submessage}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
  },
  card: {
    width: width - 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    // Effet de backdrop blur (simulé avec opacity et shadowRadius)
  },
  iconContainer: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  submessage: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 18,
  },
});

