/**
 * Constantes pour le système de notifications
 */

export const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled';

/**
 * Types d'actions pour les notifications
 */
export enum NotificationAction {
  OPEN_GESTATION = 'open_gestation',
  OPEN_PLANIFICATION = 'open_planification',
  OPEN_STOCKS = 'open_stocks',
  OPEN_MORTALITES = 'open_mortalites',
}

/**
 * Types de notifications
 */
export enum NotificationType {
  GESTATION = 'gestation',
  TASK = 'task',
  STOCK = 'stock',
  MORTALITE = 'mortalite',
}

/**
 * Configuration des rappels de tâches
 */
export const TASK_REMINDER_HOURS = {
  DEFAULT: 24,
  URGENT: 1,
};

/**
 * Configuration des alertes de gestations
 */
export const GESTATION_ALERT_DAYS = 7;

