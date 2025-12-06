/**
 * Modal pour ajouter plusieurs sujets en vente sur le marketplace
 * Permet la sélection multiple depuis le cheptel
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import SaleTermsDisplay from './SaleTermsDisplay';
import type { ProductionAnimal } from '../../types/production';

interface BatchAddModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (subjectIds: string[], pricePerKg: number) => Promise<void>;
  availableSubjects: ProductionAnimal[];
}

export default function BatchAddModal({
  visible,
  onClose,
  onSubmit,
  availableSubjects,
}: BatchAddModalProps) {
  const { colors, spacing, typography, borderRadius } = MarketplaceTheme;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pricePerKg, setPricePerKg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Reset quand le modal se ferme
  useEffect(() => {
    if (!visible) {
      setSelectedIds(new Set());
      setPricePerKg('');
      setSearchQuery('');
      setTermsAccepted(false);
    }
  }, [visible]);

  // Filtrer les sujets selon la recherche
  const filteredSubjects = availableSubjects.filter((subject) => {
    const query = searchQuery.toLowerCase();
    return (
      subject.code?.toLowerCase().includes(query) ||
      subject.race?.toLowerCase().includes(query) ||
      subject.nom?.toLowerCase().includes(query)
    );
  });

  // Toggle sélection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Sélectionner tous
  const selectAll = () => {
    setSelectedIds(new Set(filteredSubjects.map((s) => s.id)));
  };

  // Désélectionner tous
  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Calculer le poids total sélectionné
  const getTotalWeight = (): number => {
    return availableSubjects
      .filter((s) => selectedIds.has(s.id))
      .reduce((sum, s) => sum + (s.poids_initial || 0), 0);
  };

  // Calculer le prix total estimé
  const getEstimatedTotal = (): number => {
    const price = parseFloat(pricePerKg) || 0;
    return getTotalWeight() * price;
  };

  // Valider et soumettre
  const handleSubmit = async () => {
    // Validations
    if (selectedIds.size === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un sujet');
      return;
    }

    const price = parseFloat(pricePerKg);
    if (!price || price <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un prix/kg valide');
      return;
    }

    if (!termsAccepted) {
      Alert.alert(
        'Erreur',
        'Veuillez accepter les conditions de vente avant de continuer'
      );
      return;
    }

    try {
      setLoading(true);
      await onSubmit(Array.from(selectedIds), price);
      Alert.alert(
        'Succès',
        `${selectedIds.size} sujet(s) mis en vente avec succès !`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de mettre en vente');
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Ajouter des sujets en vente
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Barre de recherche */}
          <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Rechercher par code, race..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Actions rapides */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: colors.border }]}
              onPress={selectAll}
            >
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                Tout sélectionner
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: colors.border }]}
              onPress={deselectAll}
            >
              <Text style={[styles.actionButtonText, { color: colors.textSecondary }]}>
                Tout désélectionner
              </Text>
            </TouchableOpacity>
          </View>

          {/* Compteur */}
          <View style={[styles.counter, { backgroundColor: colors.surfaceLight }]}>
            <Text style={[styles.counterText, { color: colors.text }]}>
              {selectedIds.size} sujet(s) sélectionné(s)
            </Text>
            {selectedIds.size > 0 && (
              <Text style={[styles.counterWeight, { color: colors.textSecondary }]}>
                Poids total : {getTotalWeight().toFixed(1)} kg
              </Text>
            )}
          </View>

          {/* Liste des sujets */}
          <View style={styles.subjectsList}>
            {filteredSubjects.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Aucun sujet disponible
                </Text>
              </View>
            ) : (
              filteredSubjects.map((subject) => {
                const isSelected = selectedIds.has(subject.id);
                return (
                  <TouchableOpacity
                    key={subject.id}
                    style={[
                      styles.subjectItem,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => toggleSelection(subject.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color={colors.textInverse} />
                      )}
                    </View>
                    <View style={styles.subjectInfo}>
                      <Text style={[styles.subjectCode, { color: colors.text }]}>
                        #{subject.code}
                      </Text>
                      <Text style={[styles.subjectDetails, { color: colors.textSecondary }]}>
                        {subject.race || 'N/A'} • {subject.poids_initial || 0} kg
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* Prix */}
          <View style={styles.pricingSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Prix de vente
            </Text>
            <View style={[styles.priceInput, { backgroundColor: colors.surface }]}>
              <TextInput
                style={[styles.priceInputField, { color: colors.text }]}
                placeholder="Prix par kg"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={pricePerKg}
                onChangeText={setPricePerKg}
              />
              <Text style={[styles.priceUnit, { color: colors.textSecondary }]}>FCFA/kg</Text>
            </View>
            {selectedIds.size > 0 && pricePerKg && (
              <View style={[styles.priceEstimate, { backgroundColor: colors.surfaceLight }]}>
                <Text style={[styles.priceEstimateLabel, { color: colors.textSecondary }]}>
                  Prix total estimé
                </Text>
                <Text style={[styles.priceEstimateValue, { color: colors.primary }]}>
                  {getEstimatedTotal().toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
            )}
          </View>

          {/* Conditions de vente */}
          <View style={styles.termsSection}>
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
                J'accepte les conditions de vente (transport et abattage à la charge de
                l'acheteur)
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Footer avec bouton de soumission */}
        <View style={[styles.footer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor:
                  selectedIds.size > 0 && pricePerKg && termsAccepted
                    ? colors.primary
                    : colors.textLight,
              },
            ]}
            onPress={handleSubmit}
            disabled={loading || selectedIds.size === 0 || !pricePerKg || !termsAccepted}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>
                Mettre en vente ({selectedIds.size})
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
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: MarketplaceTheme.spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.md,
    marginVertical: MarketplaceTheme.spacing.md,
    gap: MarketplaceTheme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: MarketplaceTheme.typography.fontSizes.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: MarketplaceTheme.spacing.sm,
    marginBottom: MarketplaceTheme.spacing.md,
  },
  actionButton: {
    flex: 1,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    fontWeight: MarketplaceTheme.typography.fontWeights.medium,
  },
  counter: {
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.md,
    marginBottom: MarketplaceTheme.spacing.md,
  },
  counterText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  counterWeight: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    marginTop: 2,
  },
  subjectsList: {
    marginBottom: MarketplaceTheme.spacing.md,
  },
  subjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    marginBottom: MarketplaceTheme.spacing.sm,
    borderWidth: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: MarketplaceTheme.borderRadius.xs,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: MarketplaceTheme.spacing.md,
  },
  subjectInfo: {
    flex: 1,
  },
  subjectCode: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  subjectDetails: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: MarketplaceTheme.spacing.xxl,
  },
  emptyText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    marginTop: MarketplaceTheme.spacing.sm,
  },
  pricingSection: {
    marginBottom: MarketplaceTheme.spacing.md,
  },
  sectionTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.md,
  },
  priceInputField: {
    flex: 1,
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  priceUnit: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
  },
  priceEstimate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.md,
    marginTop: MarketplaceTheme.spacing.sm,
  },
  priceEstimateLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
  },
  priceEstimateValue: {
    fontSize: MarketplaceTheme.typography.fontSizes.xl,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
  termsSection: {
    marginBottom: MarketplaceTheme.spacing.xxl,
  },
  termsCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: MarketplaceTheme.spacing.md,
  },
  termsCheckboxText: {
    flex: 1,
    fontSize: MarketplaceTheme.typography.fontSizes.sm,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.md,
    ...MarketplaceTheme.shadows.medium,
  },
  submitButton: {
    paddingVertical: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: MarketplaceTheme.typography.fontSizes.lg,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
});

