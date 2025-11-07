/**
 * Service de notifications locales
 * Planifie et gère les notifications pour les événements importants
 */

import * as Notifications from 'expo-notifications';

export interface NotificationConfig {
  title: string;
  body: string;
  data?: any;
  sound?: boolean;
  priority?: 'min' | 'low' | 'default' | 'high' | 'max';
}

/**
 * Configure le comportement des notifications
 */
export async function configureNotifications(): Promise<void> {
  try {
    // Vérifier si on est dans Expo Go (limitations connues)
    const isExpoGo = __DEV__ && !(global as any).expo?.modules?.expo?.modules?.ExpoModulesCore;
    
    // Configurer le comportement des notifications
    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Demander les permissions (fonctionne dans Expo Go pour les notifications locales)
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      // En mode développement avec Expo Go, on ne lance pas d'erreur
      if (isExpoGo) {
        console.warn('Notifications: Les permissions ne sont pas accordées. Les notifications locales peuvent ne pas fonctionner dans Expo Go.');
        return;
      }
      throw new Error('Les permissions de notification n\'ont pas été accordées');
    }
  } catch (error: any) {
    // En mode développement, on log l'erreur sans la lancer
    if (__DEV__) {
      console.warn('Notifications: Erreur lors de la configuration (peut être normal dans Expo Go):', error?.message || error);
      return;
    }
    console.error('Erreur lors de la configuration des notifications:', error);
    throw error;
  }
}

/**
 * Annule toutes les notifications planifiées
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error: any) {
    console.error('Erreur lors de l\'annulation des notifications:', error);
  }
}

/**
 * Planifie une notification pour une date spécifique
 */
export async function scheduleNotification(
  date: Date,
  config: NotificationConfig
): Promise<string> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: config.title,
        body: config.body,
        data: config.data || {},
        sound: config.sound !== false,
        priority: config.priority || 'default',
      },
      trigger: {
        date: date,
      },
    });

    return notificationId;
  } catch (error: any) {
    console.error('Erreur lors de la planification de la notification:', error);
    throw error;
  }
}

/**
 * Planifie une notification pour une gestation proche
 */
export async function scheduleGestationAlert(
  gestationId: string,
  truieNom: string,
  dateMiseBas: Date,
  daysUntil: number
): Promise<string | null> {
  try {
    // Planifier une notification pour le jour J à 8h du matin
    const notificationDate = new Date(dateMiseBas);
    notificationDate.setHours(8, 0, 0, 0);

    // Ne planifier que si la date est dans le futur
    if (notificationDate <= new Date()) {
      return null;
    }

    const notificationId = await scheduleNotification(notificationDate, {
      title: '🐷 Mise bas proche !',
      body: `La truie ${truieNom} devrait mettre bas dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`,
      data: {
        type: 'gestation',
        gestationId,
        action: 'open_gestation',
      },
      priority: daysUntil <= 3 ? 'high' : 'default',
    });

    return notificationId;
  } catch (error: any) {
    console.error('Erreur lors de la planification de l\'alerte de gestation:', error);
    return null;
  }
}

/**
 * Planifie des notifications pour toutes les gestations proches
 */
export async function scheduleGestationAlerts(gestations: any[]): Promise<void> {
  try {
    // Annuler les anciennes notifications de gestations
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const gestationNotifications = allNotifications.filter(
      (n: any) => n.content?.data?.type === 'gestation'
    );
    
    for (const notification of gestationNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }

    // Planifier les nouvelles notifications
    const maintenant = new Date();
    
    for (const gestation of gestations) {
      if (gestation.statut !== 'en_cours') continue;

      const dateMiseBas = new Date(gestation.date_mise_bas_prevue);
      const daysUntil = Math.ceil(
        (dateMiseBas.getTime() - maintenant.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Planifier pour les gestations dans les 7 prochains jours
      if (daysUntil > 0 && daysUntil <= 7) {
        await scheduleGestationAlert(
          gestation.id,
          gestation.truie_nom || 'truie',
          dateMiseBas,
          daysUntil
        );
      }
    }
  } catch (error: any) {
    console.error('Erreur lors de la planification des alertes de gestations:', error);
  }
}

/**
 * Planifie une notification pour un stock faible
 */
export async function scheduleStockAlert(
  stockId: string,
  stockNom: string,
  quantite: number,
  seuil: number
): Promise<string | null> {
  try {
    // Planifier une notification immédiate pour les stocks critiques
    const notificationDate = new Date();
    notificationDate.setMinutes(notificationDate.getMinutes() + 1); // Dans 1 minute

    const notificationId = await scheduleNotification(notificationDate, {
      title: '⚠️ Stock faible !',
      body: `Le stock de ${stockNom} est faible : ${quantite} (seuil: ${seuil})`,
      data: {
        type: 'stock',
        stockId,
        action: 'open_stocks',
      },
      priority: 'high',
    });

    return notificationId;
  } catch (error: any) {
    console.error('Erreur lors de la planification de l\'alerte de stock:', error);
    return null;
  }
}

/**
 * Planifie une notification pour une tâche planifiée
 */
export async function scheduleTaskReminder(
  taskId: string,
  taskTitle: string,
  dueDate: Date,
  reminderHours: number = 24
): Promise<string | null> {
  try {
    // Planifier une notification X heures avant l'échéance
    const reminderDate = new Date(dueDate);
    reminderDate.setHours(reminderDate.getHours() - reminderHours);

    // Ne planifier que si la date est dans le futur
    if (reminderDate <= new Date()) {
      return null;
    }

    const notificationId = await scheduleNotification(reminderDate, {
      title: '📅 Rappel de tâche',
      body: `La tâche "${taskTitle}" est prévue pour ${reminderHours}h`,
      data: {
        type: 'task',
        taskId,
        action: 'open_planification',
      },
      priority: 'default',
    });

    return notificationId;
  } catch (error: any) {
    console.error('Erreur lors de la planification du rappel de tâche:', error);
    return null;
  }
}

/**
 * Planifie des notifications pour les tâches à venir
 */
export async function scheduleTaskReminders(tasks: any[]): Promise<void> {
  try {
    // Annuler les anciennes notifications de tâches
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const taskNotifications = allNotifications.filter(
      (n: any) => n.content?.data?.type === 'task'
    );
    
    for (const notification of taskNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }

    // Planifier les nouvelles notifications
    const maintenant = new Date();
    
    for (const task of tasks) {
      if (task.statut !== 'a_faire') continue;

      const dueDate = new Date(task.date_echeance);
      
      // Ne planifier que pour les tâches futures
      if (dueDate <= maintenant) continue;

      // Planifier un rappel 24h avant
      await scheduleTaskReminder(task.id, task.titre, dueDate, 24);
      
      // Planifier un rappel 1h avant si la tâche est importante
      if (task.priorite === 'haute' || task.type === 'urgent') {
        await scheduleTaskReminder(task.id, task.titre, dueDate, 1);
      }
    }
  } catch (error: any) {
    console.error('Erreur lors de la planification des rappels de tâches:', error);
  }
}

/**
 * Obtient toutes les notifications planifiées
 */
export async function getAllScheduledNotifications(): Promise<any[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error: any) {
    console.error('Erreur lors de la récupération des notifications:', error);
    return [];
  }
}

/**
 * Annule une notification spécifique
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error: any) {
    console.error('Erreur lors de l\'annulation de la notification:', error);
  }
}

