/**
 * Vue du cheptel en mode Suivi par Bande
 * Affiche une grille de cartes représentant les loges/bandes
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { selectProjetActif } from '../store/selectors/projetSelectors';
import { Batch, BATCH_CATEGORY_LABELS, BATCH_CATEGORY_ICONS } from '../types/batch';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS, MALE_COLOR, FEMALE_COLOR, CASTRATED_COLOR } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import Card from './Card';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import Button from './Button';
import { PlusCircle } from 'lucide-react-native';
import BatchActionsModal from './batch/BatchActionsModal';
import CreateBatchModal from './batch/CreateBatchModal';
import apiClient from '../services/api/apiClient';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../types/common';

export default function BatchCheptelView() {
  const { colors } = useTheme();
  const projetActif = useAppSelector(selectProjetActif);
  
  // Tous les hooks doivent être déclarés au début du composant
  // pour éviter "change in the order of Hooks" errors
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    by_category: {} as Record<string, number>,
  });
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [initializingBatches, setInitializingBatches] = useState(false);

  const calculateStats = useCallback((batchesData: Batch[]) => {
    const total = batchesData.reduce((sum, b) => sum + b.total_count, 0);
    const by_category = batchesData.reduce(
      (acc, b) => {
        acc[b.category] = (acc[b.category] || 0) + b.total_count;
        return acc;
      },
      {} as Record<string, number>
    );

    setStats({ total, by_category });
  }, []);

  const loadBatches = useCallback(async () => {
    if (!projetActif?.id) return;

setLoading(true);
    try {
      // Charger les bandes depuis l'API backend
      const batchesData = await apiClient.get<Batch[]>(
        `/batch-pigs/projet/${projetActif.id}`
      );

setBatches(batchesData);
      calculateStats(batchesData);
    } catch (error: any) {
      logger.error('Erreur lors du chargement des bandes:', error);
      Alert.alert('Erreur', error.message || 'Impossible de charger les bandes');
      // En cas d'erreur, initialiser avec tableau vide
      setBatches([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  }, [projetActif?.id, calculateStats]);

  useEffect(() => {
    if (projetActif) {
      loadBatches();
    }
  }, [projetActif?.id, loadBatches]);

  const handleBatchPress = (batch: Batch) => {
    setSelectedBatch(batch);
    setShowActionsModal(true);
  };

  const handleCloseActionsModal = () => {
    setShowActionsModal(false);
    setSelectedBatch(null);
  };

  const handleRefresh = () => {
    loadBatches();
  };

  const handleAddBatch = () => {
    setShowCreateModal(true);
  };

  const renderBatchCard = useCallback(
    ({ item }: { item: Batch }) => (
      <TouchableOpacity
        style={[
          styles.batchCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            ...colors.shadow.small,
          },
        ]}
        onPress={() => handleBatchPress(item)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.icon}>{BATCH_CATEGORY_ICONS[item.category]}</Text>
          <Text style={[styles.penName, { color: colors.textSecondary }]}>{item.pen_name}</Text>
        </View>

        {/* Catégorie */}
        <Text style={[styles.category, { color: colors.text }]}>
          {BATCH_CATEGORY_LABELS[item.category]}
        </Text>

        {/* Effectif principal */}
        <View style={styles.mainStat}>
          <Text style={[styles.count, { color: colors.primary }]}>{item.total_count}</Text>
          <Text style={[styles.countLabel, { color: colors.textSecondary }]}>sujets</Text>
        </View>

        {/* Détails */}
        <View style={styles.metricsRow}>
          <View
            style={[
              styles.metricCard,
              { backgroundColor: colors.surfaceVariant || `${colors.surface}CC` },
            ]}
          >
            <View style={styles.metricHeader}>
              <Text style={styles.detailIcon}>📅</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Âge moyen</Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {formatAge(item.average_age_months)}
            </Text>
          </View>
          <View
            style={[
              styles.metricCard,
              { backgroundColor: colors.surfaceVariant || `${colors.surface}CC` },
            ]}
          >
            <View style={styles.metricHeader}>
              <Text style={styles.detailIcon}>⚖️</Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Poids moyen</Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {formatWeight(item.average_weight_kg)}
            </Text>
          </View>
        </View>

        {/* GMQ */}
        <View
          style={[
            styles.gmqBadge,
            {
              backgroundColor: colors.surfaceVariant || `${colors.surface}CC`,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.gmqLabel, { color: colors.textSecondary }]}>GMQ</Text>
          <Text style={[styles.gmqValue, { color: colors.primary }]}>
            {formatGmq(item.avg_daily_gain)}
          </Text>
        </View>

        {/* Répartition sexes */}
        {item.category !== 'porcelets' && (
          <View style={styles.sexDistribution}>
            {renderSexBadge('♂', item.male_count, MALE_COLOR)}
            {renderSexBadge('♀', item.female_count, FEMALE_COLOR)}
            {renderSexBadge('⚥', item.castrated_count, CASTRATED_COLOR)}
          </View>
        )}
      </TouchableOpacity>
    ),
    [colors, formatAge, formatWeight, renderSexBadge],
  );

  const renderAddCard = () => (
    <TouchableOpacity
      style={[
        styles.addCard,
        {
          borderColor: colors.primary,
          backgroundColor: colors.surface,
        },
      ]}
      onPress={handleAddBatch}
      activeOpacity={0.7}
    >
      <PlusCircle size={48} color={colors.primary} />
      <Text style={[styles.addText, { color: colors.primary }]}>Ajouter une loge</Text>
    </TouchableOpacity>
  );

  const initialEffectifTotal =
    (projetActif?.nombre_truies || 0) +
    (projetActif?.nombre_verrats || 0) +
    (projetActif?.nombre_porcelets || 0) +
    (projetActif?.nombre_croissance || 0);

  const canInitializeBatches =
    projetActif?.management_method === 'batch' &&
    initialEffectifTotal > 0 &&
    batches.length === 0;

  const handleInitializeBatches = useCallback(async () => {
    if (!projetActif?.id || initializingBatches) return;

    setInitializingBatches(true);
    try {
      const result = await apiClient.post<{
        created: number;
        skipped: boolean;
        reason?: string;
      }>(`/projets/${projetActif.id}/initialize-batches`, {});

      await loadBatches();

      if (result?.skipped) {
        logger.info('[BatchCheptel] Initialisation ignorée', result);
      } else {
        Alert.alert(
          'Cheptel par bande initialisé',
          `${result?.created ?? 0} loge(s) ont été créées automatiquement.`
        );
      }
    } catch (error) {
      logger.error('[BatchCheptel] Erreur initialisation loges:', error);
      Alert.alert('Erreur', getErrorMessage(error) || "Impossible d'initialiser les loges");
    } finally {
      setInitializingBatches(false);
    }
  }, [projetActif?.id, initializingBatches, loadBatches]);

  const formatNumber = useCallback((value?: number | null, decimals = 1) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '—';
    }
    return value.toFixed(decimals).replace('.', ',');
  }, []);

  const formatAge = useCallback(
    (months?: number | null) => {
      if (months === undefined || months === null || isNaN(months)) {
        return '—';
      }
      return `${formatNumber(months, 1)} mois`;
    },
    [formatNumber],
  );

  const formatWeight = useCallback(
    (kg?: number | null) => {
      if (kg === undefined || kg === null || isNaN(kg)) {
        return '—';
      }
      return `${formatNumber(kg, 1)} kg`;
    },
    [formatNumber],
  );

  const formatGmq = useCallback(
    (gmq?: number | null) => {
      if (gmq === undefined || gmq === null || isNaN(gmq)) {
        return '—';
      }
      return `${formatNumber(gmq, 2)} kg/j`;
    },
    [formatNumber],
  );

  const renderSexBadge = useCallback((label: string, count: number, color: string) => {
    if (!count) return null;
    return (
      <View
        style={[
          styles.sexChip,
          {
            borderColor: `${color}80`,
            backgroundColor: `${color}15`,
          },
        ]}
      >
        <Text style={[styles.sexChipText, { color }]} numberOfLines={1}>
          {label} {count}
        </Text>
      </View>
    );
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner />
      </View>
    );
  }

  if (!projetActif) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="alert-circle"
          title="Aucun projet actif"
          message="Créez un projet pour commencer"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header avec stats */}
      <Card style={styles.statsCard} elevation="small" padding="medium">
        <Text style={[styles.title, { color: colors.text }]}>👥 Cheptel par bande</Text>
        <Text style={[styles.totalCount, { color: colors.primary }]}>
          Total : {stats.total} porcs
        </Text>

        <View style={styles.statsRow}>
          {Object.entries(stats.by_category).map(([category, count]) => (
            <View key={category} style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {BATCH_CATEGORY_LABELS[category as keyof typeof BATCH_CATEGORY_LABELS]}
              </Text>
              <Text style={[styles.statValue, { color: colors.text }]}>{count}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Grille des loges */}
      {batches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="inbox"
            title="Aucune bande créée"
            message={
              canInitializeBatches
                ? 'Nous pouvons créer automatiquement les loges à partir des effectifs initiaux.'
                : 'Commencez par créer votre première loge'
            }
          />
          {canInitializeBatches && (
            <Button
              title={
                initializingBatches ? 'Initialisation…' : 'Initialiser le cheptel par bande'
              }
              onPress={handleInitializeBatches}
              loading={initializingBatches}
            />
          )}
          {renderAddCard()}
        </View>
      ) : (
        <FlatList
          data={[...batches, { id: 'add' } as any]}
          numColumns={2}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            if (item.id === 'add') {
              return renderAddCard();
            }
            return renderBatchCard({ item });
          }}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.gridContainer}
        />
      )}

      {/* Modal d'actions */}
      {selectedBatch && (
        <BatchActionsModal
          visible={showActionsModal}
          batch={selectedBatch}
          onClose={handleCloseActionsModal}
          onRefresh={handleRefresh}
        />
      )}

      {/* Modal de création */}
      <CreateBatchModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          handleRefresh();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsCard: {
    margin: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.sm,
  },
  totalCount: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  statItem: {
    flex: 1,
    minWidth: 100,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  gridContainer: {
    padding: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  row: {
    gap: SPACING.md,
  },
  batchCard: {
    flex: 1,
    maxWidth: '48%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    minHeight: 220,
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  icon: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  penName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  category: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    marginBottom: SPACING.md,
  },
  mainStat: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  count: {
    fontSize: 32,
    fontWeight: FONT_WEIGHTS.bold,
  },
  countLabel: {
    fontSize: FONT_SIZES.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  metricCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.xs,
  },
  detailIcon: {
    fontSize: 16,
  },
  metricLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.medium,
  },
  metricValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  gmqBadge: {
    marginTop: SPACING.sm,
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
    alignSelf: 'flex-start',
  },
  gmqLabel: {
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gmqValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  sexDistribution: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  sexChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: SPACING.xs / 2,
    paddingHorizontal: SPACING.sm,
  },
  sexChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.medium,
  },
  addCard: {
    flex: 1,
    maxWidth: '48%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  addText: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
});

