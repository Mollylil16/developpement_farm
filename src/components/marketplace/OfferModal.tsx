/**
 * Modal pour créer une offre d'achat
 * Avec sélection de sujets, proposition de prix, et acceptation des conditions
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import SaleTermsDisplay from './SaleTermsDisplay';
import SubjectCard from './SubjectCard';
import type { SubjectCard as SubjectCardType } from '../../types/marketplace';
import { formatPrice, calculateTotalPrice } from '../../services/PricingService';

interface OfferModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    subjectIds: string[];
    proposedPrice: number;
    message?: string;
  }) => Promise<void>;
  subjects: SubjectCardType[];
  listingId: string;
  originalPrice: number;
}

export default function OfferModal({
  visible,
  onClose,
  onSubmit,
  subjects,
  listingId,
  originalPrice,
}: OfferModalProps) {
  const { colors, spacing, typography, borderRadius } = MarketplaceTheme;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [proposedPrice, setProposedPrice] = useState('');
  const [message, setMessage] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reset au montage/démontage
  useEffect(() => {
    if (!visible) {
      setSelectedIds(new Set());
      setProposedPrice('');
      setMessage('');
      setTermsAccepted(false);
    } else {
      // Pré-sélectionner tous les sujets disponibles
      setSelectedIds(new Set(subjects.filter((s) => s.available).map((s) => s.id)));
      // Pré-remplir avec le prix original
      setProposedPrice(originalPrice.toString());
    }
  }, [visible, subjects, originalPrice]);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const getSelectedSubjects = () => {
    return subjects.filter((s) => selectedIds.has(s.id));
  };

  const getTotalWeight = () => {
    return getSelectedSubjects().reduce((sum, s) => sum + s.weight, 0);
  };

  const getCalculatedTotal = () => {
    const price = parseFloat(proposedPrice) || 0;
    return price;
  };

  const getDifference = () => {
    const proposed = parseFloat(proposedPrice) || 0;
    return proposed - originalPrice;
  };

  const getDifferencePercent = () => {
    if (originalPrice === 0) return 0;
    return ((getDifference() / originalPrice) * 100).toFixed(1);
  };

  const handleSubmit = async () => {
    // Validations
    if (selectedIds.size === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un sujet');
      return;
    }

    const price = parseFloat(proposedPrice);
    if (!price || price <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un prix valide');
      return;
    }

    if (!termsAccepted) {
      Alert.alert(
        'Conditions de vente',
        'Vous devez accepter les conditions de vente pour continuer. Le transport et l\'abattage seront à votre charge.'
      );
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        subjectIds: Array.from(selectedIds),
        proposedPrice: price,
        message: message.trim() || undefined,
      });
      
      Alert.alert(
        'Offre envoyée',
        'Votre offre a été envoyée au producteur. Vous serez notifié de sa réponse.',
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible d\'envoyer l\'offre');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Faire une offre</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Sélection des sujets */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Sujets sélectionnés ({selectedIds.size})
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Poids total : {getTotalWeight().toFixed(1)} kg
            </Text>

            <View style={styles.subjectsList}>
              {subjects.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  onPress={() => toggleSelection(subject.id)}
                  selected={selectedIds.has(subject.id)}
                  selectable={true}
                  onSelect={() => toggleSelection(subject.id)}
                />
              ))}
            </View>
          </View>

          {/* Proposition de prix */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Votre offre</Text>
            
            <View style={[styles.priceInputContainer, { backgroundColor: colors.surface }]}>
              <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                Prix total proposé
              </Text>
              <View style={styles.priceInputRow}>
                <TextInput
                  style={[styles.priceInput, { color: colors.text }]}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={proposedPrice}
                  onChangeText={setProposedPrice}
                />
                <Text style={[styles.priceUnit, { color: colors.textSecondary }]}>FCFA</Text>
              </View>
            </View>

            {/* Comparaison prix */}
            <View style={[styles.priceComparison, { backgroundColor: colors.surfaceLight }]}>
              <View style={styles.comparisonRow}>
                <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>
                  Prix demandé
                </Text>
                <Text style={[styles.comparisonValue, { color: colors.text }]}>
                  {formatPrice(originalPrice)}
                </Text>
              </View>
              <View style={styles.comparisonRow}>
                <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>
                  Votre offre
                </Text>
                <Text style={[styles.comparisonValue, { color: colors.primary }]}>
                  {formatPrice(getCalculatedTotal())}
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              <View style={styles.comparisonRow}>
                <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>
                  Différence
                </Text>
                <Text
                  style={[
                    styles.comparisonValue,
                    {
                      color:
                        getDifference() >= 0
                          ? colors.success
                          : getDifference() > -originalPrice * 0.1
                          ? colors.warning
                          : colors.error,
                      fontWeight: typography.fontWeights.bold,
                    },
                  ]}
                >
                  {getDifference() >= 0 ? '+' : ''}
                  {formatPrice(getDifference())} ({getDifferencePercent()}%)
                </Text>
              </View>
            </View>
          </View>

          {/* Message optionnel */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Message (optionnel)
            </Text>
            <TextInput
              style={[
                styles.messageInput,
                { backgroundColor: colors.surface, color: colors.text },
              ]}
              placeholder="Ajoutez un message pour le producteur..."
              placeholderTextColor={colors.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={[styles.characterCount, { color: colors.textSecondary }]}>
              {message.length}/500
            </Text>
          </View>

          {/* Conditions de vente */}
          <View style={styles.section}>
            <SaleTermsDisplay expandable={true} />
            
            {/* Checkbox acceptation */}
            <TouchableOpacity
              style={styles.termsCheckbox}
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
                {termsAccepted && (
                  <Ionicons name="checkmark" size={16} color={colors.textInverse} />
                )}
              </View>
              <Text style={[styles.termsCheckboxText, { color: colors.text }]}>
                J'accepte les conditions de vente (transport et abattage à ma charge)
              </Text>
            </TouchableOpacity>

            {!termsAccepted && (
              <View style={[styles.warningBox, { backgroundColor: colors.warning + '15' }]}>
                <Ionicons name="warning" size={16} color={colors.warning} />
                <Text style={[styles.warningText, { color: colors.warning }]}>
                  Vous devez accepter les conditions pour continuer
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>Annuler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor:
                  selectedIds.size > 0 && proposedPrice && termsAccepted
                    ? colors.primary
                    : colors.textLight,
              },
            ]}
            onPress={handleSubmit}
            disabled={loading || selectedIds.size === 0 || !proposedPrice || !termsAccepted}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>
                Envoyer l'offre
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.md,
    ...MarketplaceTheme.shadows.small,
  },
  closeButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.xl,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: MarketplaceTheme.spacing.md,
  },
  section: {
    marginTop: MarketplaceTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
    marginBottom: MarketplaceTheme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    marginBottom: MarketplaceTheme.spacing.md,
  },
  subjectsList: {
    gap: MarketplaceTheme.spacing.sm,
  },
  priceInputContainer: {
    padding: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    ...MarketplaceTheme.shadows.small,
  },
  priceLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    marginBottom: MarketplaceTheme.spacing.xs,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.sm,
  },
  priceInput: {
    flex: 1,
    fontSize: MarketplaceTheme.typography.fontSizes.xxl,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  priceUnit: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
  },
  priceComparison: {
    marginTop: MarketplaceTheme.spacing.md,
    padding: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    gap: MarketplaceTheme.spacing.sm,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
  },
  comparisonValue: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  divider: {
    height: 1,
    marginVertical: MarketplaceTheme.spacing.xs,
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
  termsCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: MarketplaceTheme.spacing.md,
    gap: MarketplaceTheme.spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: MarketplaceTheme.borderRadius.xs,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsCheckboxText: {
    flex: 1,
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    lineHeight: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MarketplaceTheme.spacing.sm,
    padding: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.sm,
    marginTop: MarketplaceTheme.spacing.sm,
  },
  warningText: {
    flex: 1,
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
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

