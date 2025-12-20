/**
 * Hook custom pour gérer les animations du Dashboard
 * Responsabilités:
 * - Création des Animated.Value
 * - Séquence d'animation au montage
 * - Configuration des timings
 */

import { useRef, useEffect, useMemo } from 'react';
import { Animated } from 'react-native';

interface UseDashboardAnimationsReturn {
  headerAnim: Animated.Value;
  mainWidgetsAnim: Animated.Value[];
  secondaryWidgetsAnim: Animated.Value[];
}

export function useDashboardAnimations(): UseDashboardAnimationsReturn {
  // Animation du header
  const headerAnim = useRef(new Animated.Value(0)).current;

  // Animations pour les 5 widgets principaux
  const mainWidgetsAnim = useMemo(
    () => [
      new Animated.Value(0),
      new Animated.Value(0),
      new Animated.Value(0),
      new Animated.Value(0),
      new Animated.Value(0),
    ],
    []
  );

  // Animations pour les 6 widgets secondaires
  const secondaryWidgetsAnim = useMemo(
    () => [
      new Animated.Value(0),
      new Animated.Value(0),
      new Animated.Value(0),
      new Animated.Value(0),
      new Animated.Value(0),
      new Animated.Value(0),
    ],
    []
  );

  /**
   * Lance toutes les animations au montage
   */
  useEffect(() => {
    // Animation du header (immédiate)
    Animated.spring(headerAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Animations en cascade pour les widgets principaux
    // Délai initial: 200ms, puis +100ms entre chaque
    mainWidgetsAnim.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(200 + index * 100),
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Animations en cascade pour les widgets secondaires
    // Délai initial: 600ms, puis +80ms entre chaque
    secondaryWidgetsAnim.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(600 + index * 80),
        Animated.spring(anim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []); // Exécuter une seule fois au montage

  return {
    headerAnim,
    mainWidgetsAnim,
    secondaryWidgetsAnim,
  };
}
