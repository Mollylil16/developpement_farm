/**
 * Icône cloche avec badge de notifications non lues
 * Pour l'en-tête de l'application
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';

interface MarketplaceBellIconProps {
  unreadCount: number;
  onPress: () => void;
  size?: number;
  color?: string;
}

export default function MarketplaceBellIcon({
  unreadCount,
  onPress,
  size = 24,
  color = MarketplaceTheme.colors.text,
}: MarketplaceBellIconProps) {
  const { colors, spacing, typography } = MarketplaceTheme;

  const displayCount = unreadCount > 99 ? '99+' : unreadCount.toString();
  const hasUnread = unreadCount > 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={hasUnread ? 'notifications' : 'notifications-outline'}
          size={size}
          color={color}
        />

        {/* Badge */}
        {hasUnread && (
          <View style={[styles.badge, { backgroundColor: colors.error }]}>
            <Text style={[styles.badgeText, { color: colors.textInverse }]}>
              {displayCount}
            </Text>
          </View>
        )}

        {/* Indicateur pulse (animation) */}
        {hasUnread && (
          <View
            style={[
              styles.pulse,
              {
                backgroundColor: colors.error,
              },
            ]}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: MarketplaceTheme.spacing.xs,
  },
  iconContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: MarketplaceTheme.colors.background,
    ...MarketplaceTheme.shadows.small,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
    lineHeight: 12,
  },
  pulse: {
    position: 'absolute',
    top: -6,
    right: -8,
    width: 18,
    height: 18,
    borderRadius: 9,
    opacity: 0.3,
    // Animation à implémenter avec Reanimated si nécessaire
  },
});

