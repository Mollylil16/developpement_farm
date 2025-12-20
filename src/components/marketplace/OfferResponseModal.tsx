/**
 * Modal de réponse à une offre
 * Accepter, refuser ou contre-proposer
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
import { formatDate } from '../../utils/formatters';
import { formatPrice } from '../../services/PricingService';
import type { Offer } from '../../types/marketplace';

interface OfferResponseModalProps {
  visible: boolean;
  onClose: () => void;
  offer: Offer | null;
  onAccept: () => Promise<void>;
  onReject: (reason?: string) => Promise<void>;
  onCounter: (newPrice: number, message?: string) => Promise<void>;
}

type ResponseAction = 'accept' | 'reject' | 'counter';

export default function OfferResponseModal({
  visible,
  onClose,
  offer,
  onAccept,
  onReject,
  onCounter,
}: OfferResponseModalProps) {
  const { colors, spacing, typography, borderRadius } = MarketplaceTheme;

  const [action, setAction] = useState<ResponseAction | null>(null);
  const [message, setMessage] = useState('');
  const [counterPrice, setCounterPrice] = useState('');
  const [loading, setLoading] = useState(false);

  if (!offer) return null;

  const resetModal = () => {
    setAction(null);
    setMessage('');
    setCounterPrice('');
    setLoading(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleSubmit = async () => {
    if (!action) return;

    try {
      setLoading(true);

      switch (action) {
        case 'accept':
          await onAccept();
          Alert.alert('Offre acceptée', "L'offre a été acceptée. Une transaction a été créée.", [
            { text: 'OK', onPress: handleClose },
          ]);
          break;

        case 'reject':
          await onReject(message.trim() || undefined);
          Alert.alert('Offre refusée', "L'offre a été refusée. L'acheteur sera notifié.", [
            { text: 'OK', onPress: handleClose },
          ]);
          break;

        case 'counter':
          const price = parseFloat(counterPrice);
          if (isNaN(price) || price <= 0) {
            Alert.alert('Erreur', 'Veuillez entrer un prix valide');
            setLoading(false);
            return;
          }
          await onCounter(price, message.trim() || undefined);
          Alert.alert(
            'Contre-proposition envoyée',
            "Votre contre-proposition a été envoyée à l'acheteur.",
            [{ text: 'OK', onPress: handleClose }]
          );
          break;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderActionSelection = () => (
    <>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Choisissez une action</Text>

      <TouchableOpacity
        testID="accept-action-card"
        style={[
          styles.actionCard,
          { backgroundColor: colors.success + '10', borderColor: colors.success },
          action === 'accept' && styles.actionCardSelected,
        ]}
        onPress={() => setAction('accept')}
      >
        <Ionicons name="checkmark-circle" size={32} color={colors.success} />
        <View style={styles.actionContent}>
          <Text style={[styles.actionTitle, { color: colors.success }]}>Accepter l'offre</Text>
          <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
            Une transaction sera créée au prix proposé
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        testID="counter-action-card"
        style={[
          styles.actionCard,
          { backgroundColor: colors.primary + '10', borderColor: colors.primary },
          action === 'counter' && styles.actionCardSelected,
        ]}
        onPress={() => setAction('counter')}
      >
        <Ionicons name="swap-horizontal" size={32} color={colors.primary} />
        <View style={styles.actionContent}>
          <Text style={[styles.actionTitle, { color: colors.primary }]}>Contre-proposer</Text>
          <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
            Proposer un autre prix
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        testID="reject-action-card"
        style={[
          styles.actionCard,
          { backgroundColor: colors.error + '10', borderColor: colors.error },
          action === 'reject' && styles.actionCardSelected,
        ]}
        onPress={() => setAction('reject')}
      >
        <Ionicons name="close-circle" size={32} color={colors.error} />
        <View style={styles.actionContent}>
          <Text style={[styles.actionTitle, { color: colors.error }]}>Refuser l'offre</Text>
          <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
            L'acheteur sera notifié du refus
          </Text>
        </View>
      </TouchableOpacity>
    </>
  );

  const renderActionDetails = () => {
    if (!action) return null;

    return (
      <>
        {action === 'counter' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Nouveau prix *</Text>
            <View style={[styles.priceInputContainer, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.priceInput, { color: colors.text }]}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                value={counterPrice}
                onChangeText={setCounterPrice}
                keyboardType="numeric"
              />
              <Text style={[styles.priceSuffix, { color: colors.textSecondary }]}>FCFA</Text>
            </View>
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              Prix original : {formatPrice(offer.originalPrice)}
            </Text>
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              Prix proposé : {formatPrice(offer.proposedPrice)}
            </Text>
          </View>
        )}

        {(action === 'reject' || action === 'counter') && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Message {action === 'counter' ? '(optionnel)' : '(recommandé)'}
            </Text>
            <TextInput
              style={[styles.messageInput, { backgroundColor: colors.surface, color: colors.text }]}
              placeholder={
                action === 'counter'
                  ? 'Expliquez votre contre-proposition...'
                  : 'Expliquez la raison du refus...'
              }
              placeholderTextColor={colors.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              maxLength={300}
              textAlignVertical="top"
            />
            <Text style={[styles.characterCount, { color: colors.textSecondary }]}>
              {message.length}/300
            </Text>
          </View>
        )}
      </>
    );
  };

  const canSubmit = () => {
    if (!action || loading) return false;
    if (action === 'counter' && (!counterPrice || parseFloat(counterPrice) <= 0)) {
      return false;
    }
    return true;
  };

  const getSubmitButtonText = () => {
    switch (action) {
      case 'accept':
        return "Accepter l'offre";
      case 'counter':
        return 'Envoyer la contre-proposition';
      case 'reject':
        return "Refuser l'offre";
      default:
        return 'Confirmer';
    }
  };

  const getSubmitButtonColor = () => {
    switch (action) {
      case 'accept':
        return colors.success;
      case 'counter':
        return colors.primary;
      case 'reject':
        return colors.error;
      default:
        return colors.primary;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Répondre à l'offre</Text>
            <TouchableOpacity
              testID="close-button"
              onPress={handleClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Info offre */}
            <View style={[styles.section, { backgroundColor: colors.surfaceLight }]}>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Acheteur</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{offer.buyerId}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="pricetag-outline" size={20} color={colors.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Sujets</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {offer.subjectIds.length} sujet(s)
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="cash-outline" size={20} color={colors.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Prix proposé
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.primary }]}>
                    {formatPrice(offer.proposedPrice)}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Date de l'offre
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {formatDate(offer.createdAt)}
                  </Text>
                </View>
              </View>

              {offer.message && (
                <View style={styles.messageBox}>
                  <Text style={[styles.messageLabel, { color: colors.textSecondary }]}>
                    Message :
                  </Text>
                  <Text style={[styles.messageText, { color: colors.text }]}>{offer.message}</Text>
                </View>
              )}
            </View>

            {/* Sélection action */}
            <View style={styles.section}>{renderActionSelection()}</View>

            {/* Détails action */}
            {renderActionDetails()}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="submit-button"
              style={[
                styles.submitButton,
                {
                  backgroundColor: canSubmit() ? getSubmitButtonColor() : colors.textLight,
                },
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit()}
            >
              {loading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>
                  {getSubmitButtonText()}
                </Text>
              )}
            </TouchableOpacity>
          </View>
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
  sectionTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
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
  messageBox: {
    marginTop: MarketplaceTheme.spacing.sm,
    paddingTop: MarketplaceTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: MarketplaceTheme.colors.divider,
  },
  messageLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    marginBottom: 4,
  },
  messageText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    lineHeight: 20,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.md,
    padding: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    borderWidth: 2,
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  actionCardSelected: {
    borderWidth: 3,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.md,
    ...MarketplaceTheme.shadows.small,
  },
  priceInput: {
    flex: 1,
    fontSize: MarketplaceTheme.typography.fontSizes.xl,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  priceSuffix: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  helperText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    marginTop: MarketplaceTheme.spacing.xs,
  },
  messageInput: {
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
  submitButton: {
    flex: 2,
    paddingVertical: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
});
