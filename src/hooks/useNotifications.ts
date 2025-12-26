/**
 * Hook pour gérer les notifications locales
 */

import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectAllGestations } from '../store/selectors/reproductionSelectors';
import {
  configureNotifications,
  scheduleGestationAlerts,
  scheduleTaskReminders,
  scheduleStockAlerts,
  cleanupObsoleteNotifications,
  cancelAllNotifications,
} from '../services/notificationsService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NOTIFICATIONS_ENABLED_KEY } from '../constants/notifications';
import { createLoggerWithPrefix } from '../utils/logger';

const logger = createLoggerWithPrefix('useNotifications');

export function useNotifications() {
  const gestations = useAppSelector(selectAllGestations);
  const { planifications } = useAppSelector((state) => state.planification);
  const { stocks } = useAppSelector((state) => state.stocks);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // ✅ MÉMOÏSER les IDs pour éviter les re-renders inutiles (CRITIQUE !)
  const gestationsIds = useMemo(
    () =>
      Array.isArray(gestations)
        ? gestations
            .map((g) => g.id)
            .sort()
            .join(',')
        : '',
    [gestations]
  );
  const planificationsIds = useMemo(
    () =>
      Array.isArray(planifications)
        ? planifications
            .map((p) => p.id)
            .sort()
            .join(',')
        : '',
    [planifications]
  );
  const stocksIds = useMemo(
    () =>
      Array.isArray(stocks)
        ? stocks
            .map((s) => s.id)
            .sort()
            .join(',')
        : '',
    [stocks]
  );

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
          logger.warn(
            'Configuration échouée (peut être normal dans Expo Go):',
            error
          );
        } else {
          logger.error('Erreur lors de la configuration des notifications:', error);
        }
      }
    };

    setupNotifications();
  }, [notificationsEnabled]);

  // ✅ Utiliser useRef pour éviter les chargements multiples
  const gestationsScheduledRef = useRef<string>('');

  // Planifier les notifications de gestations
  useEffect(() => {
    if (!notificationsEnabled) return;
    if (!Array.isArray(gestations) || gestations.length === 0) return;

    // ✅ Ne planifier que si les IDs ont changé
    if (gestationsScheduledRef.current === gestationsIds) return;
    gestationsScheduledRef.current = gestationsIds;

    const scheduleGestations = async () => {
      try {
        const gestationsEnCours = gestations.filter((g) => g.statut === 'en_cours');
        await scheduleGestationAlerts(gestationsEnCours);
      } catch (error) {
        logger.error('Erreur lors de la planification des gestations:', error);
      }
    };

    scheduleGestations();
  }, [gestationsIds, notificationsEnabled, gestations]);

  // ✅ Utiliser useRef pour les planifications
  const planificationsScheduledRef = useRef<string>('');

  // Planifier les notifications de tâches
  useEffect(() => {
    if (!notificationsEnabled) return;
    if (!Array.isArray(planifications) || planifications.length === 0) return;

    // ✅ Ne planifier que si les IDs ont changé
    if (planificationsScheduledRef.current === planificationsIds) return;
    planificationsScheduledRef.current = planificationsIds;

    const scheduleTasks = async () => {
      try {
        const tasksAFaire = planifications.filter((p) => p.statut === 'a_faire');
        await scheduleTaskReminders(tasksAFaire);
      } catch (error) {
        logger.error('Erreur lors de la planification des tâches:', error);
      }
    };

    scheduleTasks();
  }, [planificationsIds, notificationsEnabled, planifications]);

  // ✅ Utiliser useRef pour les stocks
  const stocksScheduledRef = useRef<string>('');

  // Planifier les notifications de stocks
  useEffect(() => {
    if (!notificationsEnabled) return;
    if (!Array.isArray(stocks) || stocks.length === 0) return;

    // ✅ Ne planifier que si les IDs ont changé
    if (stocksScheduledRef.current === stocksIds) return;
    stocksScheduledRef.current = stocksIds;

    const scheduleStocks = async () => {
      try {
        await scheduleStockAlerts(stocks);
      } catch (error) {
        logger.error('Erreur lors de la planification des stocks:', error);
      }
    };

    scheduleStocks();
  }, [stocksIds, notificationsEnabled, stocks]);

  // Nettoyer les notifications obsolètes périodiquement
  useEffect(() => {
    if (!notificationsEnabled) return;

    const cleanup = async () => {
      try {
        const gestationsEnCours = Array.isArray(gestations)
          ? gestations.filter((g) => g.statut === 'en_cours')
          : [];
        const tasksAFaire = Array.isArray(planifications)
          ? planifications.filter((p) => p.statut === 'a_faire')
          : [];
        await cleanupObsoleteNotifications(gestationsEnCours, tasksAFaire);
      } catch (error) {
        logger.error('Erreur lors du nettoyage des notifications:', error);
      }
    };

    // Nettoyer toutes les 5 minutes
    const interval = setInterval(cleanup, 5 * 60 * 1000);
    cleanup(); // Nettoyer immédiatement aussi

    return () => clearInterval(interval);
  }, [gestationsIds, planificationsIds, notificationsEnabled, gestations, planifications]); // ✅ Utiliser les IDs

  // Fonction pour annuler toutes les notifications
  const cancelAll = useCallback(async () => {
    try {
      await cancelAllNotifications();
    } catch (error) {
      logger.error("Erreur lors de l'annulation des notifications:", error);
    }
  }, []);

  return {
    cancelAll,
  };
}
