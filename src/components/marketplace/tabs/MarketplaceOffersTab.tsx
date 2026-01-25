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
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatSafeDate } from '../../../utils/dateUtils';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import apiClient from '../../../services/api/apiClient';
import marketplaceService from '../../../services/MarketplaceService';
import { acceptOffer, rejectOffer, counterOffer } from '../../../store/slices/marketplaceSlice';
import { MarketplaceTheme } from '../../../styles/marketplace.theme';
import EmptyState from '../../EmptyState';
import type { Offer } from '../../../types/marketplace';
import { getErrorMessage } from '../../../types/errors';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';

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
  const { colors, isDark } = useTheme();
  const { user } = useAppSelector((state) => state.auth ?? { user: null });
  const dispatch = useAppDispatch();
  const [offersTab, setOffersTab] = useState<'received' | 'sent'>('received');
  
  // États pour la contre-proposition
  const [counterModalVisible, setCounterModalVisible] = useState(false);
  const [selectedOfferForCounter, setSelectedOfferForCounter] = useState<Offer | null>(null);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [isSubmittingCounter, setIsSubmittingCounter] = useState(false);

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
      if (!user?.id) {
        Alert.alert('Erreur', 'Vous devez être connecté pour accepter cette offre');
        return;
      }
      
      // Confirmation avant acceptation
      Alert.alert(
        'Confirmer',
        role === 'producer' 
          ? 'Voulez-vous accepter cette offre ? Une transaction sera créée.'
          : 'Voulez-vous accepter cette contre-proposition ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Accepter',
            style: 'default',
            onPress: async () => {
              try {
                await dispatch(acceptOffer({ offerId, userId: user.id, role })).unwrap();
                Alert.alert('Succès', 'Offre acceptée ! Une transaction a été créée.');
                onRefresh();
              } catch (error) {
                const errorMsg = getErrorMessage(error);
                console.error('[MarketplaceOffersTab] Erreur acceptation:', error);
                
                // Messages d'erreur plus explicites
                if (errorMsg.toLowerCase().includes('connexion') || errorMsg.toLowerCase().includes('network')) {
                  Alert.alert(
                    'Erreur de connexion',
                    'Impossible de contacter le serveur. Vérifiez votre connexion Internet et réessayez.',
                    [{ text: 'OK' }, { text: 'Réessayer', onPress: () => handleAcceptOffer(offerId, role) }]
                  );
                } else if (errorMsg.toLowerCase().includes('session') || errorMsg.toLowerCase().includes('token')) {
                  Alert.alert('Session expirée', 'Veuillez vous reconnecter à l\'application.');
                } else if (errorMsg.toLowerCase().includes('autorisé') || errorMsg.toLowerCase().includes('forbidden')) {
                  Alert.alert('Non autorisé', 'Vous n\'êtes pas autorisé à accepter cette offre.');
                } else {
                  Alert.alert('Erreur', errorMsg || 'Une erreur est survenue lors de l\'acceptation');
                }
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Erreur', getErrorMessage(error));
    }
  };

  const handleRejectOffer = async (offerId: string, role: 'producer' | 'buyer' = 'producer') => {
    try {
      if (!user?.id) return;
      
      const confirmMessage = role === 'buyer' 
        ? 'Voulez-vous refuser cette contre-proposition ?'
        : 'Voulez-vous refuser cette offre ?';
      
      Alert.alert(
        'Confirmer le refus',
        confirmMessage,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Refuser',
            style: 'destructive',
            onPress: async () => {
              try {
                await dispatch(rejectOffer({ offerId, producerId: user.id, role })).unwrap();
                Alert.alert(
                  'Succès', 
                  role === 'buyer' ? 'Contre-proposition refusée' : 'Offre refusée'
                );
                onRefresh();
              } catch (err) {
                Alert.alert('Erreur', getErrorMessage(err));
              }
            },
          },
        ]
      );
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

  // Ouvrir le modal de contre-proposition
  const handleCounterOffer = (offer: Offer) => {
    setSelectedOfferForCounter(offer);
    const currentPrice = offer.offeredAmount || offer.proposedPrice || 0;
    setCounterPrice(currentPrice.toString());
    setCounterMessage('');
    setCounterModalVisible(true);
  };

  // Soumettre la contre-proposition
  const submitCounterOffer = async () => {
    if (!selectedOfferForCounter || !user?.id) return;
    
    const newPrice = parseFloat(counterPrice);
    if (isNaN(newPrice) || newPrice <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un prix valide');
      return;
    }

    setIsSubmittingCounter(true);
    try {
      await dispatch(counterOffer({
        offerId: selectedOfferForCounter.id,
        producerId: user.id,
        nouveauPrixTotal: newPrice,
        message: counterMessage.trim() || undefined,
      })).unwrap();
      
      Alert.alert(
        'Succès', 
        `Contre-proposition de ${newPrice.toLocaleString('fr-FR')} FCFA envoyée à l'acheteur`
      );
      setCounterModalVisible(false);
      setSelectedOfferForCounter(null);
      onRefresh();
    } catch (error) {
      Alert.alert('Erreur', getErrorMessage(error) || 'Impossible d\'envoyer la contre-proposition');
    } finally {
      setIsSubmittingCounter(false);
    }
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
          {/* Afficher le nom du producteur pour les contre-propositions reçues */}
          {(item.isCounterProposalReceived || item.counterOfferOf) && offersTab === 'received' && (
            <Text style={[styles.sellerName, { color: marketplaceColors.textSecondary, marginBottom: 4 }]}>
              De: {item.seller_nom || item.buyer_nom} {item.seller_prenom || item.buyer_prenom}
            </Text>
          )}
          <Text style={[styles.subjectCount, { color: marketplaceColors.text }]}>
            {getSubjectCount()} sujet{getSubjectCount() > 1 ? 's' : ''}
          </Text>
          <Text style={[styles.price, { color: marketplaceColors.primary }]}>
            {(item.isCounterProposalReceived || item.counterOfferOf) && offersTab === 'received'
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

        {/* Boutons pour le PRODUCTEUR : offres initiales reçues (pending, pas de contre-proposition) */}
        {isPending && offersTab === 'received' && !item.isCounterProposalReceived && !item.counterOfferOf && (
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
              onPress={() => handleCounterOffer(item)}
            >
              <Text style={[styles.actionText, { color: marketplaceColors.textInverse }]}>
                💰 Contre-proposition
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Boutons pour l'ACHETEUR : contre-propositions reçues du producteur (dans onglet "reçues") */}
        {offersTab === 'received' && (item.isCounterProposalReceived || item.counterOfferOf) && item.status === 'countered' && (
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
              onPress={() => handleRejectOffer(item.id, 'buyer')}
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
          {receivedOffers.filter((o) => o.status === 'pending' || (o.status === 'countered' && (o.isCounterProposalReceived || o.counterOfferOf))).length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: marketplaceColors.error }]}>
              <Text style={[styles.tabBadgeText, { color: marketplaceColors.textInverse }]}>
                {receivedOffers.filter((o) => o.status === 'pending' || (o.status === 'countered' && (o.isCounterProposalReceived || o.counterOfferOf))).length}
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
        ListFooterComponent={<View style={{ height: 20 }} />}
        showsVerticalScrollIndicator={true}
      />

      {/* Modal de contre-proposition */}
      <Modal
        visible={counterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCounterModalVisible(false)}
        statusBarTranslucent={true}
      >
        <View style={[styles.modalOverlay, { backgroundColor: marketplaceColors.overlay }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setCounterModalVisible(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[
                styles.modalContent,
                {
                  backgroundColor: marketplaceColors.surfaceSolid,
                  ...MarketplaceTheme.shadows.large,
                }
              ]}>
                <View style={[styles.modalHeader, { borderBottomColor: marketplaceColors.divider }]}>
                  <Text style={[styles.modalTitle, { color: marketplaceColors.text }]}>
                    Contre-proposition
                  </Text>
                  <TouchableOpacity
                    onPress={() => setCounterModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color={marketplaceColors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {selectedOfferForCounter && (
                  <>
                    <ScrollView 
                      style={styles.modalBody} 
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.modalBodyContent}
                      keyboardShouldPersistTaps="handled"
                    >
                      {/* Informations de l'offre actuelle */}
                      <View style={[
                        styles.infoCard,
                        {
                          backgroundColor: marketplaceColors.glassBackground,
                          borderColor: marketplaceColors.glassBorder,
                          borderWidth: 1,
                          ...MarketplaceTheme.shadows.small,
                        }
                      ]}>
                        <View style={styles.infoRow}>
                          <Ionicons name="pricetag-outline" size={20} color={marketplaceColors.primary} />
                          <View style={styles.infoContent}>
                            <Text style={[styles.infoLabel, { color: marketplaceColors.textSecondary }]}>
                              Offre actuelle
                            </Text>
                            <Text style={[styles.infoValue, { color: marketplaceColors.primary }]}>
                              {(selectedOfferForCounter.offeredAmount || selectedOfferForCounter.proposedPrice || 0).toLocaleString('fr-FR')} FCFA
                            </Text>
                          </View>
                        </View>
                        <View style={styles.infoRow}>
                          <Ionicons name="cash-outline" size={20} color={marketplaceColors.primary} />
                          <View style={styles.infoContent}>
                            <Text style={[styles.infoLabel, { color: marketplaceColors.textSecondary }]}>
                              Prix de l'annonce
                            </Text>
                            <Text style={[styles.infoValue, { color: marketplaceColors.text }]}>
                              {(selectedOfferForCounter.originalPrice || 0).toLocaleString('fr-FR')} FCFA
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Champ prix proposé */}
                      <View style={styles.inputSection}>
                        <Text style={[styles.inputLabel, { color: marketplaceColors.text }]}>
                          Votre prix proposé (FCFA)
                        </Text>
                        <TextInput
                          style={[styles.modalInput, { 
                            backgroundColor: marketplaceColors.surfaceSolid,
                            color: marketplaceColors.text,
                            borderColor: marketplaceColors.border
                          }]}
                          value={counterPrice}
                          onChangeText={setCounterPrice}
                          keyboardType="numeric"
                          placeholder="Ex: 150000"
                          placeholderTextColor={marketplaceColors.textSecondary}
                        />
                      </View>

                      {/* Champ message */}
                      <View style={styles.inputSection}>
                        <Text style={[styles.inputLabel, { color: marketplaceColors.text }]}>
                          Message (optionnel)
                        </Text>
                        <TextInput
                          style={[styles.modalInput, styles.messageInput, { 
                            backgroundColor: marketplaceColors.surfaceSolid,
                            color: marketplaceColors.text,
                            borderColor: marketplaceColors.border
                          }]}
                          value={counterMessage}
                          onChangeText={setCounterMessage}
                          placeholder="Expliquez votre proposition..."
                          placeholderTextColor={marketplaceColors.textSecondary}
                          multiline
                          numberOfLines={3}
                          textAlignVertical="top"
                        />
                      </View>
                    </ScrollView>

                    {/* Boutons d'action (fixés en bas) */}
                    <View style={[
                      styles.modalActions,
                      {
                        backgroundColor: marketplaceColors.surfaceSolid,
                        borderTopColor: marketplaceColors.divider
                      }
                    ]}>
                      <TouchableOpacity
                        style={[
                          styles.modalButtonCancel,
                          {
                            borderColor: marketplaceColors.border,
                            backgroundColor: marketplaceColors.surfaceSolid,
                          }
                        ]}
                        onPress={() => setCounterModalVisible(false)}
                        disabled={isSubmittingCounter}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.modalButtonTextCancel, { color: marketplaceColors.text }]}>
                          Annuler
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.modalButtonSend,
                          {
                            backgroundColor: marketplaceColors.primary,
                            ...MarketplaceTheme.shadows.medium,
                          }
                        ]}
                        onPress={submitCounterOffer}
                        disabled={isSubmittingCounter || !counterPrice || parseFloat(counterPrice) <= 0}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.modalButtonTextSend, { color: marketplaceColors.textInverse }]}>
                          {isSubmittingCounter ? 'Envoi...' : 'Envoyer'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
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
  // Styles pour le modal de contre-proposition (alignés avec le thème marketplace)
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: MarketplaceTheme.borderRadius.xl,
    borderTopRightRadius: MarketplaceTheme.borderRadius.xl,
    paddingTop: MarketplaceTheme.spacing.lg,
    paddingBottom: 0,
    maxHeight: Dimensions.get('window').height * 0.85,
    minHeight: Dimensions.get('window').height * 0.5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: MarketplaceTheme.spacing.lg,
    paddingBottom: MarketplaceTheme.spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.xl,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
    flex: 1,
  },
  closeButton: {
    padding: MarketplaceTheme.spacing.xs,
    marginLeft: MarketplaceTheme.spacing.sm,
  },
  modalBody: {
    flex: 1,
    maxHeight: Dimensions.get('window').height * 0.6,
  },
  modalBodyContent: {
    paddingHorizontal: MarketplaceTheme.spacing.lg,
    paddingTop: MarketplaceTheme.spacing.md,
    paddingBottom: MarketplaceTheme.spacing.xl,
    gap: MarketplaceTheme.spacing.md,
  },
  infoCard: {
    borderRadius: MarketplaceTheme.borderRadius.lg,
    padding: MarketplaceTheme.spacing.md,
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  infoContent: {
    marginLeft: MarketplaceTheme.spacing.sm,
    flex: 1,
  },
  infoLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  inputSection: {
    marginBottom: MarketplaceTheme.spacing.md,
  },
  inputLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
    marginBottom: MarketplaceTheme.spacing.xs,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: MarketplaceTheme.borderRadius.md,
    padding: MarketplaceTheme.spacing.md,
    fontSize: MarketplaceTheme.typography.fontSizes.md,
  },
  messageInput: {
    minHeight: 100,
  },
  modalActions: {
    flexDirection: 'row',
    gap: MarketplaceTheme.spacing.sm,
    paddingHorizontal: MarketplaceTheme.spacing.lg,
    paddingTop: MarketplaceTheme.spacing.md,
    paddingBottom: MarketplaceTheme.spacing.lg,
    borderTopWidth: 1,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalButtonTextCancel: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  modalButtonSend: {
    flex: 1,
    paddingVertical: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    alignItems: 'center',
  },
  modalButtonTextSend: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
});

// Mémoïser le composant pour éviter les re-renders inutiles
export default React.memo(MarketplaceOffersTab);
