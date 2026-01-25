/**
 * Composant pour gérer les notifications locales
 * S'active automatiquement quand l'application démarre
 * Gère les listeners pour la navigation automatique lors du clic sur une notification
 */

import React, { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useRole } from '../contexts/RoleContext';
import { useNotifications } from '../hooks/useNotifications';
import { SCREENS } from '../navigation/types';
import { NotificationAction } from '../constants/notifications';

export default function NotificationsManager() {
  const navigation = useNavigation<NavigationProp<any>>();
  const { activeRole } = useRole();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // Le hook gère automatiquement la planification des notifications
  useNotifications();

  useEffect(() => {
    // Listener pour les notifications reçues quand l'app est au premier plan
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('📬 Notification reçue:', notification.request.content.title);
      // Ici on pourrait afficher un toast ou mettre à jour un badge
    });

    // Listener pour les notifications sur lesquelles l'utilisateur a cliqué
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const action = data?.action;

      console.log('👆 Notification cliquée:', action, data);

      // Naviguer vers l'écran approprié selon l'action
      if (action) {
        try {
          switch (action) {
            case NotificationAction.OPEN_GESTATION:
              // Pour les vétérinaires, rediriger vers le Dashboard au lieu de Reproduction
              if (activeRole === 'veterinarian') {
                navigation.navigate('Main', { screen: SCREENS.DASHBOARD_VET });
              } else {
                navigation.navigate('Main', {
                  screen: SCREENS.REPRODUCTION,
                  params: {
                    // Optionnel: passer l'ID de la gestation pour ouvrir directement
                    initialGestationId: data?.gestationId,
                  },
                });
              }
              break;

            case NotificationAction.OPEN_PLANIFICATION:
              navigation.navigate('Main', {
                screen: SCREENS.PLANIFICATION,
                params: {
                  // Optionnel: passer l'ID de la tâche
                  initialTaskId: data?.taskId,
                },
              });
              break;

            case NotificationAction.OPEN_STOCKS:
              navigation.navigate('Main', {
                screen: SCREENS.NUTRITION,
                params: {
                  initialScreen: 'Stocks',
                  // Optionnel: passer l'ID du stock
                  initialStockId: data?.stockId,
                },
              });
              break;

            case NotificationAction.OPEN_MORTALITES:
              navigation.navigate('Main', {
                screen: SCREENS.MORTALITES,
              });
              break;

            default:
              // Par défaut, aller au Dashboard
              navigation.navigate('Main', {
                screen: SCREENS.DASHBOARD,
              });
          }
        } catch (error) {
          console.error('Erreur lors de la navigation depuis la notification:', error);
          // Fallback: aller au Dashboard
          navigation.navigate('Main', {
            screen: SCREENS.DASHBOARD,
          });
        }
      }
    });

    // Nettoyage des listeners au démontage
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [navigation]);

  // Ce composant ne rend rien, il sert juste à activer le hook et les listeners
  return null;
}
