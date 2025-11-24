/**
 * Hook personnalisé pour détecter le "shake" (secousse du téléphone)
 * et déclencher une action d'annulation avec retour haptique
 */

import { useEffect, useRef } from 'react';
import { DeviceMotion, DeviceMotionMeasurement } from 'expo-sensors';
import * as Haptics from 'expo-haptics';

interface UseShakeToCancelOptions {
  enabled?: boolean;
  onShake: () => void;
  threshold?: number; // Sensibilité de détection (plus bas = plus sensible)
  cooldown?: number; // Temps minimum entre deux détections (ms)
}

/**
 * Hook pour détecter une secousse du téléphone et déclencher une action
 *
 * @param options - Configuration du hook
 * @param options.enabled - Active ou désactive la détection (par défaut: true)
 * @param options.onShake - Fonction appelée lors d'une secousse détectée
 * @param options.threshold - Seuil de détection (par défaut: 15)
 * @param options.cooldown - Délai entre deux détections (par défaut: 1000ms)
 *
 * @example
 * ```typescript
 * useShakeToCancel({
 *   enabled: modalVisible,
 *   onShake: () => {
 *     Alert.alert('Annulation', 'Action annulée par secousse');
 *     setModalVisible(false);
 *   }
 * });
 * ```
 */
export function useShakeToCancel({
  enabled = true,
  onShake,
  threshold = 15,
  cooldown = 1000,
}: UseShakeToCancelOptions) {
  const lastShakeTime = useRef<number>(0);
  const subscription = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Nettoyer l'abonnement si désactivé
      if (subscription.current) {
        subscription.current.remove();
        subscription.current = null;
      }
      return;
    }

    // Fonction pour calculer l'accélération totale
    const calculateAcceleration = (data: DeviceMotionMeasurement): number => {
      if (!data.acceleration) return 0;

      const { x = 0, y = 0, z = 0 } = data.acceleration;
      return Math.sqrt(x * x + y * y + z * z);
    };

    // Démarrer la détection de mouvement
    const startShakeDetection = async () => {
      try {
        // Vérifier si les capteurs sont disponibles
        const isAvailable = await DeviceMotion.isAvailableAsync();
        if (!isAvailable) {
          console.warn('⚠️ Capteurs de mouvement non disponibles sur cet appareil');
          return;
        }

        // Demander la permission (sur iOS)
        const { status } = await DeviceMotion.requestPermissionsAsync();
        if (status !== 'granted') {
          console.warn('⚠️ Permission refusée pour les capteurs de mouvement');
          return;
        }

        // S'abonner aux événements de mouvement
        DeviceMotion.setUpdateInterval(100); // Mise à jour toutes les 100ms

        subscription.current = DeviceMotion.addListener((data) => {
          const acceleration = calculateAcceleration(data);
          const now = Date.now();

          // Vérifier si une secousse est détectée
          if (acceleration > threshold) {
            // Vérifier le cooldown pour éviter les déclenchements multiples
            if (now - lastShakeTime.current > cooldown) {
              lastShakeTime.current = now;

              console.log('🔔 Secousse détectée ! Accélération:', acceleration.toFixed(2));

              // Déclencher un retour haptique fort
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

              // Appeler la fonction d'annulation
              onShake();
            }
          }
        });
      } catch (error) {
        console.error('❌ Erreur lors du démarrage de la détection:', error);
      }
    };

    startShakeDetection();

    // Nettoyage lors du démontage
    return () => {
      if (subscription.current) {
        subscription.current.remove();
        subscription.current = null;
      }
    };
  }, [enabled, onShake, threshold, cooldown]);
}

/**
 * Variante simplifiée pour une utilisation dans les modaux
 *
 * @example
 * ```typescript
 * useShakeToCancelModal({
 *   visible: modalVisible,
 *   onClose: handleClose,
 *   confirmMessage: 'Voulez-vous vraiment annuler ?'
 * });
 * ```
 */
export function useShakeToCancelModal({
  visible,
  onClose,
  confirmMessage,
}: {
  visible: boolean;
  onClose: () => void;
  confirmMessage?: string;
}) {
  useShakeToCancel({
    enabled: visible,
    onShake: () => {
      if (confirmMessage) {
        // Afficher une confirmation avant d'annuler
        const confirmed = confirm(confirmMessage);
        if (confirmed) {
          onClose();
        }
      } else {
        // Fermer directement
        onClose();
      }
    },
  });
}
