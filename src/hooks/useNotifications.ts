/**
 * Hook pour gérer les notifications locales
 */

import { useEffect, useCallback, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import {
  configureNotifications,
  scheduleGestationAlerts,
  scheduleTaskReminders,
  cancelAllNotifications,
} from '../services/notificationsService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled';

export function useNotifications() {
  const { gestations } = useAppSelector((state) => state.reproduction);
  const { planifications } = useAppSelector((state) => state.planification);
  const { stocks } = useAppSelector((state) => state.stocks);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Charger la préférence des notifications
  useEffect(() => {
    const loadPreference = async () => {
      const value = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
      if (value !== null) {
        setNotificationsEnabled(value === 'true');
      }
    };
    loadPreference();
  }, []);

  // Configurer les notifications au démarrage si activées
  useEffect(() => {
    const setupNotifications = async () => {
      if (!notificationsEnabled) return;
      
      try {
        await configureNotifications();
      } catch (error) {
        // En mode développement, on log en warning plutôt qu'en erreur
        if (__DEV__) {
          console.warn('Notifications: Configuration échouée (peut être normal dans Expo Go):', error);
        } else {
          console.error('Erreur lors de la configuration des notifications:', error);
        }
      }
    };

    setupNotifications();
  }, [notificationsEnabled]);

  // Planifier les notifications de gestations
  useEffect(() => {
    if (!notificationsEnabled) return;

    const scheduleGestations = async () => {
      try {
        const gestationsEnCours = gestations.filter((g) => g.statut === 'en_cours');
        await scheduleGestationAlerts(gestationsEnCours);
      } catch (error) {
        console.error('Erreur lors de la planification des gestations:', error);
      }
    };

    if (gestations.length > 0) {
      scheduleGestations();
    }
  }, [gestations, notificationsEnabled]);

  // Planifier les notifications de tâches
  useEffect(() => {
    if (!notificationsEnabled) return;

    const scheduleTasks = async () => {
      try {
        const tasksAFaire = planifications.filter((p) => p.statut === 'a_faire');
        await scheduleTaskReminders(tasksAFaire);
      } catch (error) {
        console.error('Erreur lors de la planification des tâches:', error);
      }
    };

    if (planifications.length > 0) {
      scheduleTasks();
    }
  }, [planifications, notificationsEnabled]);

  // Fonction pour annuler toutes les notifications
  const cancelAll = useCallback(async () => {
    try {
      await cancelAllNotifications();
    } catch (error) {
      console.error('Erreur lors de l\'annulation des notifications:', error);
    }
  }, []);

  return {
    cancelAll,
  };
}

