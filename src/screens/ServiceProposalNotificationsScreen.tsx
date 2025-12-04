/**
 * Écran pour afficher les notifications de propositions de services
 * Accessible depuis le Dashboard pour les producteurs et vétérinaires
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useRole } from '../contexts/RoleContext';
import { useTheme } from '../contexts/ThemeContext';
import { getServiceProposalNotificationService } from '../services/ServiceProposalNotificationService';
import type { ServiceProposalNotification } from '../services/ServiceProposalNotificationService';
import { SPACING, FONT_SIZES, FONT_WEIGHTS, BORDER_RADIUS } from '../constants/theme';
import Card from '../components/Card';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';

const ServiceProposalNotificationsScreen: React.FC = () => {
  const { currentUser } = useRole();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<ServiceProposalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      setLoading(true);
      const notificationService = await getServiceProposalNotificationService();
      const allNotifications = await notificationService.getAllNotifications(currentUser.id);
      // Trier par date (plus récentes en premier)
      const sorted = allNotifications.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setNotifications(sorted);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  const handleNotificationPress = async (notification: ServiceProposalNotification) => {
    if (!currentUser?.id) return;

    // Marquer comme lue
    const notificationService = await getServiceProposalNotificationService();
    await notificationService.markAsRead(currentUser.id, notification.id);

    // Recharger les notifications
    await loadNotifications();

    // Navigation selon le type
    if (notification.type === 'service_proposal_received' && notification.farmId) {
      // TODO: Naviguer vers l'écran de gestion des propositions pour cette ferme
      // navigation.navigate(SCREENS.FARM_SERVICE_PROPOSALS, { farmId: notification.farmId });
    } else if (
      (notification.type === 'service_proposal_accepted' ||
        notification.type === 'service_proposal_rejected') &&
      notification.farmId
    ) {
      // TODO: Naviguer vers l'écran des clients pour voir la ferme
      // navigation.navigate(SCREENS.MY_CLIENTS);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser?.id) return;

    const notificationService = await getServiceProposalNotificationService();
    await notificationService.markAllAsRead(currentUser.id);
    await loadNotifications();
  };

  const getNotificationIcon = (type: ServiceProposalNotification['type']) => {
    switch (type) {
      case 'service_proposal_received':
        return 'mail';
      case 'service_proposal_accepted':
        return 'checkmark-circle';
      case 'service_proposal_rejected':
        return 'close-circle';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: ServiceProposalNotification['type']) => {
    switch (type) {
      case 'service_proposal_received':
        return colors.primary;
      case 'service_proposal_accepted':
        return colors.success;
      case 'service_proposal_rejected':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Propositions de services
          </Text>
        </View>
        {notifications.length > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
          >
            <Text style={[styles.markAllText, { color: colors.primary }]}>Tout marquer</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <EmptyState
          icon="notifications-off"
          title="Aucune notification"
          message="Vous n'avez pas encore de notifications"
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationCard
              notification={item}
              colors={colors}
              onPress={() => handleNotificationPress(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const NotificationCard: React.FC<{
  notification: ServiceProposalNotification;
  colors: any;
  onPress: () => void;
}> = ({ notification, colors, onPress }) => {
  const icon = notification.type === 'service_proposal_received' ? 'mail' :
    notification.type === 'service_proposal_accepted' ? 'checkmark-circle' : 'close-circle';
  const iconColor = notification.type === 'service_proposal_received' ? colors.primary :
    notification.type === 'service_proposal_accepted' ? colors.success : colors.error;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card
        style={[
          styles.notificationCard,
          {
            backgroundColor: notification.read ? colors.surface : colors.primary + '08',
            borderColor: colors.border,
            borderLeftWidth: 4,
            borderLeftColor: iconColor,
          },
        ]}
      >
        <View style={styles.notificationContent}>
          <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
            <Ionicons name={icon} size={24} color={iconColor} />
          </View>
          <View style={styles.notificationText}>
            <Text style={[styles.notificationMessage, { color: colors.text }]}>
              {notification.message}
            </Text>
            <Text style={[styles.notificationDate, { color: colors.textSecondary }]}>
              {format(new Date(notification.createdAt), 'd MMM yyyy à HH:mm', { locale: fr })}
            </Text>
          </View>
          {!notification.read && (
            <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
  },
  markAllButton: {
    padding: SPACING.xs,
  },
  markAllText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  notificationCard: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  notificationText: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    marginBottom: SPACING.xs,
  },
  notificationDate: {
    fontSize: FONT_SIZES.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: SPACING.sm,
  },
});

export default ServiceProposalNotificationsScreen;

