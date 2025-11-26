/**
 * Carte de notification Marketplace
 * Avec icônes, couleurs, et actions contextuelles
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import { formatDate } from '../../utils/formatters';
import type { Notification } from '../../types/marketplace';

interface NotificationCardProps {
  notification: Notification;
  onPress: () => void;
  onMarkAsRead?: () => void;
}

type NotificationType =
  | 'new_listing'
  | 'new_offer'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'delivery_confirmed'
  | 'transaction_completed'
  | 'new_message'
  | 'rating_received';

const NOTIFICATION_CONFIG: Record<
  NotificationType,
  {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bgColor: string;
  }
> = {
  new_listing: {
    icon: 'storefront',
    color: MarketplaceTheme.colors.primary,
    bgColor: MarketplaceTheme.colors.primary + '15',
  },
  new_offer: {
    icon: 'pricetag',
    color: MarketplaceTheme.colors.accent,
    bgColor: MarketplaceTheme.colors.accent + '15',
  },
  offer_accepted: {
    icon: 'checkmark-circle',
    color: MarketplaceTheme.colors.success,
    bgColor: MarketplaceTheme.colors.success + '15',
  },
  offer_rejected: {
    icon: 'close-circle',
    color: MarketplaceTheme.colors.error,
    bgColor: MarketplaceTheme.colors.error + '15',
  },
  delivery_confirmed: {
    icon: 'car',
    color: MarketplaceTheme.colors.primary,
    bgColor: MarketplaceTheme.colors.primary + '15',
  },
  transaction_completed: {
    icon: 'shield-checkmark',
    color: MarketplaceTheme.colors.success,
    bgColor: MarketplaceTheme.colors.success + '15',
  },
  new_message: {
    icon: 'chatbubble',
    color: MarketplaceTheme.colors.accent,
    bgColor: MarketplaceTheme.colors.accent + '15',
  },
  rating_received: {
    icon: 'star',
    color: MarketplaceTheme.colors.gold,
    bgColor: MarketplaceTheme.colors.gold + '15',
  },
};

export default function NotificationCard({
  notification,
  onPress,
  onMarkAsRead,
}: NotificationCardProps) {
  const { colors, spacing, typography, borderRadius } = MarketplaceTheme;

  const config =
    NOTIFICATION_CONFIG[notification.type as NotificationType] ||
    NOTIFICATION_CONFIG.new_message;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: notification.read ? colors.surface : colors.primary + '05',
          borderLeftColor: notification.read ? colors.divider : colors.primary,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Icône */}
      <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon} size={24} color={config.color} />
      </View>

      {/* Contenu */}
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              fontWeight: notification.read
                ? typography.fontWeights.medium
                : typography.fontWeights.bold,
            },
          ]}
          numberOfLines={2}
        >
          {notification.title}
        </Text>

        {notification.body && (
          <Text
            style={[styles.body, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {notification.body}
          </Text>
        )}

        <Text style={[styles.timestamp, { color: colors.textLight }]}>
          {formatDate(notification.createdAt, 'relative')}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {/* Indicateur non lu */}
        {!notification.read && (
          <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
        )}

        {/* Bouton marquer comme lu */}
        {!notification.read && onMarkAsRead && (
          <TouchableOpacity
            style={styles.markReadButton}
            onPress={(e) => {
              e.stopPropagation();
              onMarkAsRead();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="checkmark" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Chevron */}
        <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    borderLeftWidth: 3,
    gap: MarketplaceTheme.spacing.md,
    ...MarketplaceTheme.shadows.small,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    lineHeight: 20,
  },
  body: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    lineHeight: 18,
  },
  timestamp: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  markReadButton: {
    padding: 4,
  },
});

