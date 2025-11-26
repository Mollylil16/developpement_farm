/**
 * Modal pour répondre à une offre (Accepter / Rejeter)
 * Pour les producteurs
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import { formatPrice, formatDate } from '../../utils/formatters';
import type { Offer } from '../../types/marketplace';

interface OfferResponseModalProps {
  visible: boolean;
  onClose: () => void;
  offer: Offer | null;
  onAccept: (offerId: string) => Promise<void>;
  onReject: (offerId: string, reason?: string) => Promise<void>;
}

export default function OfferResponseModal({
  visible,
  onClose,
  offer,
  onAccept,
  onReject,
}: OfferResponseModalProps) {
  const { colors, spacing, typography, borderRadius } = MarketplaceTheme;

  const [action, setAction] = useState<'accept' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!offer) return null;

  const handleAccept = async () => {
    Alert.alert(
      'Accepter l\'offre',
      'En acceptant cette offre, une transaction sera créée et le sujet sera réservé. Vous pourrez ensuite coordonner la livraison avec l\'acheteur.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter',
          onPress: async () => {
            try {
              setLoading(true);
              await onAccept(offer.id);
              Alert.alert(
                'Offre acceptée',
                'La transaction a été créée. Vous pouvez maintenant discuter avec l\'acheteur pour organiser la livraison.',
                [{ text: 'OK', onPress: onClose }]
              );
            } catch (error: any) {
              Alert.alert('Erreur', error.message || 'Impossible d\'accepter l\'offre');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (action === 'reject' && !rejectReason.trim()) {
      Alert.alert(
        'Motif requis',
        'Veuillez indiquer un motif de refus pour informer l\'acheteur.'
      );
      return;
    }

    Alert.alert(
      'Refuser l\'offre',
      'Êtes-vous sûr de vouloir refuser cette offre ? L\'acheteur sera notifié.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await onReject(offer.id, rejectReason.trim() || undefined);
              Alert.alert('Offre refusée', 'L\'acheteur a été notifié du refus.', [
                { text: 'OK', onPress: onClose },
              ]);
            } catch (error: any) {
              Alert.alert('Erreur', error.message || 'Impossible de refuser l\'offre');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const priceDifference = offer.proposedPrice - offer.originalPrice;
  const priceDifferencePercent = ((priceDifference / offer.originalPrice) * 100).toFixed(1);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Répondre à l'offre
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Info acheteur */}
            <View style={[styles.section, { backgroundColor: colors.surfaceLight }]}>
              <View style={styles.buyerRow}>
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Ionicons name="person" size={24} color={colors.textInverse} />
                </View>
                <View style={styles.buyerInfo}>
                  <Text style={[styles.buyerName, { color: colors.text }]}>
                    {offer.buyerName || 'Acheteur'}
                  </Text>
                  <Text style={[styles.offerDate, { color: colors.textSecondary }]}>
                    Offre reçue le {formatDate(offer.createdAt)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Détails de l'offre */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Détails de l'offre
              </Text>

              <View style={[styles.detailsBox, { backgroundColor: colors.surface }]}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Nombre de sujets
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {offer.subjectIds.length}
                  </Text>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Prix demandé
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {formatPrice(offer.originalPrice)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Prix proposé
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.primary, fontWeight: typography.fontWeights.bold }]}>
                    {formatPrice(offer.proposedPrice)}
                  </Text>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Différence
                  </Text>
                  <Text
                    style={[
                      styles.detailValue,
                      {
                        color:
                          priceDifference >= 0
                            ? colors.success
                            : priceDifference > -offer.originalPrice * 0.1
                            ? colors.warning
                            : colors.error,
                        fontWeight: typography.fontWeights.bold,
                      },
                    ]}
                  >
                    {priceDifference >= 0 ? '+' : ''}
                    {formatPrice(priceDifference)} ({priceDifferencePercent}%)
                  </Text>
                </View>
              </View>
            </View>

            {/* Message de l'acheteur */}
            {offer.message && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Message de l'acheteur
                </Text>
                <View style={[styles.messageBox, { backgroundColor: colors.surfaceLight }]}>
                  <Text style={[styles.messageText, { color: colors.text }]}>
                    {offer.message}
                  </Text>
                </View>
              </View>
            )}

            {/* Actions */}
            {!action && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Que souhaitez-vous faire ?
                </Text>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.success }]}
                  onPress={() => setAction('accept')}
                >
                  <Ionicons name="checkmark-circle" size={24} color={colors.textInverse} />
                  <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>
                    Accepter l'offre
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.error }]}
                  onPress={() => setAction('reject')}
                >
                  <Ionicons name="close-circle" size={24} color={colors.textInverse} />
                  <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>
                    Refuser l'offre
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Confirmation Accepter */}
            {action === 'accept' && (
              <View style={styles.section}>
                <View style={[styles.confirmBox, { backgroundColor: colors.success + '15', borderColor: colors.success }]}>
                  <Ionicons name="information-circle" size={24} color={colors.success} />
                  <Text style={[styles.confirmText, { color: colors.success }]}>
                    En acceptant cette offre, une transaction sera créée et vous pourrez coordonner la livraison avec l'acheteur via le chat.
                  </Text>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: colors.border }]}
                    onPress={() => setAction(null)}
                  >
                    <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                      Retour
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: colors.success }]}
                    onPress={handleAccept}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.textInverse} />
                    ) : (
                      <Text style={[styles.primaryButtonText, { color: colors.textInverse }]}>
                        Confirmer
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Confirmation Refuser */}
            {action === 'reject' && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Motif du refus
                </Text>
                <TextInput
                  style={[
                    styles.rejectInput,
                    { backgroundColor: colors.surface, color: colors.text },
                  ]}
                  placeholder="Expliquez pourquoi vous refusez cette offre..."
                  placeholderTextColor={colors.textSecondary}
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  multiline
                  numberOfLines={4}
                  maxLength={300}
                  textAlignVertical="top"
                />
                <Text style={[styles.characterCount, { color: colors.textSecondary }]}>
                  {rejectReason.length}/300
                </Text>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: colors.border }]}
                    onPress={() => setAction(null)}
                  >
                    <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                      Retour
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: colors.error }]}
                    onPress={handleReject}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.textInverse} />
                    ) : (
                      <Text style={[styles.primaryButtonText, { color: colors.textInverse }]}>
                        Confirmer le refus
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
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
    marginBottom: MarketplaceTheme.spacing.md,
  },
  buyerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.md,
    padding: MarketplaceTheme.spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyerInfo: {
    flex: 1,
  },
  buyerName: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  offerDate: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  detailsBox: {
    padding: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    ...MarketplaceTheme.shadows.small,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: MarketplaceTheme.spacing.xs,
  },
  detailLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
  },
  detailValue: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  divider: {
    height: 1,
    marginVertical: MarketplaceTheme.spacing.xs,
  },
  messageBox: {
    padding: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
  },
  messageText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    lineHeight: 22,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: MarketplaceTheme.spacing.sm,
    paddingVertical: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    marginBottom: MarketplaceTheme.spacing.sm,
    ...MarketplaceTheme.shadows.small,
  },
  actionButtonText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  confirmBox: {
    flexDirection: 'row',
    gap: MarketplaceTheme.spacing.sm,
    padding: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    borderWidth: 1,
    marginBottom: MarketplaceTheme.spacing.md,
  },
  confirmText: {
    flex: 1,
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    lineHeight: 20,
  },
  rejectInput: {
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
    marginBottom: MarketplaceTheme.spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: MarketplaceTheme.spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  primaryButton: {
    flex: 2,
    paddingVertical: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
});

