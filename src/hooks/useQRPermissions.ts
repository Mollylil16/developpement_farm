/**
 * Hook personnalisé pour gérer les permissions caméra pour le scanner QR
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform, Linking, Alert } from 'react-native';
import { Camera } from 'expo-camera';

export interface UseQRPermissionsReturn {
  hasPermission: boolean | null; // null = pas encore vérifié, true/false = résultat
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  checkPermission: () => Promise<boolean>;
  openSettings: () => Promise<void>;
}

export const useQRPermissions = (): UseQRPermissionsReturn => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Vérifie le statut actuel de la permission caméra
   */
  const checkPermission = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const { status } = await Camera.getCameraPermissionsAsync();
      const hasGranted = status === 'granted';
      setHasPermission(hasGranted);
      return hasGranted;
    } catch (error) {
      console.error('[useQRPermissions] Erreur lors de la vérification des permissions:', error);
      setHasPermission(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Demande la permission caméra à l'utilisateur
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const { status } = await Camera.requestCameraPermissionsAsync();
      const hasGranted = status === 'granted';
      setHasPermission(hasGranted);

      if (!hasGranted) {
        // L'utilisateur a refusé la permission
        Alert.alert(
          'Permission caméra requise',
          'Pour scanner les codes QR, nous avons besoin d\'accéder à votre caméra. Vous pouvez l\'activer dans les paramètres de l\'application.',
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Paramètres',
              onPress: () => openSettings(),
            },
          ]
        );
      }

      return hasGranted;
    } catch (error) {
      console.error('[useQRPermissions] Erreur lors de la demande de permission:', error);
      setHasPermission(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Ouvre les paramètres de l'application pour permettre à l'utilisateur d'autoriser la permission manuellement
   */
  const openSettings = useCallback(async (): Promise<void> => {
    try {
      if (Platform.OS === 'ios') {
        // Sur iOS, ouvrir les paramètres de l'app
        await Linking.openURL('app-settings:');
      } else {
        // Sur Android, ouvrir les paramètres système
        await Linking.openSettings();
      }
    } catch (error) {
      console.error('[useQRPermissions] Erreur lors de l\'ouverture des paramètres:', error);
      Alert.alert(
        'Impossible d\'ouvrir les paramètres',
        'Veuillez ouvrir manuellement les paramètres de l\'application et autoriser l\'accès à la caméra.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  // Vérifier la permission au montage du composant
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return {
    hasPermission,
    isLoading,
    requestPermission,
    checkPermission,
    openSettings,
  };
};
