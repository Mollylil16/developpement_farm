/**
 * Carte de notification Marketplace
 * Avec icônes, couleurs, et actions contextuelles
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
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
  | 'offer_received'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'offer_countered'
  | 'offer_withdrawn'
  | 'delivery_confirmed'
  | 'transaction_completed'
  | 'new_message'
  | 'rating_received'
  | 'listing_sold'
  | 'listing_expired'
  // ✅ Nouveaux types pour notifications enrichies
  | 'sale_confirmed_buyer'
  | 'sale_confirmed_producer';

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
  offer_received: {
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
  offer_countered: {
    icon: 'swap-horizontal',
    color: MarketplaceTheme.colors.warning,
    bgColor: MarketplaceTheme.colors.warning + '15',
  },
  offer_withdrawn: {
    icon: 'arrow-undo',
    color: MarketplaceTheme.colors.textSecondary,
    bgColor: MarketplaceTheme.colors.textSecondary + '15',
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
  listing_sold: {
    icon: 'cash',
    color: MarketplaceTheme.colors.success,
    bgColor: MarketplaceTheme.colors.success + '15',
  },
  listing_expired: {
    icon: 'time',
    color: MarketplaceTheme.colors.textSecondary,
    bgColor: MarketplaceTheme.colors.textSecondary + '15',
  },
  // ✅ Notifications enrichies pour vente confirmée
  sale_confirmed_buyer: {
    icon: 'checkmark-done-circle',
    color: MarketplaceTheme.colors.success,
    bgColor: MarketplaceTheme.colors.success + '15',
  },
  sale_confirmed_producer: {
    icon: 'cash',
    color: MarketplaceTheme.colors.success,
    bgColor: MarketplaceTheme.colors.success + '15',
  },
};

// ✅ Composant pour afficher les données enrichies
interface EnrichedDataProps {
  data: NonNullable<Notification['data']>;
  colors: typeof MarketplaceTheme.colors;
}

function EnrichedNotificationData({ data, colors }: EnrichedDataProps) {
  const handlePhonePress = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmailPress = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleMapsPress = (url: string) => {
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Erreur', "Impossible d'ouvrir Google Maps");
      }
    });
  };

  return (
    <View style={styles.enrichedData}>
      {/* Contact du producteur (pour l'acheteur) */}
      {data.producer && (
        <View style={styles.contactSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>📞 Contact producteur:</Text>
          <Text style={[styles.contactName, { color: colors.text }]}>{data.producer.name}</Text>
          {data.producer.phone && (
            <TouchableOpacity 
              onPress={() => handlePhonePress(data.producer!.phone!)}
              style={styles.contactButton}
            >
              <Ionicons name="call" size={14} color={colors.primary} />
              <Text style={[styles.contactText, { color: colors.primary }]}>{data.producer.phone}</Text>
            </TouchableOpacity>
          )}
          {data.producer.email && (
            <TouchableOpacity 
              onPress={() => handleEmailPress(data.producer!.email!)}
              style={styles.contactButton}
            >
              <Ionicons name="mail" size={14} color={colors.primary} />
              <Text style={[styles.contactText, { color: colors.primary }]}>{data.producer.email}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Localisation de la ferme (pour l'acheteur) */}
      {data.farm && (
        <View style={styles.farmSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>📍 Localisation:</Text>
          <Text style={[styles.farmName, { color: colors.text }]}>{data.farm.name}</Text>
          <Text style={[styles.farmAddress, { color: colors.textSecondary }]}>
            {data.farm.address}, {data.farm.city}
          </Text>
          {data.farm.googleMapsUrl && (
            <TouchableOpacity 
              onPress={() => handleMapsPress(data.farm!.googleMapsUrl!)}
              style={[styles.mapsButton, { backgroundColor: colors.primary + '15' }]}
            >
              <Ionicons name="navigate" size={16} color={colors.primary} />
              <Text style={[styles.mapsButtonText, { color: colors.primary }]}>Ouvrir dans Google Maps</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Contact de l'acheteur (pour le producteur) */}
      {data.buyer && (
        <View style={styles.contactSection}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>👤 Contact acheteur:</Text>
          <Text style={[styles.contactName, { color: colors.text }]}>{data.buyer.name}</Text>
          {data.buyer.phone && (
            <TouchableOpacity 
              onPress={() => handlePhonePress(data.buyer!.phone!)}
              style={styles.contactButton}
            >
              <Ionicons name="call" size={14} color={colors.primary} />
              <Text style={[styles.contactText, { color: colors.primary }]}>{data.buyer.phone}</Text>
            </TouchableOpacity>
          )}
          {data.buyer.email && (
            <TouchableOpacity 
              onPress={() => handleEmailPress(data.buyer!.email!)}
              style={styles.contactButton}
            >
              <Ionicons name="mail" size={14} color={colors.primary} />
              <Text style={[styles.contactText, { color: colors.primary }]}>{data.buyer.email}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Date de récupération */}
      {data.pickupDate && (
        <Text style={[styles.pickupDate, { color: colors.accent }]}>
          📅 Récupération: {data.pickupDate}
        </Text>
      )}
    </View>
  );
}

export default function NotificationCard({
  notification,
  onPress,
  onMarkAsRead,
}: NotificationCardProps) {
  const { colors, spacing, typography, borderRadius } = MarketplaceTheme;

  const config =
    NOTIFICATION_CONFIG[notification.type as NotificationType] || NOTIFICATION_CONFIG.new_message;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: notification.read
            ? colors.surfaceSolid || '#FFFFFF'
            : colors.primary + '08',
          borderLeftColor: notification.read ? colors.divider : colors.primary,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Icône */}
      <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
        <Ionicons testID="notification-icon" name={config.icon} size={24} color={config.color} />
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

        {/* Afficher body ou message comme texte secondaire */}
        {(notification.body || notification.message) && (
          <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={3}>
            {notification.body || notification.message}
          </Text>
        )}

        {/* ✅ Affichage des données enrichies pour SALE_CONFIRMED */}
        {notification.data && (notification.type === 'sale_confirmed_buyer' || notification.type === 'sale_confirmed_producer') && (
          <EnrichedNotificationData data={notification.data} colors={colors} />
        )}

        <Text style={[styles.timestamp, { color: colors.textLight }]}>
          {formatDate(notification.createdAt, 'relative')}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {/* Indicateur non lu */}
        {!notification.read && (
          <View
            testID="unread-badge"
            style={[styles.unreadDot, { backgroundColor: colors.primary }]}
          />
        )}

        {/* Bouton marquer comme lu */}
        {!notification.read && onMarkAsRead && (
          <TouchableOpacity
            testID="mark-read-button"
            style={styles.markReadButton}
            onPress={(e) => {
              if (e && typeof e.stopPropagation === 'function') {
                e.stopPropagation();
              }
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
    alignItems: 'flex-start', // Changed from 'center' to accommodate enriched data
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
  // ✅ Styles pour données enrichies
  enrichedData: {
    marginTop: MarketplaceTheme.spacing.sm,
    paddingTop: MarketplaceTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: MarketplaceTheme.colors.divider,
    gap: MarketplaceTheme.spacing.sm,
  },
  contactSection: {
    gap: 2,
  },
  farmSection: {
    gap: 2,
  },
  sectionLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold as any,
  },
  contactName: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.medium as any,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  contactText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
  },
  farmName: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.medium as any,
  },
  farmAddress: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: MarketplaceTheme.borderRadius.sm,
    marginTop: 4,
  },
  mapsButtonText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold as any,
  },
  pickupDate: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.medium as any,
  },
});
