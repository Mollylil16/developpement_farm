/**
 * WeighingScreen - Écran unifié de gestion des pesées
 *
 * Supporte les deux modes d'élevage :
 * - Mode Individuel : Pesées par animal
 * - Mode Bande : Pesées par bande (batch)
 *
 * Architecture:
 * - Détection automatique du mode via useModeElevage() et paramètres de route
 * - Affichage conditionnel selon le mode
 * - Même UI pour les deux modes (cohérence visuelle)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useModeElevage } from '../hooks/useModeElevage';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { selectPeseesRecents, selectPeseesParAnimal } from '../store/selectors/productionSelectors';
import { loadPeseesRecents } from '../store/slices/productionSlice';
import StandardHeader from '../components/StandardHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import ProductionPeseeFormModal from '../components/ProductionPeseeFormModal';
import apiClient from '../services/api/apiClient';
import { Batch, BatchWeighingSummary } from '../types/batch';
import { Alert } from 'react-native';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ChatAgentFAB from '../components/chatAgent/ChatAgentFAB';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';
import BatchSettingsModal from '../components/batch/BatchSettingsModal';
import BatchWeighingDetailsModal from '../components/batch/BatchWeighingDetailsModal';
import BatchWeightEvolutionChart from '../components/batch/BatchWeightEvolutionChart';

// Type pour les paramètres de route (mode batch)
type WeighingRouteParams = {
  batch?: {
    id: string;
    pen_name: string;
    total_count: number;
  };
  animalId?: string; // Mode individuel : animal pré-sélectionné
};

interface WeighingCardProps {
  weighing: any;
  isBatchMode: boolean;
  onViewDetails?: () => void;
}

const WeighingCard: React.FC<WeighingCardProps> = ({
  weighing,
  isBatchMode,
  onViewDetails,
}) => {
  const { colors } = useTheme();

  return (
    <Card elevation="small" padding="medium" style={styles.weighingCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.iconBadge, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="scale" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.weighingTitle, { color: colors.text }]}>
              {isBatchMode
                ? `${weighing.count || 1} porc(s) pesé(s)`
                : weighing.animal_code || weighing.animal_id || 'Porc'}
            </Text>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {format(new Date(weighing.weighing_date || weighing.date), 'dd MMM yyyy', { locale: fr })}
            </Text>
          </View>
        </View>
        <View style={styles.weightContainer}>
          <Text style={[styles.weightValue, { color: colors.primary }]}>
            {isBatchMode ? weighing.average_weight_kg : weighing.poids_kg} kg
          </Text>
          {isBatchMode && weighing.min_weight_kg && weighing.max_weight_kg && (
            <Text style={[styles.weightRange, { color: colors.textSecondary }]}>
              {weighing.min_weight_kg}-{weighing.max_weight_kg} kg
            </Text>
          )}
        </View>
      </View>

      {(weighing.notes || weighing.commentaire) && (
        <View style={styles.notesContainer}>
          <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Notes :</Text>
          <Text style={[styles.notesText, { color: colors.text }]}>
            {weighing.notes || weighing.commentaire}
          </Text>
        </View>
      )}

      {isBatchMode && onViewDetails && (
        <View style={styles.cardActions}>
          <Button
            title="Voir les détails"
            variant="outline"
            size="small"
            onPress={onViewDetails}
          />
        </View>
      )}
    </Card>
  );
};

// Composant pour les statistiques globales de la ferme
interface GlobalFarmStatsProps {
  batches: Batch[];
  weighingsMap: Map<string, any[]>;
  loading: boolean;
}

const GlobalFarmStats: React.FC<GlobalFarmStatsProps> = ({ batches, weighingsMap, loading }) => {
  const { colors } = useTheme();

  const globalStats = React.useMemo(() => {
    let totalWeighings = 0;
    let totalWeight = 0;
    let totalPigs = 0;

    batches.forEach((batch) => {
      const batchWeighings = weighingsMap.get(batch.id) || [];
      totalWeighings += batchWeighings.length;
      batchWeighings.forEach((w) => {
        totalWeight += (w.average_weight_kg || 0) * (w.count || 1);
        totalPigs += w.count || 1;
      });
    });

    const avgWeight = totalPigs > 0 ? totalWeight / totalPigs : 0;
    const totalBatches = batches.length;
    const totalAnimals = batches.reduce((sum, b) => sum + (b.total_count || 0), 0);

    return { totalWeighings, avgWeight, totalBatches, totalAnimals };
  }, [batches, weighingsMap]);

  // Données agrégées pour le graphique global d'évolution
  // Calcule la moyenne pondérée par SEMAINE (toutes loges confondues)
  const globalChartWeighings = React.useMemo(() => {
    // Collecter toutes les pesées de toutes les loges
    const allWeighings: any[] = [];
    batches.forEach((batch) => {
      const batchWeighings = weighingsMap.get(batch.id) || [];
      batchWeighings.forEach((w) => {
        allWeighings.push({
          id: w.id,
          weighing_date: w.weighing_date || w.date,
          average_weight_kg: w.average_weight_kg || w.poids_kg || 0,
          count: w.count || 1,
          batch_name: batch.pen_name,
        });
      });
    });

    if (allWeighings.length === 0) return [];

    // Fonction pour obtenir le numéro de semaine ISO
    const getWeekKey = (date: Date): string => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      // Trouver le jeudi de la semaine (ISO week)
      d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
      const week1 = new Date(d.getFullYear(), 0, 4);
      const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
      return `${d.getFullYear()}-S${weekNum.toString().padStart(2, '0')}`;
    };

    // Fonction pour obtenir le lundi de la semaine
    const getWeekStart = (date: Date): Date => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajuster si dimanche
      return new Date(d.setDate(diff));
    };

    // Grouper par SEMAINE et calculer la moyenne pondérée
    const byWeek = new Map<string, { totalWeight: number; totalCount: number; weekStart: Date; label: string }>();
    
    allWeighings.forEach((w) => {
      const date = new Date(w.weighing_date);
      const weekKey = getWeekKey(date);
      const weekStart = getWeekStart(date);
      const count = w.count || 1;
      const weight = (w.average_weight_kg || 0) * count;
      
      // Label: "Sem. 1" ou "Jan S1"
      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      const weekNum = parseInt(weekKey.split('-S')[1]);
      const label = `${monthNames[weekStart.getMonth()]} S${weekNum}`;
      
      if (byWeek.has(weekKey)) {
        const existing = byWeek.get(weekKey)!;
        existing.totalWeight += weight;
        existing.totalCount += count;
      } else {
        byWeek.set(weekKey, {
          totalWeight: weight,
          totalCount: count,
          weekStart: weekStart,
          label: label,
        });
      }
    });

    // Convertir en tableau et calculer les moyennes pondérées
    const aggregatedWeighings = Array.from(byWeek.entries())
      .map(([weekKey, data]) => ({
        id: weekKey,
        weighing_date: data.weekStart.toISOString(),
        average_weight_kg: data.totalCount > 0 ? data.totalWeight / data.totalCount : 0,
        count: data.totalCount,
        label: data.label,
      }))
      .sort((a, b) => new Date(a.weighing_date).getTime() - new Date(b.weighing_date).getTime());

    return aggregatedWeighings;
  }, [batches, weighingsMap]);

  if (loading || batches.length === 0) return null;

  return (
    <Card elevation="medium" padding="medium" style={globalStatsStyles.container}>
      <View style={globalStatsStyles.header}>
        <Ionicons name="analytics" size={24} color={colors.primary} />
        <Text style={[globalStatsStyles.title, { color: colors.text }]}>
          📊 Progression Globale de la Ferme
        </Text>
      </View>
      <View style={globalStatsStyles.statsGrid}>
        <View style={[globalStatsStyles.statBox, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[globalStatsStyles.statValue, { color: colors.primary }]}>
            {globalStats.totalBatches}
          </Text>
          <Text style={[globalStatsStyles.statLabel, { color: colors.textSecondary }]}>
            Loges
          </Text>
        </View>
        <View style={[globalStatsStyles.statBox, { backgroundColor: colors.success + '15' }]}>
          <Text style={[globalStatsStyles.statValue, { color: colors.success }]}>
            {globalStats.totalAnimals}
          </Text>
          <Text style={[globalStatsStyles.statLabel, { color: colors.textSecondary }]}>
            Animaux
          </Text>
        </View>
        <View style={[globalStatsStyles.statBox, { backgroundColor: colors.warning + '15' }]}>
          <Text style={[globalStatsStyles.statValue, { color: colors.warning }]}>
            {globalStats.totalWeighings}
          </Text>
          <Text style={[globalStatsStyles.statLabel, { color: colors.textSecondary }]}>
            Pesées
          </Text>
        </View>
        <View style={[globalStatsStyles.statBox, { backgroundColor: colors.info + '15' }]}>
          <Text style={[globalStatsStyles.statValue, { color: colors.info || colors.primary }]}>
            {globalStats.avgWeight.toFixed(1)} kg
          </Text>
          <Text style={[globalStatsStyles.statLabel, { color: colors.textSecondary }]}>
            Poids moyen
          </Text>
        </View>
      </View>

      {/* Graphique d'évolution global */}
      {globalChartWeighings.length > 0 && (
        <View style={globalStatsStyles.chartContainer}>
          <BatchWeightEvolutionChart
            weighings={globalChartWeighings.map((w) => ({
              id: w.id,
              weighing_date: w.weighing_date,
              average_weight_kg: w.average_weight_kg,
              count: w.count,
            }))}
            batchName="Toutes les loges"
          />
        </View>
      )}
    </Card>
  );
};

