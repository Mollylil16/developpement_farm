/**
 * Modal de confirmation de livraison
 * Double confirmation (producteur + acheteur)
 */

import React, { useState } from 'react';
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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import { formatDate } from '../../utils/formatters';
import { formatPrice } from '../../services/PricingService';
import type { Transaction } from '../../types/marketplace';

interface DeliveryConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  userRole: 'producer' | 'buyer';
  onConfirm: (data: { notes?: string; photos?: string[] }) => Promise<void>;
}

export default function DeliveryConfirmationModal({
  visible,
  onClose,
  transaction,
  userRole,
  onConfirm,
}: DeliveryConfirmationModalProps) {
  const { colors, spacing, typography, borderRadius } = MarketplaceTheme;

  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  if (!transaction) return null;

  const isProducer = userRole === 'producer';
  const alreadyConfirmed = transaction.deliveryDetails
    ? isProducer
      ? transaction.deliveryDetails.producerConfirmed
      : transaction.deliveryDetails.buyerConfirmed
    : false;

  const counterpartConfirmed = transaction.deliveryDetails
    ? isProducer
      ? transaction.deliveryDetails.buyerConfirmed
      : transaction.deliveryDetails.producerConfirmed
    : false;

  const handleConfirm = async () => {
    Alert.alert(
      'Confirmer la livraison',
      isProducer
        ? "Confirmez-vous avoir livré les sujets à l'acheteur ?"
        : 'Confirmez-vous avoir reçu les sujets du producteur ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              setLoading(true);
              await onConfirm({
                notes: notes.trim() || undefined,
                photos: photos.length > 0 ? photos : undefined,
              });

              if (counterpartConfirmed) {
                Alert.alert(
                  'Transaction terminée',
                  'La livraison a été confirmée par les deux parties. La transaction est maintenant terminée. Vous pouvez maintenant noter votre partenaire.',
                  [{ text: 'OK', onPress: onClose }]
                );
              } else {
                Alert.alert(
                  'Confirmation enregistrée',
                  "Votre confirmation a été enregistrée. En attente de la confirmation de l'autre partie.",
                  [{ text: 'OK', onPress: onClose }]
                );
              }
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : 'Impossible de confirmer la livraison';
              Alert.alert('Erreur', errorMessage);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Confirmation de livraison
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Info transaction */}
            <View style={[styles.section, { backgroundColor: colors.surfaceLight }]}>
              <View style={styles.infoRow}>
                <Ionicons name="pricetag-outline" size={20} color={colors.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Nombre de sujets
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {transaction.subjectIds.length}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="cash-outline" size={20} color={colors.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Montant</Text>
                  <Text style={[styles.infoValue, { color: colors.primary }]}>
                    {formatPrice(transaction.finalPrice)}
                  </Text>
                </View>
              </View>

              {transaction.deliveryDetails?.scheduledDate && (
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                  <View style={styles.infoContent}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      Date de livraison
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {formatDate(transaction.deliveryDetails.scheduledDate)}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Statut confirmation */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Statut de confirmation
              </Text>

              <View style={[styles.statusBox, { backgroundColor: colors.surface }]}>
                <View style={styles.statusRow}>
                  <Ionicons
                    name={
                      transaction.deliveryDetails?.producerConfirmed
                        ? 'checkmark-circle'
                        : 'ellipse-outline'
                    }
                    size={24}
                    color={
                      transaction.deliveryDetails?.producerConfirmed
                        ? colors.success
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: transaction.deliveryDetails?.producerConfirmed
                          ? colors.success
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    Producteur
                  </Text>
                </View>

                <View style={styles.statusRow}>
                  <Ionicons
                    name={
                      transaction.deliveryDetails?.buyerConfirmed
                        ? 'checkmark-circle'
                        : 'ellipse-outline'
                    }
                    size={24}
                    color={
                      transaction.deliveryDetails?.buyerConfirmed
                        ? colors.success
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: transaction.deliveryDetails?.buyerConfirmed
                          ? colors.success
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    Acheteur
                  </Text>
                </View>
              </View>

              {!alreadyConfirmed && (
                <View
                  style={[
                    styles.infoBox,
                    { backgroundColor: colors.primary + '10', borderColor: colors.primary },
                  ]}
                >
                  <Ionicons name="information-circle" size={20} color={colors.primary} />
                  <Text style={[styles.infoBoxText, { color: colors.primary }]}>
                    {isProducer
                      ? "Confirmez avoir livré les sujets à l'acheteur"
                      : 'Confirmez avoir reçu les sujets du producteur'}
                  </Text>
                </View>
              )}

              {alreadyConfirmed && (
                <View
                  style={[
                    styles.infoBox,
                    { backgroundColor: colors.success + '10', borderColor: colors.success },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={[styles.infoBoxText, { color: colors.success }]}>
                    Vous avez déjà confirmé la livraison
                  </Text>
                </View>
              )}
            </View>

            {/* Notes */}
            {!alreadyConfirmed && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes (optionnel)</Text>
                <TextInput
                  style={[
                    styles.notesInput,
                    { backgroundColor: colors.surface, color: colors.text },
                  ]}
                  placeholder={
                    isProducer ? 'Informations sur la livraison...' : 'État des sujets reçus...'
                  }
                  placeholderTextColor={colors.textSecondary}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  maxLength={300}
                  textAlignVertical="top"
                />
                <Text style={[styles.characterCount, { color: colors.textSecondary }]}>
                  {notes.length}/300
                </Text>
              </View>
            )}

            {/* Photos (fonctionnalité future) */}
            {!alreadyConfirmed && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Photos (optionnel)
                </Text>
                <TouchableOpacity
                  style={[styles.photoButton, { backgroundColor: colors.surface }]}
                  onPress={() =>
                    Alert.alert(
                      'Bientôt disponible',
                      "L'ajout de photos sera disponible prochainement"
                    )
                  }
                >
                  <Ionicons name="camera-outline" size={24} color={colors.textSecondary} />
                  <Text style={[styles.photoButtonText, { color: colors.textSecondary }]}>
                    Ajouter des photos
                  </Text>
                </TouchableOpacity>

                {photos.length > 0 && (
                  <View style={styles.photosPreview}>
                    {photos.map((photo, index) => (
                      <Image key={index} source={{ uri: photo }} style={styles.photoPreview} />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Rappel conditions */}
            <View style={styles.section}>
              <View style={[styles.reminderBox, { backgroundColor: colors.warning + '15' }]}>
                <Ionicons name="alert-circle-outline" size={20} color={colors.warning} />
                <Text style={[styles.reminderText, { color: colors.text }]}>
                  La transaction sera terminée une fois que les deux parties auront confirmé la
                  livraison. Après cela, vous pourrez noter votre partenaire.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          {!alreadyConfirmed && (
            <View style={[styles.footer, { backgroundColor: colors.surface }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={onClose}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: colors.success }]}
                onPress={handleConfirm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <Text style={[styles.confirmButtonText, { color: colors.textInverse }]}>
                    Confirmer la livraison
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '90%',
    borderTopLeftRadius: MarketplaceTheme.borderRadius.lg,
    borderTopRightRadius: MarketplaceTheme.borderRadius.lg,
    ...MarketplaceTheme.shadows.large,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.xl,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  closeButton: {
    padding: MarketplaceTheme.spacing.xs,
  },
  content: {
    paddingHorizontal: MarketplaceTheme.spacing.md,
  },
  section: {
    marginTop: MarketplaceTheme.spacing.lg,
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.sm,
  },
  infoContent: {
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
  sectionTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  statusBox: {
    padding: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    gap: MarketplaceTheme.spacing.sm,
    ...MarketplaceTheme.shadows.small,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.sm,
  },
  statusText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: MarketplaceTheme.spacing.sm,
    padding: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    borderWidth: 1,
    marginTop: MarketplaceTheme.spacing.sm,
  },
  infoBoxText: {
    flex: 1,
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    lineHeight: 20,
  },
  notesInput: {
    padding: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    minHeight: 100,
    ...MarketplaceTheme.shadows.small,
  },
  characterCount: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    textAlign: 'right',
    marginTop: MarketplaceTheme.spacing.xs,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: MarketplaceTheme.spacing.sm,
    paddingVertical: MarketplaceTheme.spacing.lg,
    borderRadius: MarketplaceTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: MarketplaceTheme.colors.border,
    borderStyle: 'dashed',
  },
  photoButtonText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
  },
  photosPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: MarketplaceTheme.spacing.sm,
    marginTop: MarketplaceTheme.spacing.sm,
  },
  photoPreview: {
    width: 80,
    height: 80,
    borderRadius: MarketplaceTheme.borderRadius.sm,
  },
  reminderBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: MarketplaceTheme.spacing.sm,
    padding: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
  },
  reminderText: {
    flex: 1,
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: MarketplaceTheme.spacing.sm,
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.md,
    ...MarketplaceTheme.shadows.medium,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  confirmButton: {
    flex: 2,
    paddingVertical: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
});
