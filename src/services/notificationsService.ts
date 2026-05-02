import apiClient from './api/apiClient';
import { logger } from '../utils/logger';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedType?: string;
  relatedId?: string;
  actionUrl?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

// ========================================
// NOTIFICATIONS PUSH LOCALES (EXPO)
// ========================================

/**
 * Configure les permissions et le canal de notifications
 */
export async function configureNotifications(): Promise<void> {
  try {
    // Dans Expo Go, les notifications peuvent ne pas fonctionner
    // On simule juste la configuration pour éviter les erreurs
    logger.info('[notifications] Configuration des notifications simulée (Expo Go)');

    // En production avec un build natif, on pourrait faire :
    // const { status } = await Notifications.requestPermissionsAsync();
    // if (status !== 'granted') {
    //   throw new Error('Permissions de notifications refusées');
    // }

  } catch (error) {
    logger.warn('[notifications] Configuration échouée:', error);
    // Ne pas throw l'erreur pour éviter de bloquer l'app
  }
}

/**
 * Planifie les alertes de gestation
 */
export async function scheduleGestationAlerts(gestations: any[]): Promise<void> {
  try {
    if (!Array.isArray(gestations) || gestations.length === 0) {
      return;
    }

    logger.info(`[notifications] Planification d'alertes pour ${gestations.length} gestations`);

    // Simulation - en production on planifierait vraiment les notifications
    // pour les dates importantes (mise-bas, etc.)

  } catch (error) {
    logger.error('[notifications] Erreur planification gestations:', error);
  }
}

/**
 * Planifie les rappels de tâches
 */
export async function scheduleTaskReminders(tasks: any[]): Promise<void> {
  try {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return;
    }

    logger.info(`[notifications] Planification de rappels pour ${tasks.length} tâches`);

    // Simulation - en production on planifierait vraiment les notifications
    // pour les dates d'échéance

  } catch (error) {
    logger.error('[notifications] Erreur planification tâches:', error);
  }
}

/**
 * Planifie les alertes de stock
 */
export async function scheduleStockAlerts(stocks: any[]): Promise<void> {
  try {
    if (!Array.isArray(stocks) || stocks.length === 0) {
      return;
    }

    logger.info(`[notifications] Planification d'alertes pour ${stocks.length} stocks`);

    // Simulation - en production on planifierait vraiment les notifications
    // pour les seuils de stock bas

  } catch (error) {
    logger.error('[notifications] Erreur planification stocks:', error);
  }
}

/**
 * Nettoie les notifications obsolètes
 */
export async function cleanupObsoleteNotifications(gestations: any[] = [], tasks: any[] = []): Promise<void> {
  try {
    logger.info(`[notifications] Nettoyage des notifications obsolètes (${gestations.length} gestations, ${tasks.length} tâches)`);

    // Simulation - en production on annulerait vraiment les notifications
    // qui ne sont plus pertinentes (gestations terminées, tâches effectuées, etc.)

  } catch (error) {
    logger.error('[notifications] Erreur nettoyage notifications:', error);
    // L'erreur vide `{}` venait probablement d'ici
  }
}

/**
 * Annule toutes les notifications planifiées
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    logger.info('[notifications] Annulation de toutes les notifications');

    // Simulation - en production on annulerait vraiment toutes les notifications
    // Notifications.cancelAllScheduledNotificationsAsync();

  } catch (error) {
    logger.error('[notifications] Erreur annulation notifications:', error);
  }
}

export const notificationsService = {
  async getNotifications(unreadOnly: boolean = false): Promise<Notification[]> {
    try {
      const response = await apiClient.get(
        `/marketplace/notifications?unreadOnly=${unreadOnly}`
      );
      return response.data;
    } catch (error) {
      logger.error('[notifications] Erreur récupération:', error);
      throw error;
    }
  },

  async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get('/marketplace/notifications/unread-count');
      return response.data.unreadCount;
    } catch (error) {
      logger.error('[notifications] Erreur comptage:', error);
      return 0;
    }
  },

  async markAsRead(notificationIds: string[]): Promise<void> {
    try {
      await apiClient.patch('/marketplace/notifications/mark-read', {
        notificationIds,
      });
    } catch (error) {
      logger.error('[notifications] Erreur marquage lu:', error);
      throw error;
    }
  },

  async markAllAsRead(): Promise<void> {
    try {
      await apiClient.patch('/marketplace/notifications/mark-all-read');
    } catch (error) {
      logger.error('[notifications] Erreur marquage tous lus:', error);
      throw error;
    }
  },

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await apiClient.delete(`/marketplace/notifications/${notificationId}`);
    } catch (error) {
      logger.error('[notifications] Erreur suppression:', error);
      throw error;
    }
  },
};