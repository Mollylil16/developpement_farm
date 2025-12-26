/**
 * Carte de Ferme pour le Marketplace
 * Affiche les informations d'une ferme avec ses sujets disponibles
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Share,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FarmCard as FarmCardType } from '../../types/marketplace';
import { MarketplaceTheme, glassmorphismStyle } from '../../styles/marketplace.theme';
import { formatDate } from '../../utils/formatters';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import apiClient from '../../services/api/apiClient';
import { loadUserFromStorageThunk } from '../../store/slices/authSlice';
import { logger } from '../../utils/logger';

interface FarmCardProps {
  farm: FarmCardType;
  distance?: number | null;
  onPress: () => void;
  onConditionsPress?: () => void;
  onFavoriteChange?: (farmId: string, isFavorite: boolean) => void;
}

export default function FarmCard({
  farm,
  distance,
  onPress,
  onConditionsPress,
  onFavoriteChange,
}: FarmCardProps) {
  const { colors, spacing, typography, borderRadius, shadows, animations } = MarketplaceTheme;
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

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

  // Vérifier si la ferme est dans les favoris
  useEffect(() => {
    if (user?.saved_farms) {
      setIsFavorite(user.saved_farms.includes(farm.farmId));
    }
  }, [user?.saved_farms, farm.farmId]);

  // Fonction de partage
  const handleShare = async () => {
    try {
      const locationText = farm.location.city
        ? `${farm.location.city}${farm.location.region ? `, ${farm.location.region}` : ''}`
        : farm.location.region || 'Localisation non disponible';

      const totalSubjects = farm.totalSubjects || farm.aggregatedData?.totalSubjectsForSale || 0;

      const shareText = `🐖 Découvrez cette ferme porcine sur Fermier Pro

Nom : ${farm.name}
Localisation : ${locationText}
Cheptel : ${totalSubjects} sujet${totalSubjects > 1 ? 's' : ''}

Consultez la ferme via l'application Fermier Pro.
ID Ferme: ${farm.farmId}`;

      const result = await Share.share({
        message: shareText,
        title: `Ferme ${farm.name}`,
      });

      if (result.action === Share.sharedAction) {
        logger.debug('Partage réussi');
      }
    } catch (error: unknown) {
      logger.error('Erreur lors du partage:', error);
      Alert.alert('Erreur', 'Impossible de partager cette ferme');
    }
  };

  // Fonction pour toggle favori
  const handleToggleFavorite = async () => {

    if (!user?.id) {
      Alert.alert('Erreur', 'Vous devez être connecté pour sauvegarder une ferme');
      return;
    }

    if (isTogglingFavorite) return;

    try {
      setIsTogglingFavorite(true);
      // TODO: Créer un endpoint backend pour toggleSavedFarm
      // Pour l'instant, on récupère l'utilisateur, met à jour saved_farms et le renvoie
      const currentUser = await apiClient.get<any>(`/users/${user.id}`);
      const savedFarms = currentUser.saved_farms || [];
      const isCurrentlyFavorite = savedFarms.includes(farm.farmId);
      const newSavedFarms = isCurrentlyFavorite
        ? savedFarms.filter((id: string) => id !== farm.farmId)
        : [...savedFarms, farm.farmId];
      
      const updatedUser = await apiClient.patch<any>(`/users/${user.id}`, {
        saved_farms: newSavedFarms,
      });
      
      const newIsFavorite = !isCurrentlyFavorite;

      setIsFavorite(newIsFavorite);

      // Recharger l'utilisateur dans Redux
      await dispatch(loadUserFromStorageThunk());

      // Notifier le parent si callback fourni
      if (onFavoriteChange) {
        onFavoriteChange(farm.farmId, newIsFavorite);
      }
    } catch (error: unknown) {
      logger.error('Erreur lors du toggle favori:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder cette ferme');
    } finally {
      setIsTogglingFavorite(false);
    }
  };

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
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.container, glassmorphismStyle(false)]}
        onPress={onPress}
        activeOpacity={0.9}
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
                <Text style={[styles.newBadgeText, { color: colors.textInverse }]}>Nouveau</Text>
              </View>
            )}
          </View>

          {/* Infos principales */}
          <View style={styles.headerInfo}>
            {/* Ligne avec nom de la ferme et boutons d'action */}
            <View style={styles.farmNameRow}>
              <Text
                style={[styles.farmName, { color: colors.text }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {farm.name}
              </Text>
              {/* Boutons Partager et Favori - En haut à droite */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.surface + 'E6' }]}
                  onPress={handleShare}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-outline" size={20} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.surface + 'E6' }]}
                  onPress={handleToggleFavorite}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                  disabled={isTogglingFavorite}
                >
                  <Ionicons
                    name={isFavorite ? 'bookmark' : 'bookmark-outline'}
                    size={20}
                    color={isFavorite ? colors.primary : colors.text}
                  />
                </TouchableOpacity>
              </View>
            </View>

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

            {/* Producteur */}
            {farm.producerName && (
              <View style={styles.producerRow}>
                <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.producerText, { color: colors.textSecondary }]}>
                  {farm.producerName}
                </Text>
              </View>
            )}

            {/* Rating */}
            <View style={styles.ratingRow}>
              {renderStars(farm.producerRating?.overall || farm.averageRating)}
              <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                {(farm.producerRating?.overall || farm.averageRating).toFixed(1)} (
                {farm.producerRating?.totalReviews || farm.stats.totalRatings})
              </Text>
            </View>
          </View>
        </View>

        {/* Badges */}
        {(farm.badges?.isNewProducer || farm.badges?.isCertified || farm.badges?.fastResponder) && (
          <View style={styles.badgesRow}>
            {farm.badges.isNewProducer && (
              <View style={[styles.badge, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="sparkles" size={12} color={colors.success} />
                <Text style={[styles.badgeText, { color: colors.success }]}>Nouveau</Text>
              </View>
            )}
            {farm.badges.isCertified && (
              <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="checkmark-circle" size={12} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.primary }]}>Certifié</Text>
              </View>
            )}
            {farm.badges.fastResponder && (
              <View style={[styles.badge, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons name="flash" size={12} color={colors.accent} />
                <Text style={[styles.badgeText, { color: colors.accent }]}>Réponse rapide</Text>
              </View>
            )}
          </View>
        )}

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        {/* Stats avec prix */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="paw" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {farm.aggregatedData?.totalSubjectsForSale || farm.totalSubjects}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sujets</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="scale-outline" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {farm.aggregatedData?.totalWeight || farm.totalWeight} kg
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Poids total</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="cash-outline" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {farm.aggregatedData?.priceRange
                ? `${Math.round(farm.aggregatedData.priceRange.min)}-${Math.round(farm.aggregatedData.priceRange.max)}`
                : 'N/A'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>FCFA/kg</Text>
          </View>
        </View>

        {/* Races disponibles */}
        {farm.preview?.availableRaces && farm.preview.availableRaces.length > 0 && (
          <View style={styles.racesRow}>
            <Text style={[styles.racesLabel, { color: colors.textSecondary }]}>Races: </Text>
            <View style={styles.racesContainer}>
              {farm.preview.availableRaces.slice(0, 3).map((race, index) => (
                <View
                  key={index}
                  style={[styles.raceTag, { backgroundColor: colors.surfaceLight }]}
                >
                  <Text style={[styles.raceText, { color: colors.text }]}>{race}</Text>
                </View>
              ))}
              {farm.preview.availableRaces.length > 3 && (
                <Text style={[styles.raceMore, { color: colors.textSecondary }]}>
                  +{farm.preview.availableRaces.length - 3}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Dernière mise à jour */}
        {farm.lastUpdated && (
          <Text style={[styles.lastUpdated, { color: colors.textLight }]}>
            Mis à jour {formatDate(farm.lastUpdated, 'relative')}
          </Text>
        )}

        {/* Footer avec bouton conditions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.conditionsButton}
            onPress={onConditionsPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="information-circle-outline" size={16} color={colors.info} />
            <Text style={[styles.conditionsText, { color: colors.info }]}>Conditions de vente</Text>
          </TouchableOpacity>

          <View style={styles.chevron}>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
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
  farmNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: MarketplaceTheme.spacing.sm,
  },
  farmName: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
    alignSelf: 'flex-start',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: MarketplaceTheme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...MarketplaceTheme.shadows.small,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    flex: 1,
  },
  distanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: MarketplaceTheme.borderRadius.sm,
    marginTop: 2,
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
  producerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  producerText: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: MarketplaceTheme.borderRadius.round,
  },
  badgeText: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    fontWeight: MarketplaceTheme.typography.fontWeights.medium,
  },
  racesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: MarketplaceTheme.spacing.xs,
    marginBottom: MarketplaceTheme.spacing.xs,
  },
  racesLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    marginRight: 4,
  },
  racesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  raceTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: MarketplaceTheme.borderRadius.sm,
  },
  raceText: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    fontWeight: MarketplaceTheme.typography.fontWeights.medium,
  },
  raceMore: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    fontStyle: 'italic',
  },
  lastUpdated: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    marginTop: MarketplaceTheme.spacing.xs,
    textAlign: 'right',
  },
});
