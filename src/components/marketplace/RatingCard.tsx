/**
 * Carte d'affichage d'une notation
 * Avec détails critères et badge "Achat vérifié"
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import { formatDate } from '../../utils/formatters';
import type { ProducerRating } from '../../types/marketplace';

interface RatingCardProps {
  rating: ProducerRating;
  compact?: boolean;
}

export default function RatingCard({ rating, compact = false }: RatingCardProps) {
  const { colors, spacing, typography, borderRadius } = MarketplaceTheme;

  const [expanded, setExpanded] = useState(false);

  const averageScore = rating.overall.toFixed(1);

  const renderStars = (score: number, size: number = 16) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= score ? 'star' : 'star-outline'}
            size={size}
            color={star <= score ? colors.gold : colors.textLight}
          />
        ))}
      </View>
    );
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.compactHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Ionicons name="person" size={20} color={colors.textInverse} />
          </View>
          <View style={styles.compactInfo}>
            <Text style={[styles.buyerName, { color: colors.text }]}>Acheteur</Text>
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {formatDate(rating.createdAt)}
            </Text>
          </View>

          <View style={styles.compactScore}>
            {renderStars(parseFloat(averageScore), 14)}
            <Text style={[styles.scoreNumber, { color: colors.gold }]}>{averageScore}</Text>
          </View>
        </View>

        {rating.comment && (
          <Text style={[styles.comment, { color: colors.text }]} numberOfLines={2}>
            {rating.comment}
          </Text>
        )}

        {rating.verifiedPurchase && (
          <View style={[styles.verifiedBadge, { backgroundColor: colors.success + '15' }]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={[styles.verifiedText, { color: colors.success }]}>Achat vérifié</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Ionicons name="person" size={24} color={colors.textInverse} />
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.headerRow}>
            <Text style={[styles.buyerName, { color: colors.text }]}>Acheteur</Text>
            {rating.verifiedPurchase && (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.success + '15' }]}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={[styles.verifiedText, { color: colors.success }]}>Achat vérifié</Text>
              </View>
            )}
          </View>

          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {formatDate(rating.createdAt)}
          </Text>
        </View>
      </View>

      {/* Score moyen */}
      <View style={styles.scoreSection}>
        {renderStars(parseFloat(averageScore), 20)}
        <Text style={[styles.scoreText, { color: colors.gold }]}>{averageScore} / 5</Text>
      </View>

      {/* Détails critères (expandable) */}
      <TouchableOpacity
        style={styles.criteriaToggle}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={[styles.criteriaToggleText, { color: colors.primary }]}>
          {expanded ? 'Masquer les détails' : 'Voir les détails'}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.primary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.criteriaDetails, { backgroundColor: colors.surfaceLight }]}>
          <View style={styles.criteriaRow}>
            <Text style={[styles.criteriaLabel, { color: colors.textSecondary }]}>Qualité</Text>
            {renderStars(rating.ratings.quality, 14)}
          </View>
          <View style={styles.criteriaRow}>
            <Text style={[styles.criteriaLabel, { color: colors.textSecondary }]}>
              Professionnalisme
            </Text>
            {renderStars(rating.ratings.professionalism, 14)}
          </View>
          <View style={styles.criteriaRow}>
            <Text style={[styles.criteriaLabel, { color: colors.textSecondary }]}>Ponctualité</Text>
            {renderStars(rating.ratings.timeliness, 14)}
          </View>
          <View style={styles.criteriaRow}>
            <Text style={[styles.criteriaLabel, { color: colors.textSecondary }]}>
              Communication
            </Text>
            {renderStars(rating.ratings.communication, 14)}
          </View>
        </View>
      )}

      {/* Commentaire */}
      {rating.comment && (
        <Text style={[styles.comment, { color: colors.text }]}>{rating.comment}</Text>
      )}

      {/* Photos */}
      {rating.photos && rating.photos.length > 0 && (
        <View style={styles.photosContainer}>
          {rating.photos.slice(0, 3).map((photo, index) => (
            <Image key={index} source={{ uri: photo }} style={styles.photo} resizeMode="cover" />
          ))}
          {rating.photos.length > 3 && (
            <View style={[styles.morePhotos, { backgroundColor: colors.surfaceLight }]}>
              <Text style={[styles.morePhotosText, { color: colors.text }]}>
                +{rating.photos.length - 3}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    ...MarketplaceTheme.shadows.small,
  },
  compactContainer: {
    padding: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.sm,
    ...MarketplaceTheme.shadows.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.sm,
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.xs,
    marginBottom: MarketplaceTheme.spacing.xs,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  compactInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.xs,
    marginBottom: 2,
  },
  buyerName: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  date: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: MarketplaceTheme.spacing.xs,
    paddingVertical: 2,
    borderRadius: MarketplaceTheme.borderRadius.xs,
  },
  verifiedText: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.sm,
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  compactScore: {
    alignItems: 'flex-end',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  scoreText: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  scoreNumber: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
    marginTop: 2,
  },
  criteriaToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: MarketplaceTheme.spacing.xs,
  },
  criteriaToggleText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  criteriaDetails: {
    padding: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.sm,
    gap: MarketplaceTheme.spacing.xs,
    marginTop: MarketplaceTheme.spacing.xs,
  },
  criteriaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  criteriaLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
  },
  comment: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    lineHeight: 22,
    marginTop: MarketplaceTheme.spacing.sm,
  },
  photosContainer: {
    flexDirection: 'row',
    gap: MarketplaceTheme.spacing.xs,
    marginTop: MarketplaceTheme.spacing.sm,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: MarketplaceTheme.borderRadius.sm,
  },
  morePhotos: {
    width: 80,
    height: 80,
    borderRadius: MarketplaceTheme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
});
