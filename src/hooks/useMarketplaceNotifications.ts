/**
 * Hook pour gérer les notifications Marketplace
 * Avec support temps réel (polling ou WebSocket)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAppSelector } from '../store/hooks';
import apiClient, { isRefreshInProgress, waitForActiveRefresh, APIError } from '../services/api/apiClient';
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
  // Note: projetActifId n'est plus requis - les acheteurs/collaborateurs n'ont pas de projet propre
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

      // ✅ CORRECTION: Ne plus exiger projetActifId pour charger les notifications
      // Les acheteurs purs et collaborateurs n'ont pas de projetActif mais doivent voir leurs notifications
      if (!effectiveEnabled || !currentUserId) {
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
        // Timeout réduit pour les notifications (non-critique, en arrière-plan)
        const allNotifications = await apiClient.get<any[]>('/marketplace/notifications', {
          timeout: 10000, // 10 secondes au lieu du timeout par défaut
          retry: false, // Pas de retry automatique pour les notifications (polling périodique)
        });

        // Trier par date (plus récent en premier)
        const sortedNotifications = allNotifications.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setNotifications(sortedNotifications);

        // Compter les non lues
        const unread = sortedNotifications.filter((n) => !n.read).length;
        setUnreadCount(unread);
      } catch (err: unknown) {
        // Ne pas logger les timeouts comme des erreurs critiques (opération en arrière-plan)
        const isTimeout = 
          (err instanceof APIError && err.status === 408) ||
          (err instanceof Error && err.message.includes('timeout')) ||
          (err instanceof Error && err.message.includes('Network request timed out')) ||
          (err instanceof Error && err.name === 'AbortError') ||
          (err as any)?.status === 408;
        
        if (isTimeout) {
          // Timeout silencieux pour les notifications (polling périodique)
          logger.debug('Timeout lors du chargement des notifications (non critique, retry au prochain polling)');
        } else {
          logger.error('Erreur chargement notifications:', err);
        }
        
        if (!silent && !isTimeout) {
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
    [currentUserId, effectiveEnabled]
  );

  /**
   * Marquer une notification comme lue
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Marquer la notification comme lue via l'API backend
      // ✅ Utiliser l'endpoint correct avec body
      await apiClient.patch('/marketplace/notifications/mark-read', {
        notificationIds: [notificationId],
      });

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
      // Utiliser l'endpoint dédié pour marquer toutes les notifications comme lues
      await apiClient.patch('/marketplace/notifications/mark-all-read');

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
  // ✅ CORRECTION: Ne plus exiger projetActifId pour le polling
  useEffect(() => {
    if (!effectiveEnabled || !currentUserId) return;

    const interval = setInterval(() => {
      loadNotifications({ silent: true });
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [effectiveEnabled, currentUserId, loadNotifications, pollIntervalMs]);

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
