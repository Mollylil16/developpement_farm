/**
 * Carte de Listing Unifiée pour le Marketplace
 * Gère l'affichage des listings individuels et par bande de manière cohérente
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MarketplaceListing } from '../../types/marketplace';
import { MarketplaceTheme, glassmorphismStyle, badgeStyle } from '../../styles/marketplace.theme';
import { formatPrice } from '../../services/PricingService';

interface UnifiedListingCardProps {
  listing: MarketplaceListing;
  onPress: () => void;
  selected?: boolean;
  selectable?: boolean;
  onSelect?: () => void;
}

function UnifiedListingCard({
  listing,
  onPress,
  selected = false,
  selectable = false,
  onSelect,
}: UnifiedListingCardProps) {
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
    if (selectable && onSelect) {
      onSelect();
    } else {
      onPress();
    }
  };

  const isBatch = listing.listingType === 'batch';
  const isAvailable = listing.status === 'available';

  // Rendu conditionnel selon le type de listing
  if (isBatch) {
    return (
      <BatchListingContent
        listing={listing}
        fadeAnim={fadeAnim}
        slideAnim={slideAnim}
        selected={selected}
        selectable={selectable}
        handlePress={handlePress}
        isAvailable={isAvailable}
        colors={colors}
      />
    );
  } else {
    return (
      <IndividualListingContent
        listing={listing}
        fadeAnim={fadeAnim}
        slideAnim={slideAnim}
        selected={selected}
        selectable={selectable}
        handlePress={handlePress}
        isAvailable={isAvailable}
        colors={colors}
      />
    );
  }
}

/**
 * Contenu pour listing de bande
 */
