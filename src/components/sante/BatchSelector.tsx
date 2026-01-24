/**
 * BatchSelector - Composant de sélection de bandes pour le mode batch
 * Utilisé dans les formulaires santé (vaccinations, maladies, traitements)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAppSelector } from '../../store/hooks';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../../constants/theme';
import apiClient from '../../services/api/apiClient';
import { Batch } from '../../types/batch';

interface BatchSelectorProps {
  /**
   * ID de la bande sélectionnée
   */
  selectedBatchId: string | null;
  /**
   * Callback appelé lors de la sélection d'une bande
   */
  onBatchSelect: (batch: Batch | null) => void;
  /**
   * Mode de sélection : 'single' pour une seule bande, 'multiple' pour plusieurs
   */
  mode?: 'single' | 'multiple';
  /**
   * IDs des bandes sélectionnées (pour mode multiple)
   */
  selectedBatchIds?: string[];
  /**
   * Callback pour mode multiple
   */
  onMultipleSelect?: (batchIds: string[]) => void;
  /**
   * Optionnel : masquer le composant si aucune bande disponible
   */
  hideIfEmpty?: boolean;
  /**
   * Label affiché au dessus du sélecteur
   */
  label?: string;
}

export default function BatchSelector({
  selectedBatchId,
  onBatchSelect,
  mode = 'single',
  selectedBatchIds = [],
  onMultipleSelect,
  hideIfEmpty = false,
  label = 'Sélectionner une loge',
}: BatchSelectorProps) {
  const { colors } = useTheme();
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Charger les bandes du projet
  const loadBatches = useCallback(async () => {
    if (!projetActif?.id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.get<Batch[]>(`/batch-pigs/projet/${projetActif.id}`);
      setBatches(data || []);
    } catch (err: any) {
      console.error('[BatchSelector] Erreur chargement bandes:', err);
      setError('Impossible de charger les loges');
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [projetActif?.id]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Si hideIfEmpty et aucune bande, ne rien afficher
  if (hideIfEmpty && batches.length === 0 && !loading) {
    return null;
  }

  // Trouver la bande sélectionnée
  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

  const handleSingleSelect = (batch: Batch) => {
    if (selectedBatchId === batch.id) {
      onBatchSelect(null);
    } else {
      onBatchSelect(batch);
    }
    setExpanded(false);
  };

  const handleMultipleToggle = (batchId: string) => {
    if (!onMultipleSelect) return;

    if (selectedBatchIds.includes(batchId)) {
      onMultipleSelect(selectedBatchIds.filter((id) => id !== batchId));
    } else {
      onMultipleSelect([...selectedBatchIds, batchId]);
    }
  };

  const renderBatchItem = (batch: Batch) => {
    const isSelected =
      mode === 'single' ? selectedBatchId === batch.id : selectedBatchIds.includes(batch.id);

    return (
      <TouchableOpacity
        key={batch.id}
        style={[
          styles.batchItem,
          {
            backgroundColor: isSelected ? colors.primary + '20' : colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
        onPress={() => (mode === 'single' ? handleSingleSelect(batch) : handleMultipleToggle(batch.id))}
        activeOpacity={0.7}
      >
        <View style={styles.batchItemContent}>
          <View style={styles.batchInfo}>
            <Text style={[styles.batchName, { color: isSelected ? colors.primary : colors.text }]}>
              {batch.pen_name}
            </Text>
            <Text style={[styles.batchMeta, { color: colors.textSecondary }]}>
              {batch.total_count} sujet(s) • {(batch.average_weight_kg || 0).toFixed(1)} kg moy.
            </Text>
          </View>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement des loges...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={24} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity onPress={loadBatches} style={styles.retryButton}>
            <Text style={[styles.retryText, { color: colors.primary }]}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : batches.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="home-outline" size={32} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Aucune loge disponible
          </Text>
        </View>
      ) : (
        <>
          {/* Sélection compacte avec dropdown */}
          <TouchableOpacity
            style={[
              styles.selector,
              {
                backgroundColor: colors.surface,
                borderColor: selectedBatch ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.7}
          >
            <View style={styles.selectorContent}>
              {selectedBatch ? (
                <>
                  <Ionicons name="home" size={20} color={colors.primary} />
                  <Text style={[styles.selectorText, { color: colors.text }]}>
                    {selectedBatch.pen_name} ({selectedBatch.total_count} sujet(s))
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="home-outline" size={20} color={colors.textSecondary} />
                  <Text style={[styles.selectorPlaceholder, { color: colors.textSecondary }]}>
                    Sélectionner une loge...
                  </Text>
                </>
              )}
            </View>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Liste déroulante */}
          {expanded && (
            <View style={[styles.dropdownContainer, { backgroundColor: colors.background }]}>
              <ScrollView style={styles.dropdown} nestedScrollEnabled>
                {/* Option "Aucune sélection" */}
                {selectedBatchId && (
                  <TouchableOpacity
                    style={[
                      styles.batchItem,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                    onPress={() => {
                      onBatchSelect(null);
                      setExpanded(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.batchItemContent}>
                      <View style={styles.batchInfo}>
                        <Text style={[styles.batchName, { color: colors.textSecondary }]}>
                          Aucune loge
                        </Text>
                        <Text style={[styles.batchMeta, { color: colors.textSecondary }]}>
                          Désélectionner la loge actuelle
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                {batches.map(renderBatchItem)}
              </ScrollView>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    flexWrap: 'wrap',
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  retryText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  selectorText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
  },
  selectorPlaceholder: {
    fontSize: FONT_SIZES.md,
  },
  dropdownContainer: {
    marginTop: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    maxHeight: 250,
    overflow: 'hidden',
  },
  dropdown: {
    maxHeight: 250,
  },
  batchItem: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    marginBottom: SPACING.xs,
  },
  batchItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  batchInfo: {
    flex: 1,
  },
  batchName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  batchMeta: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
});

