/**
 * Modal Unifié pour ajouter un listing au marketplace
 * Gère à la fois les listings individuels et par bande
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import { SPACING, FONT_SIZES } from '../../constants/theme';
import { useAppSelector } from '../../store/hooks';
import apiClient from '../../services/api/apiClient';
import { useGeolocation } from '../../hooks/useGeolocation';
import { getErrorMessage } from '../../types/common';
import { logger } from '../../utils/logger';
import { PhotoPicker } from './PhotoPicker';
import marketplaceService from '../../services/MarketplaceService';

interface AddListingModalProps {
  visible: boolean;
  projetId: string;
  onClose: () => void;
  onSuccess: () => void;
  // Pour mode individuel
  subjectId?: string;
  subjectCode?: string;
  subjectWeight?: number;
  // Pour mode bande
  batchId?: string;
  batchName?: string;
  batchCount?: number;
  batchAverageWeight?: number;
  batchPigIds?: string[];
}

export default function AddListingModal({
  visible,
  projetId,
  onClose,
  onSuccess,
  subjectId,
  subjectCode,
  subjectWeight,
  batchId,
  batchName,
  batchCount,
  batchAverageWeight,
  batchPigIds,
}: AddListingModalProps) {
  const { colors, spacing, typography, borderRadius } = MarketplaceTheme;
  const { user } = useAppSelector((state) => state.auth ?? { user: null });
  const { getCurrentLocation } = useGeolocation();

  // Déterminer le mode
  const isBatchMode = !!batchId;
  const mode = isBatchMode ? 'batch' : 'individual';

  // États
  const [pricePerKg, setPricePerKg] = useState('');
  const [quantity, setQuantity] = useState<number>(batchCount || 1);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [photos, setPhotos] = useState<Array<{ uri: string }>>([]);

  // Réinitialiser quand le modal s'ouvre
  useEffect(() => {
    if (visible) {
      setPricePerKg('');
      setQuantity(batchCount || 1);
      setTermsAccepted(false);
      setPhotos([]);
    }
  }, [visible, batchCount]);

  // Poids à utiliser
  const weight = isBatchMode ? (batchAverageWeight || 0) : (subjectWeight || 0);

  // Calculer le prix total
  const totalPrice = parseFloat(pricePerKg || '0') * weight * quantity;

  /**
   * Soumettre le listing
   */
  const handleSubmit = async () => {
    if (!termsAccepted) {
      Alert.alert('Conditions non acceptées', 'Veuillez accepter les conditions de vente.');
      return;
    }

    if (!pricePerKg || parseFloat(pricePerKg) <= 0) {
      Alert.alert('Prix invalide', 'Veuillez entrer un prix au kg valide.');
      return;
    }

    if (weight <= 0) {
      Alert.alert('Poids invalide', 'Le poids doit être supérieur à 0.');
      return;
    }

    if (isBatchMode && quantity <= 0) {
      Alert.alert('Quantité invalide', 'La quantité doit être supérieure à 0.');
      return;
    }

    setLoading(true);

    try {
      // Récupérer la localisation
      const location = await getCurrentLocation();
      if (!location) {
        Alert.alert('Localisation requise', 'Impossible de récupérer votre localisation.');
        setLoading(false);
        return;
      }

      const now = new Date().toISOString();

      let listingId: string;

      // Type pour la réponse de création de listing
      interface ListingResponse {
        id?: string;
        listingId?: string;
      }

      // Créer le listing selon le mode
      if (isBatchMode) {
        // Mode bande
        const response = await apiClient.post<ListingResponse>('/marketplace/listings/batch', {
          batchId,
          farmId: projetId,
          pricePerKg: parseFloat(pricePerKg),
          averageWeight: weight,
          pigCount: quantity,
          pigIds: batchPigIds || undefined,
          lastWeightDate: now,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address,
            city: location.city,
            region: location.region,
          },
          saleTerms: {
            transport: 'buyer_responsibility',
            slaughter: 'buyer_responsibility',
            paymentTerms: 'on_delivery',
            warranty: 'Tous les documents sanitaires et certificats seront fournis.',
            cancellationPolicy: "Annulation possible jusqu'à 48h avant la date de livraison.",
          },
        });

        const respId = response.id || response.listingId;
        if (!respId) {
          throw new Error('Erreur lors de la création du listing: ID manquant');
        }
        listingId = respId;
        logger.info(`[AddListingModal] Listing de bande créé: ${listingId}`);
      } else {
        // Mode individuel
        const response = await apiClient.post<ListingResponse>('/marketplace/listings', {
          subjectId,
          farmId: projetId,
          pricePerKg: parseFloat(pricePerKg),
          weight,
          lastWeightDate: now,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address,
            city: location.city,
            region: location.region,
          },
          saleTerms: {
            transport: 'buyer_responsibility',
            slaughter: 'buyer_responsibility',
            paymentTerms: 'on_delivery',
            warranty: 'Tous les documents sanitaires et certificats seront fournis.',
            cancellationPolicy: "Annulation possible jusqu'à 48h avant la date de livraison.",
          },
        });

        const respId = response.id || response.listingId;
        if (!respId) {
          throw new Error('Erreur lors de la création du listing: ID manquant');
        }
        listingId = respId;
        logger.info(`[AddListingModal] Listing individuel créé: ${listingId}`);
      }

      // Uploader les photos si présentes
      if (photos.length > 0 && listingId) {
        try {
          // Utiliser le service marketplace importé (ligne 30)
          await marketplaceService.uploadMultiplePhotos(
            listingId,
            photos.map(p => p.uri)
          );
          logger.info(`[AddListingModal] ${photos.length} photo(s) uploadée(s) pour le listing ${listingId}`);
        } catch (photoError: any) {
          logger.warn(`[AddListingModal] Erreur upload photos: ${getErrorMessage(photoError)}`);
          // Ne pas bloquer la création du listing si l'upload de photos échoue
          Alert.alert(
            'Annonce créée',
            'Votre annonce a été publiée, mais l\'upload des photos a échoué. Vous pourrez les ajouter plus tard.'
          );
          onSuccess();
          onClose();
          return;
        }
      }

      Alert.alert('Succès', 'Votre annonce a été publiée avec succès.');
      onSuccess();
      onClose();
    } catch (error: any) {
      logger.error('[AddListingModal] Erreur lors de la création du listing:', error);
      const message = getErrorMessage(error);
      Alert.alert('Erreur', `Impossible de publier l'annonce: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>
              {isBatchMode ? 'Publier une bande' : 'Publier un animal'}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={true}
          >
          {/* Informations du listing */}
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <View style={styles.infoHeader}>
              <Ionicons
                name={isBatchMode ? 'people' : 'paw'}
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                {isBatchMode ? batchName : subjectCode}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Type</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {isBatchMode ? 'Bande (lot)' : 'Animal individuel'}
              </Text>
            </View>

            {isBatchMode && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Nombre de sujets</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{batchCount}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                {isBatchMode ? 'Poids moyen' : 'Poids'}
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{weight.toFixed(1)} kg</Text>
            </View>

            {isBatchMode && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Poids total</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {(weight * (batchCount || 1)).toFixed(1)} kg
                </Text>
              </View>
            )}
          </View>

          {/* Prix au kg */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Prix au kg (FCFA) *</Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
              ]}
              value={pricePerKg}
              onChangeText={setPricePerKg}
              placeholder="Ex: 1500"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>

          {/* Quantité (pour mode bande uniquement) */}
          {isBatchMode && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Quantité à vendre *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                ]}
                value={quantity.toString()}
                onChangeText={(text) => setQuantity(parseInt(text) || 0)}
                placeholder={`Max: ${batchCount}`}
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                editable={!batchPigIds || batchPigIds.length === 0}
              />
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                {batchPigIds && batchPigIds.length > 0
                  ? `${batchPigIds.length} sujets sélectionnés`
                  : `Sur ${batchCount} disponibles dans la bande`}
              </Text>
            </View>
          )}

          {/* Récapitulatif */}
          <View style={[styles.summaryCard, { backgroundColor: colors.primaryLight }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.text }]}>Prix total estimé</Text>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>
                {totalPrice.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
            <Text style={[styles.summaryNote, { color: colors.textSecondary }]}>
              {isBatchMode
                ? `${quantity} × ${weight.toFixed(1)} kg × ${pricePerKg || '0'} FCFA/kg`
                : `${weight.toFixed(1)} kg × ${pricePerKg || '0'} FCFA/kg`}
            </Text>
          </View>

          {/* Photos */}
          <PhotoPicker
            photos={photos}
            onPhotosChange={setPhotos}
            maxPhotos={isBatchMode ? 10 : 5}
          />

          {/* Conditions de vente */}
          <View style={styles.termsSection}>
            <Text style={[styles.termsTitle, { color: colors.text }]}>Conditions de vente par défaut</Text>
            <View style={[styles.termsCard, { backgroundColor: colors.surface }]}>
              <View style={styles.termItem}>
                <Ionicons name="car" size={16} color={colors.textSecondary} />
                <Text style={[styles.termText, { color: colors.textSecondary }]}>
                  Transport à la charge de l'acheteur
                </Text>
              </View>
              <View style={styles.termItem}>
                <Ionicons name="cut" size={16} color={colors.textSecondary} />
                <Text style={[styles.termText, { color: colors.textSecondary }]}>
                  Abattage à la charge de l'acheteur
                </Text>
              </View>
              <View style={styles.termItem}>
                <Ionicons name="cash" size={16} color={colors.textSecondary} />
                <Text style={[styles.termText, { color: colors.textSecondary }]}>
                  Paiement à la livraison
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setTermsAccepted(!termsAccepted)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: termsAccepted ? colors.primary : colors.border,
                    backgroundColor: termsAccepted ? colors.primary : 'transparent',
                  },
                ]}
              >
                {termsAccepted && <Ionicons name="checkmark" size={16} color={colors.textInverse} />}
              </View>
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                J'accepte ces conditions de vente
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Footer avec bouton de soumission */}
        <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: termsAccepted && !loading ? colors.primary : colors.textSecondary },
            ]}
            onPress={handleSubmit}
            disabled={!termsAccepted || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <>
                <Ionicons name="send" size={20} color={colors.textInverse} />
                <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>Publier l'annonce</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
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
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 3, // Espace supplémentaire pour le clavier
    gap: SPACING.lg,
  },
  infoCard: {
    padding: SPACING.md,
    borderRadius: MarketplaceTheme.borderRadius.lg,
    gap: SPACING.sm,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  infoTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
  },
  infoValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  inputGroup: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: MarketplaceTheme.borderRadius.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  helperText: {
    fontSize: FONT_SIZES.xs,
    marginTop: SPACING.xs,
  },
  summaryCard: {
    padding: SPACING.md,
    borderRadius: MarketplaceTheme.borderRadius.lg,
    gap: SPACING.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  summaryNote: {
    fontSize: FONT_SIZES.xs,
  },
  termsSection: {
    gap: SPACING.sm,
  },
  termsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  termsCard: {
    padding: SPACING.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    gap: SPACING.sm,
  },
  termItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  termText: {
    fontSize: FONT_SIZES.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  footer: {
    padding: SPACING.md,
    borderTopWidth: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: MarketplaceTheme.borderRadius.lg,
    gap: SPACING.sm,
  },
  submitButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});

