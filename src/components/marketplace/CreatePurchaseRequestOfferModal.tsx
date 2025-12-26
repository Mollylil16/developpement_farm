/**
 * Modal pour qu'un producteur fasse une offre sur une demande d'achat
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import { SPACING } from '../../constants/theme';
import type {
  PurchaseRequest,
  PurchaseRequestMatch,
  MarketplaceListing,
} from '../../types/marketplace';
import apiClient from '../../services/api/apiClient';
import { logger } from '../../utils/logger';

interface CreatePurchaseRequestOfferModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchaseRequest: PurchaseRequest;
  match: PurchaseRequestMatch;
  producerId: string;
}

export default function CreatePurchaseRequestOfferModal({
  visible,
  onClose,
  onSuccess,
  purchaseRequest,
  match,
  producerId,
}: CreatePurchaseRequestOfferModalProps) {
  const { colors } = MarketplaceTheme;
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingListing, setFetchingListing] = useState(true);

  const [proposedPricePerKg, setProposedPricePerKg] = useState('');
  const [quantity, setQuantity] = useState(purchaseRequest.quantity.toString());
  const [availableDate, setAvailableDate] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (visible && match.listingId) {
      loadListing();
    }
  }, [visible, match.listingId]);

  const loadListing = async () => {
    try {
      setFetchingListing(true);
      // Charger le listing depuis l'API backend
      const listingData = await apiClient.get<any>(`/marketplace/listings/${match.listingId}`);
      if (!listingData) {
        Alert.alert('Erreur', 'Annonce introuvable');
        onClose();
        return;
      }

      // Récupérer le poids actuel de l'animal depuis l'API backend
      const animal = await apiClient.get<any>(`/production/animaux/${listingData.subjectId}`);
      const pesees = await apiClient.get<any[]>(`/production/pesees`, {
        params: { animal_id: listingData.subjectId, limit: 1 },
      });
      const latestWeight = pesees && pesees.length > 0 ? pesees[0] : null;
      const currentWeight = latestWeight?.poids_kg || animal?.poids_initial || 0;

      // Pré-remplir le prix proposé avec le prix du listing
      setProposedPricePerKg(listingData.pricePerKg.toString());

      setListing(listingData);
    } catch (error) {
      logger.error('Erreur chargement listing:', error);
      Alert.alert('Erreur', "Impossible de charger les détails de l'annonce");
    } finally {
      setFetchingListing(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!proposedPricePerKg || parseFloat(proposedPricePerKg) <= 0) {
      Alert.alert('Erreur', 'Le prix proposé doit être supérieur à 0');
      return;
    }

    if (!quantity || parseInt(quantity) <= 0) {
      Alert.alert('Erreur', 'La quantité doit être supérieure à 0');
      return;
    }

    if (parseInt(quantity) > purchaseRequest.quantity) {
      Alert.alert(
        'Erreur',
        `La quantité ne peut pas dépasser ${purchaseRequest.quantity} (demandé par l'acheteur)`
      );
      return;
    }

    if (
      purchaseRequest.maxPricePerKg &&
      parseFloat(proposedPricePerKg) > purchaseRequest.maxPricePerKg
    ) {
      Alert.alert(
        'Attention',
        `Le prix proposé (${parseFloat(proposedPricePerKg).toLocaleString()} FCFA/kg) dépasse le prix maximum souhaité par l'acheteur (${purchaseRequest.maxPricePerKg.toLocaleString()} FCFA/kg). Voulez-vous continuer ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Continuer', onPress: () => submitOffer() },
        ]
      );
      return;
    }

    await submitOffer();
  };

  const submitOffer = async () => {
    setLoading(true);
    try {
      if (!listing) {
        Alert.alert('Erreur', 'Annonce introuvable');
        return;
      }

      const proposedPricePerKgValue = parseFloat(proposedPricePerKg);
      const quantityValue = parseInt(quantity);
      const proposedTotalPrice = proposedPricePerKgValue * (listing.weight || 0) * quantityValue;

      // Créer l'offre via l'API backend
      await apiClient.post('/marketplace/purchase-request-offers', {
        purchaseRequestId: purchaseRequest.id,
        listingId: listing.id,
        subjectIds: [listing.subjectId], // Pour l'instant, un listing = un sujet
        proposedPricePerKg: proposedPricePerKgValue,
        proposedTotalPrice,
        quantity: quantityValue,
        availableDate: availableDate || undefined,
        message: message.trim() || undefined,
      });

      Alert.alert('Succès', "Votre offre a été envoyée à l'acheteur.");
      onSuccess();
      handleClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Impossible de créer l'offre";
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setProposedPricePerKg('');
    setQuantity(purchaseRequest.quantity.toString());
    setAvailableDate('');
    setMessage('');
    setListing(null);
    onClose();
  };

  if (fetchingListing) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text }]}>Chargement...</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.divider }]}>
              <View style={styles.headerContent}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Faire une offre</Text>
                <Text
                  style={[styles.headerSubtitle, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {purchaseRequest.title}
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
              {/* Détails de la demande */}
              <View
                style={[
                  styles.infoBox,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.infoTitle, { color: colors.text }]}>
                  Demande de l'acheteur
                </Text>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Race:</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {purchaseRequest.race}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Poids souhaité:
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {purchaseRequest.minWeight}-{purchaseRequest.maxWeight} kg
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Quantité:</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {purchaseRequest.quantity} tête{purchaseRequest.quantity > 1 ? 's' : ''}
                  </Text>
                </View>
                {purchaseRequest.maxPricePerKg && (
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      Prix max souhaité:
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {purchaseRequest.maxPricePerKg.toLocaleString()} FCFA/kg
                    </Text>
                  </View>
                )}
              </View>

              {/* Prix proposé */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Prix proposé au kg vif (FCFA) *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={proposedPricePerKg}
                  onChangeText={setProposedPricePerKg}
                  placeholder="Ex: 450"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
                {listing && (
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    Prix actuel de votre annonce: {listing.pricePerKg.toLocaleString()} FCFA/kg
                  </Text>
                )}
              </View>

              {/* Quantité */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Quantité que vous pouvez fournir *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder={`Max: ${purchaseRequest.quantity}`}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={[styles.hint, { color: colors.textSecondary }]}>
                  Maximum demandé: {purchaseRequest.quantity} tête
                  {purchaseRequest.quantity > 1 ? 's' : ''}
                </Text>
              </View>

              {/* Date de disponibilité */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>Date de disponibilité</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={availableDate}
                  onChangeText={setAvailableDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Message */}
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.text }]}>Message (optionnel)</Text>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Ajoutez un message à votre offre..."
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: colors.divider }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={handleClose}
                disabled={loading}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                  Annuler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={[styles.submitButtonText, { color: '#FFFFFF' }]}>
                    Envoyer l'offre
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 0 : SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? SPACING.xl + 8 : SPACING.lg + 24,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
    marginRight: SPACING.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: SPACING.xs,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  infoBox: {
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  field: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    marginTop: SPACING.xs,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    borderRadius: 8,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
