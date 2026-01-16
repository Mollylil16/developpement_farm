/**
 * Helper pour les feedbacks haptiques
 * Utilise expo-haptics pour fournir des retours tactiles
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type HapticType = 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy';

/**
 * Déclenche un feedback haptique selon le type
 */
export const triggerHaptic = (type: HapticType = 'medium'): void => {
  // Les haptics ne sont disponibles que sur iOS et Android physique (pas les émulateurs)
  if (Platform.OS === 'web') {
    return;
  }

  try {
    switch (type) {
      case 'success':
        // Vibration douce pour succès
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'error':
        // Vibration forte pour erreur
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'warning':
        // Vibration moyenne pour avertissement
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'light':
        // Impact léger
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        // Impact moyen (par défaut)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        // Impact fort
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      default:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  } catch (error) {
    // Silently fail si les haptics ne sont pas disponibles
    console.debug('[Haptics] Haptic feedback non disponible:', error);
  }
};

/**
 * Retour haptique pour scan QR réussi
 */
export const hapticScanSuccess = (): void => {
  triggerHaptic('success');
};

/**
 * Retour haptique pour acceptation d'invitation
 */
export const hapticInvitationAccepted = (): void => {
  triggerHaptic('success');
};

/**
 * Retour haptique pour erreur
 */
export const hapticError = (): void => {
  triggerHaptic('error');
};

/**
 * Retour haptique pour action normale (bouton pressé, etc.)
 */
export const hapticAction = (): void => {
  triggerHaptic('light');
};
