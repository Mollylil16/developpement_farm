/**
 * Onglet pour les producteurs : Demandes d'acheteurs correspondant à leurs lots
 * Affiche les demandes d'achat qui matchent les listings du producteur
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../../styles/marketplace.theme';
import { SPACING } from '../../../constants/theme';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { PurchaseRequestMatch, PurchaseRequest } from '../../../types/marketplace';
import { getDatabase } from '../../../services/database';
import { getPurchaseRequestService } from '../../../services/PurchaseRequestService';
import { PurchaseRequestMatchRepository } from '../../../database/repositories/PurchaseRequestRepository';
import { PurchaseRequestRepository } from '../../../database/repositories/PurchaseRequestRepository';

interface MarketplaceMatchedRequestsTabProps {
  producerId: string;
  onRequestPress?: (request: PurchaseRequest, match: PurchaseRequestMatch) => void;
  onMakeOffer?: (request: PurchaseRequest, match: PurchaseRequestMatch) => void;
}

export default function MarketplaceMatchedRequestsTab({
  producerId,
  onRequestPress,
  onMakeOffer,
}: MarketplaceMatchedRequestsTabProps) {
  const { colors } = MarketplaceTheme;
  const [matches, setMatches] = useState<Array<{ match: PurchaseRequestMatch; request: PurchaseRequest }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMatches = useCallback(async () => {
    try {
      const db = await getDatabase();
      const matchRepo = new PurchaseRequestMatchRepository(db);
      const requestRepo = new PurchaseRequestRepository(db);

      // Récupérer tous les matches du producteur
      const allMatches = await matchRepo.findByProducerId(producerId);

      // Enrichir avec les détails des demandes
      const enrichedMatches = await Promise.all(
        allMatches.map(async (match) => {
          const request = await requestRepo.findById(match.purchaseRequestId);
          return { match, request: request! };
        })
      );

      // Filtrer uniquement les demandes publiées
      const activeMatches = enrichedMatches.filter(
        (item) => item.request && item.request.status === 'published'
      );

      // Trier par score de match décroissant
      activeMatches.sort((a, b) => (b.match.matchScore || 0) - (a.match.matchScore || 0));

      setMatches(activeMatches);
    } catch (error) {
      console.error('Erreur chargement matches:', error);
      Alert.alert('Erreur', 'Impossible de charger les demandes correspondantes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [producerId]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadMatches();
  }, [loadMatches]);

  const renderMatch = ({ item }: { item: { match: PurchaseRequestMatch; request: PurchaseRequest } }) => {
    const { match, request } = item;
    const matchScore = match.matchScore || 0;

    return (
      <TouchableOpacity
        style={[styles.matchCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => onRequestPress?.(request, match)}
        activeOpacity={0.7}
      >
        <View style={styles.matchHeader}>
          <View style={styles.matchTitleRow}>
            <Text style={[styles.matchTitle, { color: colors.text }]} numberOfLines={2}>
              {request.title}
            </Text>
            <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(matchScore) + '20' }]}>
              <Text style={[styles.scoreText, { color: getScoreColor(matchScore) }]}>
                {matchScore}% match
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.matchDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="paw" size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              {request.race} • {request.quantity} tête{request.quantity > 1 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="scale" size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              Poids souhaité: {request.minWeight}-{request.maxWeight} kg
            </Text>
          </View>

          {request.maxPricePerKg && (
            <View style={styles.detailRow}>
              <Ionicons name="cash" size={16} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.text }]}>
                Prix max: {request.maxPricePerKg.toLocaleString()} FCFA/kg
              </Text>
            </View>
          )}

          {request.deliveryLocation?.city && (
            <View style={styles.detailRow}>
              <Ionicons name="location" size={16} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.text }]}>
                {request.deliveryLocation.city}
                {request.deliveryLocation.region && `, ${request.deliveryLocation.region}`}
              </Text>
            </View>
          )}

          {request.message && (
            <View style={styles.messageContainer}>
              <Text style={[styles.messageText, { color: colors.textSecondary }]} numberOfLines={2}>
                {request.message}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.matchFooter}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="mail" size={14} color={colors.textSecondary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {request.offersCount} offre{request.offersCount > 1 ? 's' : ''} reçue{request.offersCount > 1 ? 's' : ''}
              </Text>
            </View>
            {request.deliveryDate && (
              <View style={styles.statItem}>
                <Ionicons name="calendar" size={14} color={colors.textSecondary} />
                <Text style={[styles.statText, { color: colors.textSecondary }]}>
                  {format(new Date(request.deliveryDate), 'dd MMM', { locale: fr })}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.offerButton, { backgroundColor: colors.primary }]}
            onPress={() => onMakeOffer?.(request, match)}
          >
            <Ionicons name="send" size={16} color={colors.textOnPrimary} />
            <Text style={[styles.offerButtonText, { color: colors.textOnPrimary }]}> Faire une offre</Text>
          </TouchableOpacity>

          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            Demandé le {format(new Date(request.createdAt), 'dd MMM yyyy', { locale: fr })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#22C55E'; // Vert
    if (score >= 60) return '#3B82F6'; // Bleu
    if (score >= 40) return '#F59E0B'; // Orange
    return '#EF4444'; // Rouge
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement...</Text>
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="search-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucune demande correspondante</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Aucun acheteur n'a encore publié de demande correspondant à vos annonces. Vos annonces seront automatiquement proposées aux acheteurs correspondants.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={matches}
      renderItem={renderMatch}
      keyExtractor={(item) => item.match.id}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  listContent: {
    padding: SPACING.md,
  },
  matchCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...MarketplaceTheme.shadows.small,
  },
  matchHeader: {
    marginBottom: SPACING.sm,
  },
  matchTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  matchTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  scoreBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '600',
  },
  matchDetails: {
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  detailText: {
    fontSize: 14,
  },
  messageContainer: {
    marginTop: SPACING.xs,
    padding: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  messageText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  matchFooter: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statText: {
    fontSize: 12,
  },
  offerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.xs,
  },
  offerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    marginTop: SPACING.xs,
  },
});

