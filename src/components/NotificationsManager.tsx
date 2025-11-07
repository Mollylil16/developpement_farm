/**
 * Composant pour gérer les notifications locales
 * S'active automatiquement quand l'application démarre
 */

import React from 'react';
import { useNotifications } from '../hooks/useNotifications';

export default function NotificationsManager() {
  // Le hook gère automatiquement la planification des notifications
  useNotifications();

  // Ce composant ne rend rien, il sert juste à activer le hook
  return null;
}