const globalStatsStyles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    marginTop: 4,
  },
  chartContainer: {
    marginTop: SPACING.md,
    marginHorizontal: -SPACING.md,
  },
});

export default function WeighingScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<{ params: WeighingRouteParams }, 'params'>>();
  const mode = useModeElevage();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  
  // Paramètres batch (si navigation depuis une bande)
  const batch = route.params?.batch;
  const animalId = route.params?.animalId;
  const isBatchMode = mode === 'bande' || !!batch;
  
  // État pour les pesées
  const [weighings, setWeighings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<any>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(batch?.id || null);
  const [modalBatch, setModalBatch] = useState<Batch | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedWeighingEntry, setSelectedWeighingEntry] = useState<any | null>(null);
  // Map pour stocker les pesées par batch (pour les stats globales)
  const [weighingsMap, setWeighingsMap] = useState<Map<string, any[]>>(new Map());

  // Redux pour mode individuel
  const peseesRecents = useAppSelector(selectPeseesRecents);
  const peseesParAnimal = useAppSelector(selectPeseesParAnimal);

  useEffect(() => {
    if (isBatchMode && batch?.id) {
      setActiveBatchId(batch.id);
    }
  }, [batch?.id, isBatchMode]);

  const activeBatch = React.useMemo(() => {
    if (activeBatchId) {
      return batches.find((item) => item.id === activeBatchId) || null;
    }
    return batch || null;
  }, [activeBatchId, batches, batch]);

  const loadBatches = useCallback(async () => {
    if (!projetActif?.id) return;
    setBatchesLoading(true);
    try {
      const data = await apiClient.get<Batch[]>(`/batch-pigs/projet/${projetActif.id}`);
      setBatches(data || []);
      // Charger les pesées de toutes les loges pour les stats globales
      if (data && data.length > 0) {
        loadAllBatchesWeighings(data);
      }
      setActiveBatchId((current) => {
        if (batch?.id) {
          return batch.id;
        }
        if (current && data?.some((item) => item.id === current)) {
          return current;
        }
        return null; // Ne pas sélectionner automatiquement une loge
      });
    } catch (error) {
      console.error('Erreur chargement bandes:', error);
      setBatches([]);
    } finally {
      setBatchesLoading(false);
    }
  }, [projetActif?.id, batch?.id, loadAllBatchesWeighings]);

  const loadBatchWeighings = useCallback(
    async (targetBatch?: Batch | null) => {
      const batchToLoad = targetBatch ?? activeBatch;
      if (!batchToLoad?.id) return;

      setLoading(true);
      try {
        const data = await apiClient.get(`/batch-weighings/batch/${batchToLoad.id}/history`);
        setWeighings(data || []);
        // Mettre à jour la map pour les stats globales
        setWeighingsMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(batchToLoad.id, data || []);
          return newMap;
        });
      } catch (error: any) {
        console.error('Erreur chargement pesées batch:', error);
        Alert.alert('Erreur', 'Impossible de charger les pesées');
        setWeighings([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeBatch],
  );

  // Charger les pesées de toutes les loges pour les stats globales
  const loadAllBatchesWeighings = useCallback(async (batchList: Batch[]) => {
    const newMap = new Map<string, any[]>();
    await Promise.all(
      batchList.map(async (b) => {
        try {
          const data = await apiClient.get(`/batch-weighings/batch/${b.id}/history`);
          newMap.set(b.id, data || []);
        } catch {
          newMap.set(b.id, []);
        }
      })
    );
    setWeighingsMap(newMap);
  }, []);

  // Charger les bandes une seule fois quand le projet change (mode bande)
  useEffect(() => {
    if (isBatchMode && projetActif?.id) {
      loadBatches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBatchMode, projetActif?.id]);

  // Charger les pesées quand la bande active change (mode bande)
  useEffect(() => {
    if (isBatchMode && activeBatchId) {
      const batchToLoad = batches.find((b) => b.id === activeBatchId) || batch;
      if (batchToLoad) {
        loadBatchWeighings(batchToLoad);
      }
    } else if (isBatchMode) {
      setWeighings([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBatchMode, activeBatchId]);

  // Charger les pesées individuelles (mode individuel)
  useEffect(() => {
    if (!isBatchMode && projetActif?.id) {
      loadIndividualWeighings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBatchMode, projetActif?.id, animalId]);

  async function loadIndividualWeighings() {
    if (!projetActif?.id) return;

    setLoading(true);
    try {
      await dispatch(loadPeseesRecents({ projetId: projetActif.id, limit: 100 })).unwrap();
      // Les pesées sont dans Redux, on les récupère via le sélecteur
    } catch (error: any) {
      console.error('Erreur chargement pesées individuelles:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    if (isBatchMode) {
      await loadBatches();
      await loadBatchWeighings();
    } else {
      await loadIndividualWeighings();
    }
  }

  // Calculer les statistiques
  const stats = React.useMemo(() => {
    if (isBatchMode) {
      const total = weighings.length;
      const avgWeight =
        weighings.length > 0
          ? weighings.reduce((sum, w) => sum + (w.average_weight_kg || 0), 0) / weighings.length
          : 0;
      return { total, averageWeight: avgWeight };
    } else {
      const allPesees = animalId
        ? peseesParAnimal[animalId] || []
        : peseesRecents || [];
      const total = allPesees.length;
      const avgWeight =
        allPesees.length > 0
          ? allPesees.reduce((sum, p) => sum + (p.poids_kg || 0), 0) / allPesees.length
          : 0;
      return { total, averageWeight: avgWeight };
    }
  }, [weighings, peseesRecents, peseesParAnimal, animalId, isBatchMode]);

  // Obtenir les pesées à afficher
  const displayWeighings = React.useMemo(() => {
    if (isBatchMode) {
      return weighings;
    } else {
      return animalId ? peseesParAnimal[animalId] || [] : peseesRecents || [];
    }
  }, [weighings, peseesRecents, peseesParAnimal, animalId, isBatchMode]);

  if (!projetActif) {
    return null; // Géré par ProtectedScreen parent
  }

  const title = isBatchMode
    ? 'Suivi des pesées'
    : animalId
    ? 'Pesées - Animal'
    : 'Pesées';
  const subtitle = isBatchMode
    ? activeBatch
      ? `${activeBatch.pen_name} • ${activeBatch.total_count || 0} porc(s)`
      : 'Sélectionnez une loge'
    : `${stats.total} pesée(s)`;

  const initialWeighingSummary = React.useMemo<BatchWeighingSummary | null>(() => {
    if (!selectedWeighingEntry || !isBatchMode) {
      return null;
    }

    const weighingDate =
      selectedWeighingEntry.weighing_date ||
      selectedWeighingEntry.date ||
      new Date().toISOString();

    return {
      id: selectedWeighingEntry.id,
      batch_id:
        selectedWeighingEntry.batch_id ||
        activeBatch?.id ||
        (batch?.id ?? ''),
      pen_name: activeBatch?.pen_name || batch?.pen_name,
      weighing_date: weighingDate,
      average_weight_kg:
        selectedWeighingEntry.average_weight_kg ??
        selectedWeighingEntry.poids_kg ??
        0,
      min_weight_kg:
        selectedWeighingEntry.min_weight_kg ??
        selectedWeighingEntry.min_weight ??
        null,
      max_weight_kg:
        selectedWeighingEntry.max_weight_kg ??
        selectedWeighingEntry.max_weight ??
        null,
      count:
        selectedWeighingEntry.count ??
        selectedWeighingEntry.total ??
        selectedWeighingEntry.nb_pigs ??
        0,
      notes:
        selectedWeighingEntry.notes ??
        selectedWeighingEntry.commentaire ??
        null,
    };
  }, [selectedWeighingEntry, isBatchMode, activeBatch, batch?.id, batch?.pen_name]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StandardHeader icon="scale" title={title} subtitle={subtitle} />

      {isBatchMode && activeBatch && (
        <View style={styles.actionsRow}>
          <Button
            title="Paramètres GMQ"
            variant="outline"
            size="small"
            onPress={() => setSettingsVisible(true)}
            icon={<Ionicons name='options-outline' size={16} color={colors.primary} />}
            textStyle={{ color: colors.primary }}
          />
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Statistiques globales de la ferme */}
        {isBatchMode && (
          <GlobalFarmStats 
            batches={batches} 
            weighingsMap={weighingsMap} 
            loading={batchesLoading} 
          />
        )}

        {isBatchMode && (
          <View style={styles.batchSelectorWrapper}>
            <Text style={[styles.batchSelectorTitle, { color: colors.text }]}>
              📋 Loges disponibles
            </Text>
            {batchesLoading ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Chargement des loges...
                </Text>
              </View>
            ) : batches.length === 0 ? (
              <Card elevation="small" padding="medium" style={styles.emptyCard}>
                <Ionicons name="home-outline" size={32} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Aucune loge disponible pour ce projet
                </Text>
              </Card>
            ) : (
              <View style={styles.batchGrid}>
                {batches.map((item) => {
                  const isActive = activeBatch?.id === item.id;
                  const batchWeighings = weighingsMap.get(item.id) || [];
                  const batchStats = {
                    total: batchWeighings.length,
                    avgWeight: batchWeighings.length > 0
                      ? batchWeighings.reduce((sum, w) => sum + (w.average_weight_kg || 0), 0) / batchWeighings.length
                      : 0,
                  };

                  return (
                    <View key={item.id}>
                      {/* Carte de la loge */}
                      <TouchableOpacity
                        style={[
                          styles.batchCardSelector,
                          {
                            borderColor: isActive ? colors.primary : colors.border,
                            backgroundColor: isActive ? colors.primary + '15' : colors.surface,
                            ...colors.shadow.small,
                          },
                        ]}
                        onPress={() => {
                          // Toggle: si déjà active, désélectionner
                          if (isActive) {
                            setActiveBatchId(null);
                            setWeighings([]);
                          } else {
                            setActiveBatchId(item.id);
                            loadBatchWeighings(item);
                          }
                        }}
                        activeOpacity={0.85}
                      >
                        <View style={styles.batchCardHeader}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs }}>
                            <Ionicons 
                              name={isActive ? 'chevron-down' : 'chevron-forward'} 
                              size={18} 
                              color={isActive ? colors.primary : colors.textSecondary} 
                            />
                            <Text
                              style={[
                                styles.batchCardName,
                                { color: isActive ? colors.primary : colors.text },
                              ]}
                            >
                              {item.pen_name}
                            </Text>
                          </View>
                          <Text style={[styles.batchCardCategory, { color: colors.textSecondary }]}>
                            {item.category.replace('_', ' ')}
                          </Text>
                        </View>
                        <Text style={[styles.batchCardMeta, { color: colors.textSecondary }]}>
                          {item.total_count} sujet(s) •{' '}
                          {(item.average_weight_kg || 0).toFixed(1)} kg
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.batchCardAction,
                            { borderColor: colors.primary },
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            setActiveBatchId(item.id);
                            setModalBatch(item);
                            setModalVisible(true);
                          }}
                        >
                          <Ionicons name="scale" size={16} color={colors.primary} />
                          <Text style={[styles.batchCardActionText, { color: colors.primary }]}>
                            Peser cette loge
                          </Text>
                        </TouchableOpacity>
                      </TouchableOpacity>

                      {/* Détails des pesées - affiché juste en dessous de la loge sélectionnée */}
                      {isActive && (
                        <View style={[styles.batchDetailsContainer, { borderLeftColor: colors.primary }]}>
                          {loading ? (
                            <View style={styles.centerContent}>
                              <ActivityIndicator size="small" color={colors.primary} />
                              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                                Chargement des pesées...
                              </Text>
                            </View>
                          ) : (
                            <>
                              {/* Statistiques de la loge */}
                              <Card elevation="small" padding="medium" style={styles.batchStatsCard}>
                                <View style={styles.statsRow}>
                                  <View style={styles.statItem}>
                                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                                      Total pesées
                                    </Text>
                                    <Text style={[styles.statValue, { color: colors.text }]}>
                                      {batchStats.total}
                                    </Text>
                                  </View>
                                  <View style={styles.statItem}>
                                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                                      Poids moyen
                                    </Text>
                                    <Text style={[styles.statValue, { color: colors.primary }]}>
                                      {batchStats.avgWeight.toFixed(1)} kg
                                    </Text>
                                  </View>
                                </View>
                              </Card>

                              {/* Graphique d'évolution */}
                              {displayWeighings.length > 0 && (
                                <BatchWeightEvolutionChart
                                  weighings={displayWeighings.map((w) => ({
                                    id: w.id,
                                    weighing_date: w.weighing_date || w.date,
                                    average_weight_kg: w.average_weight_kg || w.poids_kg || 0,
                                    min_weight_kg: w.min_weight_kg,
                                    max_weight_kg: w.max_weight_kg,
                                    count: w.count,
                                  }))}
                                  batchName={item.pen_name}
                                />
                              )}

                              {/* Liste des pesées de cette loge */}
                              {displayWeighings.length === 0 ? (
                                <Card elevation="small" padding="medium" style={styles.emptyCard}>
                                  <Ionicons name="scale-outline" size={32} color={colors.textSecondary} />
                                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                    Aucune pesée pour cette loge
                                  </Text>
                                </Card>
                              ) : (
                                displayWeighings.map((weighing) => (
                                  <WeighingCard
                                    key={weighing.id}
                                    weighing={weighing}
                                    isBatchMode={true}
                                    onViewDetails={() => {
                                      setSelectedWeighingEntry(weighing);
                                      setDetailsModalVisible(true);
                                    }}
                                  />
                                ))
                              )}
                            </>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {isBatchMode && !activeBatch && !batchesLoading && batches.length > 0 && (
          <Card elevation="small" padding="medium" style={styles.emptyCard}>
            <Ionicons name="information-circle-outline" size={32} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Appuyez sur une loge pour voir ses pesées détaillées.
            </Text>
          </Card>
        )}

        {/* Mode individuel - affichage classique */}
        {!isBatchMode && (
          <>
            {loading && !refreshing ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Chargement...
                </Text>
              </View>
            ) : displayWeighings.length === 0 ? (
              <Card elevation="small" padding="medium" style={styles.emptyCard}>
                <Ionicons name="scale-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Aucune pesée enregistrée
                </Text>
              </Card>
            ) : (
              <>
                {/* Cartes de statistiques */}
                <Card elevation="small" padding="medium" style={styles.statsCard}>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                        Total pesées
                      </Text>
                      <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                        Poids moyen
                      </Text>
                      <Text style={[styles.statValue, { color: colors.primary }]}>
                        {stats.averageWeight.toFixed(1)} kg
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* Liste des pesées */}
                {displayWeighings.map((weighing) => (
                  <WeighingCard
                    key={weighing.id}
                    weighing={weighing}
                    isBatchMode={false}
                  />
                ))}
              </>
            )}
          </>
        )}

        <Button
          title="Nouvelle pesée"
          onPress={() => {
            if (isBatchMode) {
              if (!activeBatch) {
                Alert.alert('Sélection requise', 'Veuillez d’abord choisir une loge.');
                return;
              }
              setModalBatch(activeBatch);
            } else {
              setModalBatch(null);
            }
            setModalVisible(true);
          }}
          icon={<Ionicons name="add-circle-outline" size={20} color="#fff" />}
          style={styles.addButton}
          disabled={isBatchMode && !activeBatch}
        />
      </ScrollView>

      {/* Modal de création de pesée */}
      {isBatchMode ? (
        modalBatch && (
          <ProductionPeseeFormModal
            visible={modalVisible}
            onClose={() => {
              setModalVisible(false);
              setModalBatch(null);
            }}
            onSuccess={() => {
              loadBatchWeighings(modalBatch);
              loadBatches();
              setModalVisible(false);
              setModalBatch(null);
            }}
            projetId={projetActif.id}
            animal={null}
            batchId={modalBatch.id}
            batchTotalCount={modalBatch.total_count}
            batchAvgDailyGain={modalBatch.avg_daily_gain}
          />
        )
      ) : (
        <ProductionPeseeFormModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSuccess={() => {
            loadIndividualWeighings();
            setModalVisible(false);
          }}
          projetId={projetActif.id}
          animal={selectedAnimal || { id: animalId || '' }} // Animal sélectionné ou depuis route
        />
      )}

      {isBatchMode && activeBatch && (
        <BatchSettingsModal
          visible={settingsVisible}
          batch={activeBatch}
          onClose={() => setSettingsVisible(false)}
          onSaved={() => {
            setSettingsVisible(false);
            loadBatches();
            if (activeBatch) {
              loadBatchWeighings(activeBatch);
            }
          }}
        />
      )}

      <BatchWeighingDetailsModal
        visible={detailsModalVisible}
        weighingId={detailsModalVisible ? selectedWeighingEntry?.id ?? null : null}
        batch={activeBatch || batch || null}
        initialSummary={initialWeighingSummary}
        onClose={() => {
          setDetailsModalVisible(false);
          setSelectedWeighingEntry(null);
        }}
      />

      <ChatAgentFAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    marginTop: 16,
    fontSize: FONT_SIZES.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
  },
  statsCard: {
    marginBottom: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: 4,
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  weighingCard: {
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weighingTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  dateText: {
    fontSize: FONT_SIZES.sm,
  },
  weightContainer: {
    alignItems: 'flex-end',
  },
  weightValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
  },
  weightRange: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
  },
  notesContainer: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  notesLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: 4,
  },
  notesText: {
    fontSize: FONT_SIZES.sm,
  },
  cardActions: {
    marginTop: SPACING.md,
  },
  addButton: {
    marginTop: SPACING.md,
  },
  batchSelectorWrapper: {
    marginBottom: SPACING.md,
  },
  batchSelectorTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  batchGrid: {
    gap: SPACING.md,
  },
  batchCardSelector: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  batchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  batchCardName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
  },
  batchCardCategory: {
    fontSize: FONT_SIZES.xs,
    textTransform: 'uppercase',
  },
  batchCardMeta: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.sm,
  },
  batchCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.round,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    alignSelf: 'flex-start',
  },
  batchCardActionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  actionsRow: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  batchDetailsContainer: {
    marginLeft: SPACING.sm,
    marginBottom: SPACING.md,
    paddingLeft: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: '#2E7D32',
  },
  batchStatsCard: {
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
});

