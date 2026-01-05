/**
 * Carte de Listing de Bande pour le Marketplace
 * Affiche les informations d'une bande disponible à la vente
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MarketplaceListing } from '../../types/marketplace';
import { MarketplaceTheme, glassmorphismStyle, badgeStyle } from '../../styles/marketplace.theme';
import { formatPrice } from '../../services/PricingService';

// Créer le composant animé une seule fois en dehors du composant
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface BatchListingCardProps {
  listing: MarketplaceListing;
  onPress: () => void;
  selected?: boolean;
  selectable?: boolean;
  onSelect?: () => void;
}

export default function BatchListingCard({
  listing,
  onPress,
  selected = false,
  selectable = false,
  onSelect,
}: BatchListingCardProps) {
  const { colors, spacing, typography, borderRadius, animations } = MarketplaceTheme;

  // Animations glassmorphism (fade in + slide up)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: animations.duration.normal,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: animations.duration.normal,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePress = () => {
    console.log('[BatchListingCard] handlePress appelé', {
      listingId: listing.id,
      selectable,
      isAvailable: listing.status === 'available',
      hasOnSelect: !!onSelect,
      hasOnPress: !!onPress,
    });
    if (selectable && onSelect) {
      onSelect();
    } else if (onPress) {
      onPress();
    } else {
      console.warn('[BatchListingCard] Aucun handler onPress disponible');
    }
  };

  const pigCount = listing.pigCount || listing.pigIds?.length || 0;
  const averageWeight = listing.weight || 0;
  const totalWeight = averageWeight * pigCount;

  // S'assurer que le listing est disponible
  const isAvailable = listing.status === 'available';

  return (
    <AnimatedTouchable
      style={[
        styles.container,
        glassmorphismStyle(false),
        selected && { borderColor: colors.primary, borderWidth: 2.5 },
        !isAvailable && !selected && { opacity: 0.6 },
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      onPress={handlePress}
      onPressIn={() => {
        console.log('[BatchListingCard] onPressIn déclenché', {
          listingId: listing.id,
          isAvailable,
          disabled: !isAvailable,
        });
      }}
      activeOpacity={0.9}
      disabled={!isAvailable}
    >
        {/* Checkbox pour sélection multiple */}
        {selectable && (
          <View style={styles.checkboxContainer}>
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary : 'transparent',
                },
              ]}
            >
              {selected && <Ionicons name="checkmark" size={16} color={colors.textInverse} />}
            </View>
          </View>
        )}

        {/* Header avec badge "Bande" */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.batchBadge}>
              <Ionicons name="people" size={14} color={colors.primary} />
              <Text style={[styles.batchBadgeText, { color: colors.primary }]}>Bande</Text>
            </View>
            <Text style={[styles.pigCount, { color: colors.text }]}>
              {pigCount} porc{pigCount > 1 ? 's' : ''}
            </Text>
          </View>

          {/* Badge de statut */}
          {listing.status !== 'available' && (
            <View style={[badgeStyle('sold')]}>
              <Text style={[styles.badgeText, { color: colors.badgeSold }]}>
                {listing.status === 'reserved' ? 'Réservé' : 'Vendu'}
              </Text>
            </View>
          )}
        </View>

        {/* Stats principales */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Ionicons name="scale-outline" size={18} color={colors.primary} />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Poids moyen</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{averageWeight} kg</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="cube-outline" size={18} color={colors.primary} />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Poids total</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{totalWeight.toFixed(1)} kg</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Dernière pesée</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {listing.lastWeightDate
                ? new Date(listing.lastWeightDate).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'short',
                  })
                : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        {/* Prix */}
        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Prix total</Text>
            <Text style={[styles.priceValue, { color: colors.primary }]}>
              {formatPrice(listing.calculatedPrice)}
            </Text>
            <Text style={[styles.pricePerKg, { color: colors.textSecondary }]}>
              {listing.pricePerKg.toLocaleString('fr-FR')} FCFA/kg
            </Text>
          </View>

          <View style={styles.infoBadge}>
            <Ionicons name="information-circle-outline" size={16} color={colors.info} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Vente groupée
            </Text>
          </View>
        </View>
      </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: MarketplaceTheme.spacing.md,
    marginHorizontal: MarketplaceTheme.spacing.md,
    marginVertical: MarketplaceTheme.spacing.sm,
    position: 'relative',
  },
  checkboxContainer: {
    position: 'absolute',
    top: MarketplaceTheme.spacing.sm,
    right: MarketplaceTheme.spacing.sm,
    zIndex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: MarketplaceTheme.borderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: MarketplaceTheme.spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  batchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  batchBadgeText: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  pigCount: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  badgeText: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
  },
  statValue: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  divider: {
    height: 1,
    marginVertical: MarketplaceTheme.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: MarketplaceTheme.typography.fontSizes.xl,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
    marginBottom: 2,
  },
  pricePerKg: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: MarketplaceTheme.spacing.sm,
    paddingVertical: MarketplaceTheme.spacing.xs,
    backgroundColor: MarketplaceTheme.colors.surfaceLight,
    borderRadius: MarketplaceTheme.borderRadius.sm,
  },
  infoText: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    fontWeight: MarketplaceTheme.typography.fontWeights.medium,
  },
});

