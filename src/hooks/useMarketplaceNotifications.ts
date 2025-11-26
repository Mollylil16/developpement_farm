/**
 * Hook pour gérer les notifications Marketplace
 * Avec support temps réel (polling ou WebSocket)
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import { getDatabase } from '../services/database';
import { MarketplaceNotificationRepository } from '../database/repositories';
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

      const db = await getDatabase();
      const repo = new MarketplaceNotificationRepository(db);

      // Charger les notifications de l'utilisateur
      const allNotifications = await repo.findByUserId(currentUserId);

      // Trier par date (plus récent en premier)
      const sortedNotifications = allNotifications.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setNotifications(sortedNotifications);

      // Compter les non lues
      const unread = sortedNotifications.filter((n) => !n.read).length;
      setUnreadCount(unread);
    } catch (err: any) {
      console.error('Erreur chargement notifications:', err);
      setError(err.message || 'Impossible de charger les notifications');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  /**
   * Marquer une notification comme lue
   */
  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        const db = await getDatabase();
        const repo = new MarketplaceNotificationRepository(db);

        await repo.markAsRead(notificationId);

        // Mettre à jour l'état local
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );

        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err: any) {
        console.error('Erreur marquage notification:', err);
      }
    },
    []
  );

  /**
   * Marquer toutes les notifications comme lues
   */
  const markAllAsRead = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const db = await getDatabase();
      const repo = new MarketplaceNotificationRepository(db);

      await repo.markAllAsRead(currentUserId);

      // Mettre à jour l'état local
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err: any) {
      console.error('Erreur marquage toutes notifications:', err);
    }
  }, [currentUserId]);

  /**
   * Supprimer une notification
   */
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const db = await getDatabase();
      const repo = new MarketplaceNotificationRepository(db);

      await repo.delete(notificationId);

      // Mettre à jour l'état local
      const notification = notifications.find((n) => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err: any) {
      console.error('Erreur suppression notification:', err);
    }
  }, [notifications]);

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

