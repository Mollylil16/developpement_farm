/**
 * Onglet "Mes annonces" pour les acheteurs
 * Affiche leurs demandes d'achat avec statuts et offres reçues
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
import type { PurchaseRequest, PurchaseRequestOffer } from '../../../types/marketplace';
import { getDatabase } from '../../../services/database';
import { getPurchaseRequestService } from '../../../services/PurchaseRequestService';
import { PurchaseRequestRepository } from '../../../database/repositories/PurchaseRequestRepository';

interface MarketplaceMyPurchaseRequestsTabProps {
  buyerId: string;
  onRequestPress?: (request: PurchaseRequest) => void;
  onEditRequest?: (request: PurchaseRequest) => void;
}

const STATUS_COLORS: Record<string, string> = {
  published: '#3B82F6',
  fulfilled: '#22C55E',
  expired: '#EF4444',
  archived: '#6B7280',
  cancelled: '#F59E0B',
};

const STATUS_LABELS: Record<string, string> = {
  published: 'En cours',
  fulfilled: 'Pourvu',
  expired: 'Expiré',
  archived: 'Archivé',
  cancelled: 'Annulé',
};

export default function MarketplaceMyPurchaseRequestsTab({
  buyerId,
  onRequestPress,
  onEditRequest,
}: MarketplaceMyPurchaseRequestsTabProps) {
  const { colors } = MarketplaceTheme;
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      const db = await getDatabase();
      const repo = new PurchaseRequestRepository(db);
      const allRequests = await repo.findByBuyerId(buyerId, false);
      setRequests(allRequests);
    } catch (error) {
      console.error('Erreur chargement demandes:', error);
      Alert.alert('Erreur', 'Impossible de charger vos demandes d\'achat');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buyerId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadRequests();
  }, [loadRequests]);

  const handleArchive = useCallback(async (requestId: string) => {
    Alert.alert(
      'Archiver la demande',
      'Êtes-vous sûr de vouloir archiver cette demande ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Archiver',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              const repo = new PurchaseRequestRepository(db);
              await repo.archive(requestId);
              loadRequests();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible d\'archiver la demande');
            }
          },
        },
      ]
    );
  }, [loadRequests]);

  const handleRestore = useCallback(async (requestId: string) => {
    try {
      const db = await getDatabase();
      const repo = new PurchaseRequestRepository(db);
      await repo.restore(requestId);
      loadRequests();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de restaurer la demande');
    }
  }, [loadRequests]);

  const handleEdit = useCallback((request: PurchaseRequest) => {
    console.log('🔄 [MarketplaceMyPurchaseRequestsTab] handleEdit appelé pour:', request.id);
    if (onEditRequest) {
      console.log('✅ [MarketplaceMyPurchaseRequestsTab] Appel de onEditRequest');
      onEditRequest(request);
    } else {
      console.warn('⚠️ [MarketplaceMyPurchaseRequestsTab] onEditRequest n\'est pas défini');
      Alert.alert('Modifier', `Modification de la demande: ${request.title}`, [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Modifier',
          onPress: () => {
            Alert.alert('Info', 'La fonctionnalité de modification sera bientôt disponible');
          },
        },
      ]);
    }
  }, [onEditRequest]);

  const renderRequest = ({ item }: { item: PurchaseRequest }) => {
    const statusColor = STATUS_COLORS[item.status] || colors.textSecondary;
    const statusLabel = STATUS_LABELS[item.status] || item.status;

    return (
      <TouchableOpacity
        style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => onRequestPress?.(item)}
        activeOpacity={0.7}
      >
        <View style={styles.requestHeader}>
          <View style={styles.requestTitleRow}>
            <Text style={[styles.requestTitle, { color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.requestDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="paw" size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              {item.race} • {item.quantity} tête{item.quantity > 1 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="scale" size={16} color={colors.textSecondary} />
            <Text style={[styles.detailText, { color: colors.text }]}>
              {item.minWeight}-{item.maxWeight} kg
            </Text>
          </View>

          {item.maxPricePerKg && (
            <View style={styles.detailRow}>
              <Ionicons name="cash" size={16} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.text }]}>
                Max: {item.maxPricePerKg.toLocaleString()} FCFA/kg
              </Text>
            </View>
          )}

          {item.deliveryLocation?.city && (
            <View style={styles.detailRow}>
              <Ionicons name="location" size={16} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.text }]}>
                {item.deliveryLocation.city}
                {item.deliveryLocation.region && `, ${item.deliveryLocation.region}`}
                {item.deliveryLocation.radiusKm && ` (${item.deliveryLocation.radiusKm} km)`}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.requestFooter}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="eye" size={14} color={colors.textSecondary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>{item.views}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="people" size={14} color={colors.textSecondary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {item.matchedProducersCount} producteur{item.matchedProducersCount > 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="mail" size={14} color={colors.textSecondary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {item.offersCount} offre{item.offersCount > 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            {item.offersCount > 0 && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => onRequestPress?.(item)}
              >
                <Text style={[styles.actionButtonText, { color: colors.textOnPrimary }]}>
                  Voir les offres ({item.offersCount})
                </Text>
              </TouchableOpacity>
            )}
            {item.status !== 'archived' && item.status !== 'fulfilled' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => handleEdit(item)}
              >
                <Ionicons name="create" size={16} color={colors.textOnPrimary} />
                <Text style={[styles.actionButtonText, { color: colors.textOnPrimary }]}> Modifier</Text>
              </TouchableOpacity>
            )}
            {item.status === 'archived' ? (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.success }]}
                onPress={() => handleRestore(item.id)}
              >
                <Ionicons name="refresh" size={16} color={colors.textOnPrimary} />
                <Text style={[styles.actionButtonText, { color: colors.textOnPrimary }]}> Restaurer</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.error }]}
                onPress={() => handleArchive(item.id)}
              >
                <Ionicons name="archive" size={16} color={colors.textOnPrimary} />
                <Text style={[styles.actionButtonText, { color: colors.textOnPrimary }]}> Archiver</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            Créé le {format(new Date(item.createdAt), 'dd MMM yyyy', { locale: fr })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement...</Text>
      </View>
    );
  }

  if (requests.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucune demande d'achat</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Créez votre première demande d'achat pour trouver des producteurs correspondants
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={requests}
      renderItem={renderRequest}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      ListEmptyComponent={
        <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
          <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucune demande d'achat</Text>
        </View>
      }
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
  requestCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...MarketplaceTheme.shadows.small,
  },
  requestHeader: {
    marginBottom: SPACING.sm,
  },
  requestTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  requestTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requestDetails: {
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
  requestFooter: {
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
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    marginTop: SPACING.xs,
  },
});

