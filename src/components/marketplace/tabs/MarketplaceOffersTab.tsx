/**
 * Onglet "Offres" du Marketplace
 * Affiche les offres reçues et envoyées
 */

import React, { useState } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAppSelector } from '../../../store/hooks';
import { getDatabase } from '../../../services/database';
import { getMarketplaceService } from '../../../services/MarketplaceService';
import { MarketplaceTheme } from '../../../styles/marketplace.theme';
import EmptyState from '../../EmptyState';
import type { Offer } from '../../../types/marketplace';
import { getErrorMessage } from '../../../types/errors';

interface MarketplaceOffersTabProps {
  receivedOffers: Offer[];
  sentOffers: Offer[];
  loading: boolean;
  onRefresh: () => void;
}

export default function MarketplaceOffersTab({
  receivedOffers,
  sentOffers,
  loading,
  onRefresh,
}: MarketplaceOffersTabProps) {
  const marketplaceColors = MarketplaceTheme.colors;
  const { user } = useAppSelector((state) => state.auth);
  const [offersTab, setOffersTab] = useState<'received' | 'sent'>('received');

  const handleAcceptOffer = async (offerId: string) => {
    try {
      const db = await getDatabase();
      const service = getMarketplaceService(db);
      if (!user?.id) return;
      await service.acceptOffer(offerId, user.id);
      Alert.alert('Succès', 'Offre acceptée');
      onRefresh();
    } catch (error) {
      Alert.alert('Erreur', getErrorMessage(error));
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    try {
      const db = await getDatabase();
      const service = getMarketplaceService(db);
      if (!user?.id) return;
      await service.rejectOffer(offerId, user.id);
      Alert.alert('Succès', 'Offre refusée');
      onRefresh();
    } catch (error) {
      Alert.alert('Erreur', getErrorMessage(error));
    }
  };

  const handleWithdrawOffer = async (offerId: string) => {
    Alert.alert(
      'Retirer l\'offre',
      'Êtes-vous sûr de vouloir retirer cette offre ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = await getDatabase();
              const service = getMarketplaceService(db);
              if (!user?.id) return;
              await service.withdrawOffer(offerId, user.id);
              Alert.alert('Succès', 'Offre retirée');
              onRefresh();
            } catch (error) {
              Alert.alert('Erreur', getErrorMessage(error));
            }
          },
        },
      ]
    );
  };

  const currentOffers = offersTab === 'received' ? receivedOffers : sentOffers;

  const renderItem = ({ item }: { item: Offer }) => {
    const isPending = item.status === 'pending';
    const statusColor =
      item.status === 'accepted'
        ? marketplaceColors.success
        : item.status === 'rejected'
        ? marketplaceColors.error
        : item.status === 'countered'
        ? marketplaceColors.warning
        : marketplaceColors.primary;

    const statusLabel =
      item.status === 'accepted'
        ? 'Acceptée'
        : item.status === 'rejected'
        ? 'Refusée'
        : item.status === 'countered'
        ? 'Contre-offre'
        : 'En attente';

    return (
      <View style={[styles.card, { backgroundColor: marketplaceColors.surface, borderColor: marketplaceColors.border }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
            {isPending && offersTab === 'received' && (
              <View style={[styles.newBadge, { backgroundColor: marketplaceColors.error }]}>
                <Text style={[styles.newBadgeText, { color: marketplaceColors.textInverse }]}>Nouvelle</Text>
              </View>
            )}
          </View>
          <Text style={[styles.date, { color: marketplaceColors.textSecondary }]}>
            {format(new Date(item.createdAt), 'd MMM yyyy à HH:mm', { locale: fr })}
          </Text>
        </View>

        <View style={styles.content}>
          <Text style={[styles.subjectCount, { color: marketplaceColors.text }]}>
            {item.subjectIds?.length || 0} sujet{item.subjectIds?.length > 1 ? 's' : ''}
          </Text>
          <Text style={[styles.price, { color: marketplaceColors.primary }]}>
            Offre: {item.proposedPrice.toLocaleString()} FCFA
          </Text>
          {item.originalPrice && (
            <Text style={[styles.originalPrice, { color: marketplaceColors.textSecondary }]}>
              Prix suggéré: {item.originalPrice.toLocaleString()} FCFA
            </Text>
          )}
          {item.message && (
            <Text style={[styles.message, { color: marketplaceColors.text }]}>"{item.message}"</Text>
          )}
        </View>

        {isPending && offersTab === 'received' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: marketplaceColors.success }]}
              onPress={() => handleAcceptOffer(item.id)}
            >
              <Text style={[styles.actionText, { color: marketplaceColors.textInverse }]}>✅ Accepter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: marketplaceColors.error }]}
              onPress={() => handleRejectOffer(item.id)}
            >
              <Text style={[styles.actionText, { color: marketplaceColors.textInverse }]}>❌ Refuser</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: marketplaceColors.primary }]}
              onPress={() => {
                Alert.alert('Chat', 'Ouvrir le chat avec l\'acheteur');
              }}
            >
              <Text style={[styles.actionText, { color: marketplaceColors.textInverse }]}>💬 Chat</Text>
            </TouchableOpacity>
          </View>
        )}

        {isPending && offersTab === 'sent' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: marketplaceColors.error }]}
              onPress={() => handleWithdrawOffer(item.id)}
            >
              <Text style={[styles.actionText, { color: marketplaceColors.textInverse }]}>🗑️ Retirer mon offre</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Sous-onglets */}
      <View style={[styles.tabs, { backgroundColor: marketplaceColors.surface }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            offersTab === 'received' && [styles.activeTab, { borderBottomColor: marketplaceColors.primary }],
          ]}
          onPress={() => setOffersTab('received')}
        >
          <Text
            style={[
              styles.tabText,
              { color: offersTab === 'received' ? marketplaceColors.primary : marketplaceColors.textSecondary },
            ]}
          >
            Reçues ({receivedOffers.length})
          </Text>
          {receivedOffers.filter((o) => o.status === 'pending').length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: marketplaceColors.error }]}>
              <Text style={[styles.tabBadgeText, { color: marketplaceColors.textInverse }]}>
                {receivedOffers.filter((o) => o.status === 'pending').length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            offersTab === 'sent' && [styles.activeTab, { borderBottomColor: marketplaceColors.primary }],
          ]}
          onPress={() => setOffersTab('sent')}
        >
          <Text
            style={[
              styles.tabText,
              { color: offersTab === 'sent' ? marketplaceColors.primary : marketplaceColors.textSecondary },
            ]}
          >
            Envoyées ({sentOffers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste des offres */}
      <FlatList
        data={currentOffers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            colors={[marketplaceColors.primary]}
            tintColor={marketplaceColors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title={offersTab === 'received' ? 'Aucune offre reçue' : 'Aucune offre envoyée'}
            message={
              offersTab === 'received'
                ? "Vous n'avez pas encore reçu d'offres pour vos annonces."
                : "Vous n'avez pas encore envoyé d'offres."
            }
            icon="mail-outline"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  newBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
  },
  content: {
    marginBottom: 12,
  },
  subjectCount: {
    fontSize: 14,
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 14,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