function BatchListingContent({
  listing,
  fadeAnim,
  slideAnim,
  selected,
  selectable,
  handlePress,
  isAvailable,
  colors,
}: any) {
  const pigCount = listing.pigCount || listing.pigIds?.length || 0;
  const averageWeight = listing.weight || 0;
  const totalWeight = averageWeight * pigCount;

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.container,
          glassmorphismStyle(false),
          selected && { borderColor: colors.primary, borderWidth: 2.5 },
          !isAvailable && !selected && { opacity: 0.6 },
        ]}
        onPress={handlePress}
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
            <View style={[badgeStyle('primary'), { marginRight: 8 }]}>
              <Ionicons name="people" size={14} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>Bande</Text>
            </View>
            {/* Badge "Nouveau" si le listing a été créé dans les 7 derniers jours */}
            {(() => {
              const now = Date.now();
              const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
              const listedAt = new Date(listing.listedAt || listing.updatedAt || 0).getTime();
              const isNew = listedAt >= sevenDaysAgo;
              return isNew ? (
                <View style={[badgeStyle('new'), { marginLeft: 8 }]}>
                  <Ionicons name="sparkles" size={12} color={colors.success} />
                  <Text style={[styles.badgeText, { color: colors.success }]}>Nouveau</Text>
                </View>
              ) : null;
            })()}
            {!isAvailable && (
              <View style={[badgeStyle('warning')]}>
                <Text style={[styles.badgeText, { color: colors.warning }]}>
                  {listing.status === 'sold' ? 'Vendu' : 'Indisponible'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.pricePerKg}>{formatPrice(listing.pricePerKg)}/kg</Text>
        </View>

        {/* Statistiques principales */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={20} color={colors.primary} />
            <Text style={styles.statValue}>{pigCount}</Text>
            <Text style={styles.statLabel}>Sujets</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="speedometer-outline" size={20} color={colors.secondary} />
            <Text style={styles.statValue}>{averageWeight.toFixed(0)} kg</Text>
            <Text style={styles.statLabel}>Poids moy.</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="bar-chart-outline" size={20} color={colors.accent} />
            <Text style={styles.statValue}>{totalWeight.toFixed(0)} kg</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Prix total */}
        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Prix total</Text>
            <Text style={[styles.totalPrice, { color: colors.primary }]}>
              {formatPrice(listing.calculatedPrice || listing.pricePerKg * totalWeight)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </View>

        {/* Localisation */}
        {listing.location?.city && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.locationText}>
              {listing.location.city}
              {listing.location.region && `, ${listing.location.region}`}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * Contenu pour listing individuel
 */
function IndividualListingContent({
  listing,
  fadeAnim,
  slideAnim,
  selected,
  selectable,
  handlePress,
  isAvailable,
  colors,
}: any) {
  // Extraire les détails de l'animal (si disponibles)
  const animalCode = listing.animalDetails?.code || listing.subjectId || 'N/A';
  const race = listing.animalDetails?.race || 'Race inconnue';
  const age = listing.animalDetails?.age_jours
    ? `${Math.floor(listing.animalDetails.age_jours / 30)} mois`
    : 'N/A';
  const healthStatus = listing.animalDetails?.healthStatus || 'good';

  // Couleur et icône du statut de santé
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'good':
        return colors.success;
      case 'attention':
        return colors.warning;
      case 'critical':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getHealthIcon = (status: string): any => {
    switch (status) {
      case 'good':
        return 'checkmark-circle';
      case 'attention':
        return 'alert-circle';
      case 'critical':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.container,
          glassmorphismStyle(false),
          selected && { borderColor: colors.primary, borderWidth: 2.5 },
          !isAvailable && !selected && { opacity: 0.6 },
        ]}
        onPress={handlePress}
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

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[badgeStyle('secondary'), { marginRight: 8 }]}>
              <Ionicons name="paw" size={14} color={colors.secondary} />
              <Text style={[styles.badgeText, { color: colors.secondary }]}>Individuel</Text>
            </View>
            {/* Badge "Nouveau" si le listing a été créé dans les 7 derniers jours */}
            {(() => {
              const now = Date.now();
              const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
              const listedAt = new Date(listing.listedAt || listing.updatedAt || 0).getTime();
              const isNew = listedAt >= sevenDaysAgo;
              return isNew ? (
                <View style={[badgeStyle('new'), { marginLeft: 8 }]}>
                  <Ionicons name="sparkles" size={12} color={colors.success} />
                  <Text style={[styles.badgeText, { color: colors.success }]}>Nouveau</Text>
                </View>
              ) : null;
            })()}
            {!isAvailable && (
              <View style={[badgeStyle('warning')]}>
                <Text style={[styles.badgeText, { color: colors.warning }]}>
                  {listing.status === 'sold' ? 'Vendu' : 'Indisponible'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.pricePerKg}>{formatPrice(listing.pricePerKg)}/kg</Text>
        </View>

        {/* Informations de l'animal */}
        <View style={styles.animalInfo}>
          <Text style={styles.animalCode}>{animalCode}</Text>
          <Text style={styles.animalRace}>{race}</Text>
        </View>

        {/* Statistiques */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.statValue}>{age}</Text>
            <Text style={styles.statLabel}>Âge</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="speedometer-outline" size={18} color={colors.secondary} />
            <Text style={styles.statValue}>{(listing.weight || 0).toFixed(0)} kg</Text>
            <Text style={styles.statLabel}>Poids</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons
              name={getHealthIcon(healthStatus)}
              size={18}
              color={getHealthColor(healthStatus)}
            />
            <Text style={[styles.statValue, { color: getHealthColor(healthStatus) }]}>
              {healthStatus === 'good' ? 'Bon' : healthStatus === 'attention' ? 'Attention' : 'Critique'}
            </Text>
            <Text style={styles.statLabel}>Santé</Text>
          </View>
        </View>

        {/* Prix total */}
        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Prix total</Text>
            <Text style={[styles.totalPrice, { color: colors.primary }]}>
              {formatPrice(listing.calculatedPrice || listing.pricePerKg * (listing.weight || 0))}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </View>

        {/* Localisation */}
        {listing.location?.city && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.locationText}>
              {listing.location.city}
              {listing.location.region && `, ${listing.location.region}`}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: MarketplaceTheme.spacing.md,
    padding: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.lg,
  },
  checkboxContainer: {
    position: 'absolute',
    top: MarketplaceTheme.spacing.sm,
    right: MarketplaceTheme.spacing.sm,
    zIndex: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
    marginLeft: 4,
  },
  pricePerKg: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
    color: MarketplaceTheme.colors.text,
  },
  animalInfo: {
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  animalCode: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
    color: MarketplaceTheme.colors.text,
  },
  animalRace: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    color: MarketplaceTheme.colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: MarketplaceTheme.colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
    color: MarketplaceTheme.colors.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    color: MarketplaceTheme.colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: MarketplaceTheme.spacing.sm,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    color: MarketplaceTheme.colors.textSecondary,
    marginBottom: 2,
  },
  totalPrice: {
    fontSize: MarketplaceTheme.typography.fontSizes.xl,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: MarketplaceTheme.spacing.xs,
  },
  locationText: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    color: MarketplaceTheme.colors.textSecondary,
    marginLeft: 4,
  },
});

// Mémoïser le composant pour éviter les re-renders inutiles dans les FlatList
export default React.memo(UnifiedListingCard);

