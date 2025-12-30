/**
 * Hook pour gérer les notifications Marketplace
 * Avec support temps réel (polling ou WebSocket)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAppSelector } from '../store/hooks';
import apiClient, { isRefreshInProgress, waitForActiveRefresh } from '../services/api/apiClient';
import type { Notification } from '../types/marketplace';
import { logger } from '../utils/logger';

const DEFAULT_POLLING_INTERVAL_MS = 60_000; // 1 minute

interface UseMarketplaceNotificationsOptions {
  enabled?: boolean;
  pollIntervalMs?: number;
  respectAppState?: boolean;
}

export function useMarketplaceNotifications(
  options: UseMarketplaceNotificationsOptions = {}
) {
  const {
    enabled = true,
    pollIntervalMs = DEFAULT_POLLING_INTERVAL_MS,
    respectAppState = true,
  } = options;
  const projetActifId = useAppSelector((state) => state.projet.projetActif?.id);
  const currentUserId = useAppSelector((state) => state.auth.user?.id);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isFetchingRef = useRef(false);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');
  const effectiveEnabled = enabled && (!respectAppState || isAppActive);

  /**
   * Charger les notifications
   */
  const loadNotifications = useCallback(
    async (options: { silent?: boolean } = {}) => {
      const { silent = false } = options;

      if (!effectiveEnabled || !currentUserId || !projetActifId) {
        if (!silent) {
          setLoading(false);
        }
        return;
      }

      if (isFetchingRef.current && silent) {
        return;
      }

      isFetchingRef.current = true;

      try {
        if (!silent) {
          setLoading(true);
          setError(null);
        }

        if (isRefreshInProgress()) {
          await waitForActiveRefresh(7000);
        }

        // Charger les notifications de l'utilisateur depuis l'API backend
        const allNotifications = await apiClient.get<any[]>('/marketplace/notifications');

        // Trier par date (plus récent en premier)
        const sortedNotifications = allNotifications.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setNotifications(sortedNotifications);

        // Compter les non lues
        const unread = sortedNotifications.filter((n) => !n.read).length;
        setUnreadCount(unread);
      } catch (err: unknown) {
        logger.error('Erreur chargement notifications:', err);
        if (!silent) {
          const errorMessage =
            err instanceof Error ? err.message : 'Impossible de charger les notifications';
          setError(errorMessage);
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
        isFetchingRef.current = false;
      }
    },
    [currentUserId, projetActifId, effectiveEnabled]
  );

  /**
   * Marquer une notification comme lue
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Marquer la notification comme lue via l'API backend
      await apiClient.patch(`/marketplace/notifications/${notificationId}/read`);

      // Mettre à jour l'état local
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );

      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: unknown) {
      logger.error('Erreur marquage notification:', err);
    }
  }, []);

  /**
   * Marquer toutes les notifications comme lues
   */
  const markAllAsRead = useCallback(async () => {
    if (!currentUserId) return;

    try {
      // Marquer toutes les notifications comme lues via l'API backend
      // Note: Si l'endpoint n'existe pas, on peut marquer chaque notification individuellement
      const allNotifications = await apiClient.get<any[]>('/marketplace/notifications');
      await Promise.all(
        allNotifications
          .filter((n) => !n.read)
          .map((n) => apiClient.patch(`/marketplace/notifications/${n.id}/read`))
      );

      // Mettre à jour l'état local
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err: unknown) {
      logger.error('Erreur marquage toutes notifications:', err);
    }
  }, [currentUserId]);

  /**
   * Supprimer une notification
   */
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      // Supprimer la notification via l'API backend
      // Note: Si l'endpoint DELETE n'existe pas, on peut utiliser PATCH pour marquer comme supprimée
      await apiClient.delete(`/marketplace/notifications/${notificationId}`);

      // Mettre à jour l'état local
      setNotifications((prev) => {
        const notification = prev.find((n) => n.id === notificationId);
        if (notification && !notification.read) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }
        return prev.filter((n) => n.id !== notificationId);
      });
    } catch (err: unknown) {
      logger.error('Erreur suppression notification:', err);
    }
  }, []);

  /**
   * Rafraîchir les notifications
   */
  const refresh = useCallback(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Charger au montage
  useEffect(() => {
    if (!effectiveEnabled) {
      isFetchingRef.current = false;
      setLoading(false);
      return;
    }
    loadNotifications();
  }, [effectiveEnabled, loadNotifications]);

  // Polling périodique uniquement quand activé et utilisateur présent
  useEffect(() => {
    if (!effectiveEnabled || !currentUserId || !projetActifId) return;

    const interval = setInterval(() => {
      loadNotifications({ silent: true });
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [effectiveEnabled, currentUserId, projetActifId, loadNotifications, pollIntervalMs]);

  useEffect(() => {
    if (!respectAppState) return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      setIsAppActive(nextState === 'active');
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [respectAppState]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  };
}
