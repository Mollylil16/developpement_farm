/**
 * Écran "Mes offres" pour le producteur
 * Affiche toutes les offres reçues par le producteur
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import { SPACING } from '../../constants/theme';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import { OfferResponseModal } from '../../components/marketplace';
import apiClient from '../../services/api/apiClient';
import marketplaceService from '../../services/MarketplaceService';
import type { Offer, MarketplaceListing } from '../../types/marketplace';
import type { ProductionAnimal } from '../../types/production';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ProducerOffersScreen() {
  const { colors } = useTheme();
  const marketplaceColors = MarketplaceTheme.colors;
  const navigation = useNavigation();
  const { user } = useAppSelector((state) => state.auth);
  const { projetActif } = useAppSelector((state) => state.projet);

  type EnrichedOffer = Offer & {
    listing?: MarketplaceListing;
    subject?: ProductionAnimal;
  };

  const [offers, setOffers] = useState<EnrichedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<EnrichedOffer | null>(null);
  const [responseModalVisible, setResponseModalVisible] = useState(false);

  const loadOffers = useCallback(async () => {
    if (!user?.id || !projetActif) {
      setLoading(false);
      return;
    }

    try {
      // Récupérer les offres pour ce producteur depuis l'API backend
      const producerOffers = await apiClient.get<any[]>('/marketplace/offers', {
        params: { producer_id: user.id },
      });

      // Enrichir avec les informations des listings et des sujets
      const enrichedOffers = await Promise.all(
        producerOffers.map(async (offer) => {
          try {
            // Récupérer le listing depuis l'API backend
            const listing = await apiClient.get<MarketplaceListing>(`/marketplace/listings/${offer.listingId}`);
            
            // Récupérer le premier animal depuis l'API backend (offer.subjectIds est un tableau)
            const firstSubjectId = offer.subjectIds?.[0];
            let subject: ProductionAnimal | undefined;
            if (firstSubjectId) {
              // ✅ Utiliser la route marketplace dédiée qui ne vérifie pas l'appartenance
              const { AnimalRepository } = await import('../../../database/repositories');
              const animalRepo = new AnimalRepository();
              subject = await animalRepo.findMarketplaceAnimal(firstSubjectId) as any || undefined;
            }

            return {
              ...offer,
              listing,
              subject,
            } as EnrichedOffer;
          } catch (error) {
            console.error('Erreur enrichissement offre:', error);
            return offer;
          }
        })
      );

      // Trier par date (plus récentes en premier)
      enrichedOffers.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setOffers(enrichedOffers);
    } catch (error: unknown) {
      console.error('Erreur chargement offres:', error);
      Alert.alert('Erreur', 'Impossible de charger les offres');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, projetActif]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOffers();
  }, [loadOffers]);

  const handleOfferPress = (offer: EnrichedOffer) => {
    setSelectedOffer(offer);
    setResponseModalVisible(true);
  };

  const handleOfferResponse = async (
    offerId: string,
    action: 'accept' | 'reject' | 'counter',
    counterPrice?: number,
    counterMessage?: string
  ) => {
    try {
      const service = marketplaceService;

      if (!user?.id) {
        throw new Error('Utilisateur non connecté');
      }

      if (action === 'accept') {
        await service.acceptOffer(offerId, user.id, 'producer');
        Alert.alert('Succès', 'Offre acceptée. La transaction a été créée.');
      } else if (action === 'reject') {
        await service.rejectOffer(offerId, user.id);
        Alert.alert('Succès', 'Offre refusée.');
      } else if (action === 'counter' && counterPrice) {
        await service.counterOffer(offerId, user.id, counterPrice, counterMessage);
        Alert.alert('Succès', 'Contre-offre envoyée.');
      }

      setResponseModalVisible(false);
      setSelectedOffer(null);
      loadOffers();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Impossible de traiter l'offre";
      Alert.alert('Erreur', errorMessage);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return marketplaceColors.success;
      case 'rejected':
        return marketplaceColors.error;
      case 'countered':
        return marketplaceColors.warning;
      case 'expired':
        return colors.textSecondary;
      default:
        return marketplaceColors.primary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'Acceptée';
      case 'rejected':
        return 'Refusée';
      case 'countered':
        return 'Contre-offre';
      case 'expired':
        return 'Expirée';
      default:
        return 'En attente';
    }
  };

  const renderOffer = ({ item }: { item: Offer & { listing?: unknown; subject?: unknown } }) => {
    const isPending = item.status === 'pending';
    const statusColor = getStatusColor(item.status);
    const statusLabel = getStatusLabel(item.status);

    return (
      <TouchableOpacity
        style={[
          styles.offerCard,
          {
            backgroundColor: colors.surface,
            borderColor: isPending ? marketplaceColors.primary : colors.border,
            borderWidth: isPending ? 2 : 1,
          },
        ]}
        onPress={() => handleOfferPress(item)}
        disabled={!isPending}
      >
        <View style={styles.offerHeader}>
          <View style={styles.offerInfo}>
            <Text style={[styles.offerSubject, { color: colors.text }]}>
              {item.subject?.code || item.subjectIds?.[0] || 'N/A'}
              {item.subject?.nom && ` - ${item.subject.nom}`}
            </Text>
            <Text style={[styles.offerDate, { color: colors.textSecondary }]}>
              {format(new Date(item.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + '20', borderColor: statusColor },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.offerDetails}>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Prix proposé:</Text>
            <Text style={[styles.priceValue, { color: marketplaceColors.primary }]}>
              {item.proposedPrice.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
          {item.listing && (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                Prix initial:
              </Text>
              <Text style={[styles.originalPrice, { color: colors.textSecondary }]}>
                {item.listing.calculatedPrice?.toLocaleString('fr-FR') || item.originalPrice.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
          )}
          {item.message && (
            <View style={styles.messageContainer}>
              <Text style={[styles.messageLabel, { color: colors.textSecondary }]}>Message:</Text>
              <Text style={[styles.messageText, { color: colors.text }]}>{item.message}</Text>
            </View>
          )}
        </View>

        {isPending && (
          <View style={styles.actionHint}>
            <Ionicons name="hand-left-outline" size={16} color={marketplaceColors.primary} />
            <Text style={[styles.actionHintText, { color: marketplaceColors.primary }]}>
              Appuyez pour répondre
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Mes offres</Text>
        <View style={styles.headerRight} />
      </View>

      {offers.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="Aucune offre reçue"
          message="Vous n'avez pas encore reçu d'offres pour vos sujets en vente."
        />
      ) : (
        <FlatList
          data={offers}
          renderItem={renderOffer}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {selectedOffer && (
        <OfferResponseModal
          visible={responseModalVisible}
          offer={selectedOffer}
          userRole="producer"
          onClose={() => {
            setResponseModalVisible(false);
            setSelectedOffer(null);
          }}
          onAccept={async (role: 'producer' | 'buyer') => {
            if (selectedOffer?.id) {
              await handleOfferResponse(selectedOffer.id, 'accept');
            }
          }}
          onReject={async () => {
            if (selectedOffer?.id) {
              await handleOfferResponse(selectedOffer.id, 'reject');
            }
          }}
          onCounter={async (newPrice: number, message?: string) => {
            if (selectedOffer?.id) {
              await handleOfferResponse(selectedOffer.id, 'counter', newPrice, message);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  listContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  offerCard: {
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  offerInfo: {
    flex: 1,
  },
  offerSubject: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  offerDate: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  offerDetails: {
    gap: SPACING.xs,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  messageContainer: {
    marginTop: SPACING.xs,
    padding: SPACING.sm,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: 4,
  },
  actionHintText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
