/**
 * Panel de notifications dropdown pour le Marketplace
 * Affiche les notifications avec onglets et actions rapides
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import type { Notification, NotificationType } from '../../types/marketplace';
import NotificationCard from './NotificationCard';
import { formatDate } from '../../utils/formatters';

interface NotificationPanelProps {
  visible: boolean;
  notifications: Notification[];
  unreadCount: number;
  onClose: () => void;
  onNotificationPress: (notification: Notification) => void;
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (notificationId: string) => void;
}

type TabType = 'all' | 'offers' | 'messages' | 'system';

const NOTIFICATION_TYPES_BY_TAB: Record<TabType, NotificationType[]> = {
  all: [
    'offer_received',
    'offer_accepted',
    'offer_rejected',
    'message_received',
    'delivery_confirmed',
    'rating_received',
    'delivery_reminder',
    'payment_reminder',
    'appointment_requested',
    'appointment_accepted',
    'appointment_rejected',
    'appointment_cancelled',
    'appointment_reminder',
  ],
  offers: ['offer_received', 'offer_accepted', 'offer_rejected'],
  messages: ['message_received'],
  system: [
    'delivery_confirmed',
    'rating_received',
    'delivery_reminder',
    'payment_reminder',
    'appointment_requested',
    'appointment_accepted',
    'appointment_rejected',
    'appointment_cancelled',
    'appointment_reminder',
  ],
};

export default function NotificationPanel({
  visible,
  notifications,
  unreadCount,
  onClose,
  onNotificationPress,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
}: NotificationPanelProps) {
  const { colors, spacing, typography, borderRadius, shadows } = MarketplaceTheme;
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  // Filtrer les notifications par onglet
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') {
      return notifications;
    }
    const allowedTypes = NOTIFICATION_TYPES_BY_TAB[activeTab];
    return notifications.filter((n) => allowedTypes.includes(n.type));
  }, [notifications, activeTab]);

  // Compter les non lues par onglet
  const unreadCountByTab = useMemo(() => {
    const counts: Record<TabType, number> = {
      all: unreadCount,
      offers: 0,
      messages: 0,
      system: 0,
    };

    notifications.forEach((n) => {
      if (!n.read) {
        if (NOTIFICATION_TYPES_BY_TAB.offers.includes(n.type)) counts.offers++;
        if (NOTIFICATION_TYPES_BY_TAB.messages.includes(n.type)) counts.messages++;
        if (NOTIFICATION_TYPES_BY_TAB.system.includes(n.type)) counts.system++;
      }
    });

    return counts;
  }, [notifications, unreadCount]);

  // Animation d'ouverture
  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  });

  const opacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const handleNotificationPress = (notification: Notification) => {
    // Marquer comme lu automatiquement
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    onNotificationPress(notification);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View
          style={[
            styles.panel,
            {
              backgroundColor: colors.surfaceSolid || '#FFFFFF',
              transform: [{ translateY }],
              opacity,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.divider, backgroundColor: colors.surfaceSolid || '#FFFFFF' }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={onMarkAllAsRead} style={styles.markAllButton}>
                  <Text style={[styles.markAllText, { color: colors.primary }]}>Tout lire</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Onglets */}
          <View style={[styles.tabs, { borderBottomColor: colors.divider, backgroundColor: colors.surfaceSolid || '#FFFFFF' }]}>
            {(['all', 'offers', 'messages', 'system'] as TabType[]).map((tab) => {
              const count = unreadCountByTab[tab];
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tab,
                    isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                  ]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: isActive ? colors.primary : colors.textSecondary,
                        fontWeight: isActive
                          ? typography.fontWeights.bold
                          : typography.fontWeights.medium,
                      },
                    ]}
                  >
                    {tab === 'all' && 'Toutes'}
                    {tab === 'offers' && 'Offres'}
                    {tab === 'messages' && 'Messages'}
                    {tab === 'system' && 'Système'}
                  </Text>
                  {count > 0 && (
                    <View style={[styles.tabBadge, { backgroundColor: colors.error }]}>
                      <Text style={[styles.tabBadgeText, { color: colors.textInverse }]}>
                        {count > 99 ? '99+' : count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Liste des notifications */}
          <ScrollView
            style={[styles.list, { backgroundColor: colors.surfaceSolid || '#FFFFFF' }]}
            contentContainerStyle={[
              styles.listContent,
              filteredNotifications.length === 0 && styles.listContentEmpty
            ]}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {filteredNotifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-off-outline" size={64} color={colors.textLight || colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Aucune notification
                </Text>
              </View>
            ) : (
              filteredNotifications.map((notification) => (
                <View key={notification.id} style={styles.notificationItem}>
                  <NotificationCard
                    notification={notification}
                    onPress={() => handleNotificationPress(notification)}
                    onMarkAsRead={() => onMarkAsRead(notification.id)}
                  />
                </View>
              ))
            )}
          </ScrollView>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const { width } = Dimensions.get('window');
const PANEL_WIDTH = Math.min(400, width - 40);
const PANEL_HEIGHT = Math.min(600, Dimensions.get('window').height * 0.8);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 60,
  },
  panel: {
    width: PANEL_WIDTH,
    minHeight: 300, // ✅ Hauteur minimum pour afficher le contenu
    maxHeight: PANEL_HEIGHT,
    borderRadius: MarketplaceTheme.borderRadius.lg,
    ...MarketplaceTheme.shadows.large,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.sm,
  },
  markAllButton: {
    paddingHorizontal: MarketplaceTheme.spacing.sm,
    paddingVertical: MarketplaceTheme.spacing.xs,
  },
  markAllText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.medium,
  },
  closeButton: {
    padding: MarketplaceTheme.spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: MarketplaceTheme.spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: MarketplaceTheme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: MarketplaceTheme.spacing.xs,
  },
  tabText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  list: {
    flex: 1,
    minHeight: 200,
    flexGrow: 1, // ✅ S'assurer que le ScrollView prend l'espace disponible
  },
  listContent: {
    padding: MarketplaceTheme.spacing.sm,
    gap: MarketplaceTheme.spacing.sm,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationItem: {
    marginBottom: MarketplaceTheme.spacing.xs,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: MarketplaceTheme.spacing.xl * 2,
  },
  emptyText: {
    marginTop: MarketplaceTheme.spacing.md,
    fontSize: MarketplaceTheme.typography.fontSizes.md,
  },
});
