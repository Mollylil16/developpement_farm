/**
 * Hook pour gérer les états de chargement et les messages d'erreur/succès
 * Améliore l'UX de l'authentification
 */

import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useAppSelector } from '../store/hooks';

export interface AuthLoadingState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  clearMessages: () => void;
}

/**
 * Hook pour gérer les états de chargement et messages d'authentification
 */
export function useAuthLoading(): AuthLoadingState {
  const { isLoading, error } = useAppSelector((state) => state.auth);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Afficher les erreurs Redux
  useEffect(() => {
    if (error) {
      setLocalError(error);
      Alert.alert('Erreur', error);
    }
  }, [error]);

  const showError = (message: string) => {
    setLocalError(message);
    Alert.alert('Erreur', message);
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    // Auto-clear après 3 secondes
    setTimeout(() => {
      setSuccess(null);
    }, 3000);
  };

  const clearMessages = () => {
    setLocalError(null);
    setSuccess(null);
  };

  return {
    isLoading,
    error: localError || error,
    success,
    showError,
    showSuccess,
    clearMessages,
  };
}
