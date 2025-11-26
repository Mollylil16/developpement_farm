/**
 * Carte de Ferme pour le Marketplace
 * Affiche les informations d'une ferme avec ses sujets disponibles
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FarmCard as FarmCardType } from '../../types/marketplace';
import { MarketplaceTheme, cardStyle } from '../../styles/marketplace.theme';

interface FarmCardProps {
  farm: FarmCardType;
  distance?: number | null;
  onPress: () => void;
  onConditionsPress?: () => void;
}

export default function FarmCard({
  farm,
  distance,
  onPress,
  onConditionsPress,
}: FarmCardProps) {
  const { colors, spacing, typography, borderRadius, shadows } = MarketplaceTheme;

  // Couleur du badge de distance selon la proximité
  const getDistanceBadgeColor = (dist: number) => {
    if (dist <= 20) return colors.success;
    if (dist <= 50) return colors.warning;
    return colors.textSecondary;
  };

  // Afficher les étoiles de notation
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Ionicons key={i} name="star" size={14} color={colors.gold} />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Ionicons key={i} name="star-half" size={14} color={colors.gold} />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={14} color={colors.textLight} />);
      }
    }

    return stars;
  };

  return (
    <TouchableOpacity
      style={[styles.container, cardStyle(false)]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header avec photo et badges */}
      <View style={styles.header}>
        {/* Photo de la ferme */}
        <View style={styles.photoContainer}>
          {farm.photoUrl ? (
            <Image source={{ uri: farm.photoUrl }} style={styles.photo} />
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: colors.surfaceLight }]}>
              <Ionicons name="business" size={32} color={colors.textSecondary} />
            </View>
          )}
          
          {/* Badge "Nouveau" */}
          {farm.isNew && (
            <View style={[styles.newBadge, { backgroundColor: colors.badgeNew }]}>
              <Text style={[styles.newBadgeText, { color: colors.textInverse }]}>
                Nouveau
              </Text>
            </View>
          )}
        </View>

        {/* Infos principales */}
        <View style={styles.headerInfo}>
          <Text
            style={[styles.farmName, { color: colors.text }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {farm.name}
          </Text>

          {/* Localisation */}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.locationText, { color: colors.textSecondary }]}>
              {farm.location.city || farm.location.region}
            </Text>
            {distance !== null && distance !== undefined && (
              <View
                style={[
                  styles.distanceBadge,
                  { backgroundColor: getDistanceBadgeColor(distance) },
                ]}
              >
                <Text style={[styles.distanceText, { color: colors.textInverse }]}>
                  {distance < 1 ? '<1' : Math.round(distance)} km
                </Text>
              </View>
            )}
          </View>

          {/* Rating */}
          <View style={styles.ratingRow}>
            {renderStars(farm.averageRating)}
            <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
              {farm.averageRating.toFixed(1)} ({farm.stats.totalRatings})
            </Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="paw" size={20} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {farm.totalSubjects}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Sujets
          </Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name="scale-outline" size={20} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {farm.totalWeight} kg
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Poids total
          </Text>
        </View>

        <View style={styles.statItem}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {farm.stats.completionRate}%
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Fiabilité
          </Text>
        </View>
      </View>

      {/* Footer avec bouton conditions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.conditionsButton}
          onPress={(e) => {
            e.stopPropagation();
            onConditionsPress?.();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="information-circle-outline" size={16} color={colors.info} />
          <Text style={[styles.conditionsText, { color: colors.info }]}>
            Conditions de vente
          </Text>
        </TouchableOpacity>

        <View style={styles.chevron}>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: MarketplaceTheme.spacing.md,
    marginHorizontal: MarketplaceTheme.spacing.md,
    marginVertical: MarketplaceTheme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  photoContainer: {
    position: 'relative',
    marginRight: MarketplaceTheme.spacing.md,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: MarketplaceTheme.borderRadius.md,
  },
  photoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: MarketplaceTheme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: MarketplaceTheme.borderRadius.sm,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  farmName: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  locationText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    flex: 1,
  },
  distanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: MarketplaceTheme.borderRadius.sm,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    marginLeft: 4,
  },
  divider: {
    height: 1,
    marginVertical: MarketplaceTheme.spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  statLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conditionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  conditionsText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.medium,
  },
  chevron: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

