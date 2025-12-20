/**
 * Hook pour gérer les notifications Marketplace
 * Avec support temps réel (polling ou WebSocket)
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import apiClient from '../services/api/apiClient';
import type { Notification } from '../types/marketplace';

export function useMarketplaceNotifications() {
  const { projetActif } = useAppSelector((state) => state.projet);
  const currentUserId = useAppSelector((state) => state.auth.user?.id);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charger les notifications
   */
  const loadNotifications = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

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
      console.error('Erreur chargement notifications:', err);
      const errorMessage = err instanceof Error ? err.message : 'Impossible de charger les notifications';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

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
      console.error('Erreur marquage notification:', err);
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
      console.error('Erreur marquage toutes notifications:', err);
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
      console.error('Erreur suppression notification:', err);
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
    loadNotifications();
  }, [loadNotifications]);

  // Polling toutes les 30 secondes (à remplacer par WebSocket en production)
  useEffect(() => {
    if (!currentUserId) return;

    const interval = setInterval(() => {
      loadNotifications();
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, [currentUserId, loadNotifications]);

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
