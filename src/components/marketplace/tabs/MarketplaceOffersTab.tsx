/**
 * Onglet "Offres" du Marketplace
 * Affiche les offres reçues et envoyées
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatSafeDate } from '../../../utils/dateUtils';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import apiClient from '../../../services/api/apiClient';
import marketplaceService from '../../../services/MarketplaceService';
import { acceptOffer, rejectOffer } from '../../../store/slices/marketplaceSlice';
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

function MarketplaceOffersTab({
  receivedOffers,
  sentOffers,
  loading,
  onRefresh,
}: MarketplaceOffersTabProps) {
  const marketplaceColors = MarketplaceTheme.colors;
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [offersTab, setOffersTab] = useState<'received' | 'sent'>('received');

  // Logs sécurisés (aucune donnée sensible)
  React.useEffect(() => {
    if (__DEV__) {
      console.log('[MarketplaceOffersTab] Props reçues:', {
        receivedOffersCount: receivedOffers?.length || 0,
        sentOffersCount: sentOffers?.length || 0,
        loading,
      });

      if (sentOffers && sentOffers.length > 0) {
        const firstOffer = sentOffers[0];
        console.log('[MarketplaceOffersTab] Première offre envoyée (sécurisé):', {
          status: firstOffer?.status,
          hasListingId: !!firstOffer?.listingId,
          hasBuyerId: !!firstOffer?.buyerId,
          hasSellerId: !!firstOffer?.sellerId,
          hasPrice: !!(firstOffer?.offeredAmount || firstOffer?.proposedPrice),
          hasMessage: !!firstOffer?.message,
        });
      }

      if (receivedOffers && receivedOffers.length > 0) {
        const firstOffer = receivedOffers[0];
        console.log('[MarketplaceOffersTab] Première offre reçue (sécurisé):', {
          status: firstOffer?.status,
          hasListingId: !!firstOffer?.listingId,
          hasBuyerId: !!firstOffer?.buyerId,
          hasSellerId: !!firstOffer?.sellerId,
          hasPrice: !!(firstOffer?.offeredAmount || firstOffer?.proposedPrice),
          hasMessage: !!firstOffer?.message,
        });
      }
    }
  }, [receivedOffers, sentOffers, loading]);

  const handleAcceptOffer = async (offerId: string, role: 'producer' | 'buyer' = 'producer') => {
    try {
      if (!user?.id) return;
      await dispatch(acceptOffer({ offerId, userId: user.id, role })).unwrap();
      Alert.alert('Succès', 'Offre acceptée');
      onRefresh();
    } catch (error) {
      Alert.alert('Erreur', getErrorMessage(error));
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    try {
      if (!user?.id) return;
      await dispatch(rejectOffer({ offerId, producerId: user.id })).unwrap();
      Alert.alert('Succès', 'Offre refusée');
      onRefresh();
    } catch (error) {
      Alert.alert('Erreur', getErrorMessage(error));
    }
  };

  const handleWithdrawOffer = async (offerId: string) => {
    Alert.alert("Retirer l'offre", 'Êtes-vous sûr de vouloir retirer cette offre ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: async () => {
          try {
            // ✅ Utilisation du nouveau service avec endpoint DELETE
            await marketplaceService.withdrawOffer(offerId);
            Alert.alert('Succès', 'Offre retirée avec succès');
            onRefresh(); // Recharger les offres
          } catch (error) {
            Alert.alert(
              'Erreur',
              getErrorMessage(error) || 'Impossible de retirer l\'offre. Elle a peut-être déjà été traitée.'
            );
          }
        },
      },
    ]);
  };

  const currentOffers = offersTab === 'received' ? receivedOffers : sentOffers;

  const renderItem = ({ item }: { item: Offer }) => {
    // ✅ LOGS SÉCURISÉS - Aucune donnée sensible exposée
    if (__DEV__) {
      console.log('[MarketplaceOffersTab] Debug sécurisé:', {
        hasItem: !!item,
        itemId: item?.id ? '[REDACTED]' : 'undefined',
        status: item?.status,
        subjectCount: item?.subjectIds?.length || 0,
        hasPrices: !!(item?.proposedPrice || item?.originalPrice),
        hasMessage: !!item?.message,
      });
    }

    // Fonction helper pour obtenir les valeurs avec fallbacks
    const getOfferAmount = () => {
      return item.offered_amount || item.offeredAmount || item.proposedPrice || item.amount || item.price || 0;
    };

    const getSubjectCount = () => {
      return item.pig_count || (item.subject_id ? 1 : 0) || item.subjectIds?.length || 1;
    };

    const getListingPrice = () => {
      return item.listing_price || item.listing?.price || item.originalPrice || 0;
    };

    const getCreatedDate = () => {
      return item.created_at_iso || item.createdAt || item.created_at || item.created || null;
    };

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
      <View
        style={[
          styles.card,
          { backgroundColor: marketplaceColors.surface, borderColor: marketplaceColors.border },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
            {isPending && offersTab === 'received' && (
              <View style={[styles.newBadge, { backgroundColor: marketplaceColors.error }]}>
                <Text style={[styles.newBadgeText, { color: marketplaceColors.textInverse }]}>
                  Nouvelle
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.date, { color: marketplaceColors.textSecondary }]}>
            {formatSafeDate(getCreatedDate(), 'd MMM yyyy à HH:mm')}
          </Text>
        </View>

        <View style={styles.content}>
          <Text style={[styles.subjectCount, { color: marketplaceColors.text }]}>
            {getSubjectCount()} sujet{getSubjectCount() > 1 ? 's' : ''}
          </Text>
          <Text style={[styles.price, { color: marketplaceColors.primary }]}>
            {item.status === 'countered' && offersTab === 'sent'
              ? 'Prix proposé par le producteur: '
              : 'Offre: '}
            {getOfferAmount().toLocaleString()} FCFA
          </Text>
          {item.prixTotalFinal && typeof item.prixTotalFinal === 'number' && (
            <Text style={[styles.finalPrice, { color: marketplaceColors.success }]}>
              Prix final accepté: {item.prixTotalFinal.toLocaleString()} FCFA
            </Text>
          )}
          {getListingPrice() > 0 && (
            <Text style={[styles.originalPrice, { color: marketplaceColors.textSecondary }]}>
              Prix de l'annonce: {getListingPrice().toLocaleString()} FCFA
            </Text>
          )}
          {item.dateRecuperationSouhaitee && (
            <Text style={[styles.dateRecuperation, { color: marketplaceColors.textSecondary }]}>
              📅 Récupération souhaitée: {formatSafeDate(item.dateRecuperationSouhaitee, 'd MMM yyyy')}
            </Text>
          )}
          {item.message && (
            <Text style={[styles.message, { color: marketplaceColors.text }]}>
              "{item.message}"
            </Text>
          )}
        </View>

        {isPending && offersTab === 'received' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: marketplaceColors.success }]}
              onPress={() => handleAcceptOffer(item.id, 'producer')}
            >
              <Text style={[styles.actionText, { color: marketplaceColors.textInverse }]}>
                ✅ Accepter
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: marketplaceColors.error }]}
              onPress={() => handleRejectOffer(item.id)}
            >
              <Text style={[styles.actionText, { color: marketplaceColors.textInverse }]}>
                ❌ Refuser
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: marketplaceColors.primary }]}
              onPress={() => {
                Alert.alert('Chat', "Ouvrir le chat avec l'acheteur");
              }}
            >
              <Text style={[styles.actionText, { color: marketplaceColors.textInverse }]}>
                💬 Chat
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pour les contre-propositions reçues par l'acheteur (offres envoyées avec statut "countered") */}
        {item.status === 'countered' && offersTab === 'sent' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: marketplaceColors.success }]}
              onPress={() => handleAcceptOffer(item.id, 'buyer')}
            >
              <Text style={[styles.actionText, { color: marketplaceColors.textInverse }]}>
                ✅ Accepter la contre-proposition
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: marketplaceColors.error }]}
              onPress={() => handleRejectOffer(item.id)}
            >
              <Text style={[styles.actionText, { color: marketplaceColors.textInverse }]}>
                ❌ Refuser
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isPending && offersTab === 'sent' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: marketplaceColors.error }]}
              onPress={() => handleWithdrawOffer(item.id)}
            >
              <Text style={[styles.actionText, { color: marketplaceColors.textInverse }]}>
                🗑️ Retirer mon offre
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Sous-onglets */}
      <View style={[styles.tabs, { backgroundColor: marketplaceColors.surface }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            offersTab === 'received' && [
              styles.activeTab,
              { borderBottomColor: marketplaceColors.primary },
            ],
          ]}
          onPress={() => setOffersTab('received')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  offersTab === 'received'
                    ? marketplaceColors.primary
                    : marketplaceColors.textSecondary,
              },
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
            offersTab === 'sent' && [
              styles.activeTab,
              { borderBottomColor: marketplaceColors.primary },
            ],
          ]}
          onPress={() => setOffersTab('sent')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  offersTab === 'sent'
                    ? marketplaceColors.primary
                    : marketplaceColors.textSecondary,
              },
            ]}
          >
            Envoyées ({sentOffers.length})
          </Text>
          {sentOffers.filter((o) => o.status === 'countered').length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: marketplaceColors.warning }]}>
              <Text style={[styles.tabBadgeText, { color: marketplaceColors.textInverse }]}>
                {sentOffers.filter((o) => o.status === 'countered').length}
              </Text>
            </View>
          )}
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
        // Optimisations FlatList (Phase 4)
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={10}
        ListFooterComponent={<View style={{ height: 20 }} />} // ✅ Espace supplémentaire en bas
        showsVerticalScrollIndicator={true}
      />
    </SafeAreaView>
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
    paddingBottom: 100, // ✅ Espace pour voir la dernière carte
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
  finalPrice: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  dateRecuperation: {
    fontSize: 13,
    marginTop: 4,
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

// Mémoïser le composant pour éviter les re-renders inutiles
export default React.memo(MarketplaceOffersTab);
