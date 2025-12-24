/**
 * Vue du cheptel en mode Suivi par Bande
 * Affiche une grille de cartes représentant les loges/bandes
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { selectProjetActif } from '../store/selectors/projetSelectors';
import { Batch, BATCH_CATEGORY_LABELS, BATCH_CATEGORY_ICONS } from '../types/batch';
import { SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import Card from './Card';
import Badge from './Badge';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';
import { PlusCircle } from 'lucide-react-native';

export default function BatchCheptelView() {
  const { colors } = useTheme();
  const projetActif = useAppSelector(selectProjetActif);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    by_category: {} as Record<string, number>,
  });

  useEffect(() => {
    if (projetActif) {
      loadBatches();
    }
  }, [projetActif?.id]);

  const loadBatches = async () => {
    if (!projetActif?.id) return;

    setLoading(true);
    try {
      // TODO: Implémenter le chargement depuis l'API/DB
      // Pour l'instant, données de démonstration
      const demoData: Batch[] = [
        {
          id: '1',
          projet_id: projetActif.id,
          pen_name: 'Loge A1',
          category: 'porcelets',
          total_count: 25,
          male_count: 12,
          female_count: 13,
          castrated_count: 0,
          average_age_months: 2,
          average_weight_kg: 15,
          batch_creation_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          projet_id: projetActif.id,
          pen_name: 'Loge A2',
          category: 'porcs_croissance',
          total_count: 18,
          male_count: 9,
          female_count: 9,
          castrated_count: 0,
          average_age_months: 4,
          average_weight_kg: 45,
          batch_creation_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '3',
          projet_id: projetActif.id,
          pen_name: 'Loge B1',
          category: 'truie_reproductrice',
          total_count: 5,
          male_count: 0,
          female_count: 5,
          castrated_count: 0,
          average_age_months: 18,
          average_weight_kg: 180,
          batch_creation_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      setBatches(demoData);
      calculateStats(demoData);
    } catch (error) {
      console.error('Erreur lors du chargement des bandes:', error);
      Alert.alert('Erreur', 'Impossible de charger les bandes');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (batchesData: Batch[]) => {
    const total = batchesData.reduce((sum, b) => sum + b.total_count, 0);
    const by_category = batchesData.reduce(
      (acc, b) => {
        acc[b.category] = (acc[b.category] || 0) + b.total_count;
        return acc;
      },
      {} as Record<string, number>
    );

    setStats({ total, by_category });
  };

  const handleBatchPress = (batch: Batch) => {
    // TODO: Ouvrir modal d'édition
    Alert.alert('Info', `Batch: ${batch.pen_name}\nÀ implémenter: Modal d'édition`);
  };

  const handleAddBatch = () => {
    // TODO: Ouvrir modal de création
    Alert.alert('Info', 'À implémenter: Modal de création de bande');
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
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📅</Text>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Âge moyen</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {item.average_age_months} mois
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>⚖️</Text>
            <View style={styles.detailContent}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Poids moyen
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {item.average_weight_kg} kg
              </Text>
            </View>
          </View>
        </View>

        {/* Répartition sexes */}
        {item.category !== 'porcelets' && (
          <View style={styles.sexDistribution}>
            {item.male_count > 0 && (
              <Badge variant="info" size="small">
                ♂ {item.male_count}
              </Badge>
            )}
            {item.female_count > 0 && (
              <Badge variant="warning" size="small">
                ♀ {item.female_count}
              </Badge>
            )}
            {item.castrated_count > 0 && (
              <Badge variant="neutral" size="small">
                ⚥ {item.castrated_count}
              </Badge>
            )}
          </View>
        )}
      </TouchableOpacity>
    ),
    [colors]
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
            message="Commencez par créer votre première loge"
          />
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
  details: {
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 14,
    marginRight: SPACING.sm,
  },
  detailContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
  },
  detailValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semiBold,
  },
  sexDistribution: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
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

