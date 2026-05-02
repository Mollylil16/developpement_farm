/**
 * Modal de filtres pour le Marketplace
 * Filtres avancés : prix, distance, race, poids, âge
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MarketplaceTheme } from '../../styles/marketplace.theme';
import type { MarketplaceFilters as Filters } from '../../types/marketplace';

interface MarketplaceFiltersProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: Filters) => void;
  initialFilters?: Filters;
}

export default function MarketplaceFilters({
  visible,
  onClose,
  onApply,
  initialFilters,
}: MarketplaceFiltersProps) {
  const { colors, spacing, typography, borderRadius } = MarketplaceTheme;

  const [filters, setFilters] = useState<Filters>(
    initialFilters || {
      minPrice: undefined,
      maxPrice: undefined,
      minWeight: undefined,
      maxWeight: undefined,
      minAge: undefined,
      maxAge: undefined,
      race: undefined,
    }
  );

  const handleApply = () => {
    // Nettoyer les valeurs vides
    const cleanedFilters: Filters = {};

    if (filters.minPrice !== undefined && filters.minPrice > 0) {
      cleanedFilters.minPrice = filters.minPrice;
    }
    if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
      cleanedFilters.maxPrice = filters.maxPrice;
    }
    if (filters.minWeight !== undefined && filters.minWeight > 0) {
      cleanedFilters.minWeight = filters.minWeight;
    }
    if (filters.maxWeight !== undefined && filters.maxWeight > 0) {
      cleanedFilters.maxWeight = filters.maxWeight;
    }
    if (filters.minAge !== undefined && filters.minAge > 0) {
      cleanedFilters.minAge = filters.minAge;
    }
    if (filters.maxAge !== undefined && filters.maxAge > 0) {
      cleanedFilters.maxAge = filters.maxAge;
    }
    if (filters.race && filters.race.trim()) {
      cleanedFilters.race = filters.race.trim();
    }

    onApply(cleanedFilters);
    onClose();
  };

  const handleReset = () => {
    setFilters({});
    onApply({});
    onClose();
  };

  const countActiveFilters = (): number => {
    let count = 0;
    if (filters.minPrice || filters.maxPrice) count++;
    if (filters.minWeight || filters.maxWeight) count++;
    if (filters.minAge || filters.maxAge) count++;
    if (filters.race) count++;
    return count;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Filtres</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filtersContainer} showsVerticalScrollIndicator={false}>
            {/* Prix */}
            <View style={styles.filterSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <Ionicons name="cash-outline" size={18} color={colors.primary} /> Prix (FCFA)
              </Text>
              <View style={styles.rangeInputs}>
                <View style={styles.rangeInput}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Minimum</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={filters.minPrice?.toString() || ''}
                    onChangeText={(text) =>
                      setFilters({ ...filters, minPrice: parseInt(text) || undefined })
                    }
                  />
                </View>
                <Text style={[styles.rangeSeparator, { color: colors.textSecondary }]}>à</Text>
                <View style={styles.rangeInput}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Maximum</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                    placeholder="Illimité"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={filters.maxPrice?.toString() || ''}
                    onChangeText={(text) =>
                      setFilters({ ...filters, maxPrice: parseInt(text) || undefined })
                    }
                  />
                </View>
              </View>
            </View>

            {/* Poids */}
            <View style={styles.filterSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <Ionicons name="scale-outline" size={18} color={colors.primary} /> Poids (kg)
              </Text>
              <View style={styles.rangeInputs}>
                <View style={styles.rangeInput}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Minimum</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={filters.minWeight?.toString() || ''}
                    onChangeText={(text) =>
                      setFilters({ ...filters, minWeight: parseInt(text) || undefined })
                    }
                  />
                </View>
                <Text style={[styles.rangeSeparator, { color: colors.textSecondary }]}>à</Text>
                <View style={styles.rangeInput}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Maximum</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                    placeholder="Illimité"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={filters.maxWeight?.toString() || ''}
                    onChangeText={(text) =>
                      setFilters({ ...filters, maxWeight: parseInt(text) || undefined })
                    }
                  />
                </View>
              </View>
            </View>

            {/* Âge */}
            <View style={styles.filterSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} /> Âge (mois)
              </Text>
              <View style={styles.rangeInputs}>
                <View style={styles.rangeInput}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Minimum</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={filters.minAge?.toString() || ''}
                    onChangeText={(text) =>
                      setFilters({ ...filters, minAge: parseInt(text) || undefined })
                    }
                  />
                </View>
                <Text style={[styles.rangeSeparator, { color: colors.textSecondary }]}>à</Text>
                <View style={styles.rangeInput}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Maximum</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                    placeholder="Illimité"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={filters.maxAge?.toString() || ''}
                    onChangeText={(text) =>
                      setFilters({ ...filters, maxAge: parseInt(text) || undefined })
                    }
                  />
                </View>
              </View>
            </View>

            {/* Race */}
            <View style={styles.filterSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <Ionicons name="paw-outline" size={18} color={colors.primary} /> Race
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                placeholder="Ex: Duroc, Large White..."
                placeholderTextColor={colors.textSecondary}
                value={filters.race || ''}
                onChangeText={(text) => setFilters({ ...filters, race: text })}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.divider }]}>
            <TouchableOpacity
              style={[styles.resetButton, { borderColor: colors.border }]}
              onPress={handleReset}
            >
              <Text style={[styles.resetButtonText, { color: colors.text }]}>Réinitialiser</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: colors.primary }]}
              onPress={handleApply}
            >
              <Text style={[styles.applyButtonText, { color: colors.textInverse }]}>
                Appliquer {countActiveFilters() > 0 && `(${countActiveFilters()})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: MarketplaceTheme.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '85%',
    borderTopLeftRadius: MarketplaceTheme.borderRadius.lg,
    borderTopRightRadius: MarketplaceTheme.borderRadius.lg,
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
  filtersContainer: {
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.md,
  },
  filterSection: {
    marginBottom: MarketplaceTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  rangeInputs: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: MarketplaceTheme.spacing.sm,
  },
  rangeInput: {
    flex: 1,
  },
  rangeSeparator: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    marginBottom: MarketplaceTheme.spacing.sm,
  },
  inputLabel: {
    fontSize: MarketplaceTheme.typography.fontSizes.xs,
    marginBottom: MarketplaceTheme.spacing.xs,
  },
  input: {
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.sm,
    borderRadius: MarketplaceTheme.borderRadius.md,
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    ...MarketplaceTheme.shadows.small,
  },
  footer: {
    flexDirection: 'row',
    gap: MarketplaceTheme.spacing.sm,
    paddingHorizontal: MarketplaceTheme.spacing.md,
    paddingVertical: MarketplaceTheme.spacing.md,
    borderTopWidth: 1,
  },
  resetButton: {
    flex: 1,
    paddingVertical: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.semibold,
  },
  applyButton: {
    flex: 2,
    paddingVertical: MarketplaceTheme.spacing.md,
    borderRadius: MarketplaceTheme.borderRadius.md,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: MarketplaceTheme.typography.fontSizes.md,
    fontWeight: MarketplaceTheme.typography.fontWeights.bold,
  },
});
