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
import { selectPeseesRecents, selectPeseesParAnimal, selectAllAnimaux } from '../store/selectors/productionSelectors';
import { loadPeseesRecents } from '../store/slices/productionSlice';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { SCREENS } from '../navigation/types';
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
// Nouveaux composants pour mode individuel
import PeseeDashboard from '../components/pesees/PeseeDashboard';
import PoidsEvolutionChart from '../components/pesees/PoidsEvolutionChart';
import SujetPeseeCard from '../components/pesees/SujetPeseeCard';
import AllSubjectsChart from '../components/pesees/AllSubjectsChart';
import { calculateGMQ, isPeseeEnRetard, joursDepuisDernierePesee } from '../utils/gmqCalculator';
import { differenceInDays } from 'date-fns';

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
  // Calcule le poids TOTAL de la ferme (somme de tous les poids) par date
  // et le GMQ global comme moyenne des GMQ de chaque loge
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
          batch_id: batch.id,
          batch_name: batch.pen_name,
        });
      });
    });

    if (allWeighings.length === 0) return [];

    // Filtrer et valider les pesées
    const validWeighings = allWeighings.filter((w) => {
      const weight = w.average_weight_kg;
      const date = new Date(w.weighing_date);
      return (
        typeof weight === 'number' &&
        !isNaN(weight) &&
        isFinite(weight) &&
        weight > 0 &&
        !isNaN(date.getTime())
      );
    });

    if (validWeighings.length === 0) return [];

    // Trier par date (croissante)
    const sortedWeighings = [...validWeighings].sort((a, b) => {
      const dateA = new Date(a.weighing_date).getTime();
      const dateB = new Date(b.weighing_date).getTime();
      return dateA - dateB;
    });

    // Pour chaque pesée, calculer le poids total de la ferme à cette date précise
    // Le poids total = somme de (average_weight_kg * count) de toutes les loges pesées à cette date
    const aggregatedWeighings = sortedWeighings.map((w, index) => {
      const weighingDate = new Date(w.weighing_date);
      const dateKey = `${weighingDate.getFullYear()}-${weighingDate.getMonth()}-${weighingDate.getDate()}`;
      
      // Trouver toutes les pesées de la même date (toutes loges confondues)
      // Cela inclut les pesées de toutes les loges qui ont été pesées le même jour
      const weighingsSameDate = sortedWeighings.filter((other) => {
        const otherDate = new Date(other.weighing_date);
        const otherDateKey = `${otherDate.getFullYear()}-${otherDate.getMonth()}-${otherDate.getDate()}`;
        return otherDateKey === dateKey;
      });
      
      // Calculer le poids total de la ferme pour cette date
      // = somme de (average_weight_kg * count) pour toutes les loges pesées ce jour
      const totalWeightForDate = weighingsSameDate.reduce((sum, pesee) => {
        const count = pesee.count || 1;
        return sum + ((pesee.average_weight_kg || 0) * count);
      }, 0);
      
      // Compter le nombre total de sujets pesés ce jour (toutes loges confondues)
      const totalCountForDate = weighingsSameDate.reduce((sum, p) => sum + (p.count || 1), 0);
      
      return {
        id: w.id || `global-${new Date(w.weighing_date).getTime()}-${index}`,
        weighing_date: w.weighing_date, // Garder la date originale avec l'heure pour distinguer les pesées
        // Poids total de la ferme à cette date (sera le même pour toutes les pesées du même jour)
        average_weight_kg: totalWeightForDate,
        count: totalCountForDate,
      };
    });

    return aggregatedWeighings;
  }, [batches, weighingsMap]);

  // Calculer le GMQ global comme moyenne des GMQ de chaque loge
  const globalGMQ = React.useMemo(() => {
    const gmqsByBatch: number[] = [];
    
    batches.forEach((batch) => {
      const batchWeighings = weighingsMap.get(batch.id) || [];
      if (batchWeighings.length < 2) return; // Il faut au moins 2 pesées pour calculer un GMQ
      
      // Filtrer et valider les pesées
      const validWeighings = batchWeighings.filter((w) => {
        const weight = w.average_weight_kg;
        const date = new Date(w.weighing_date || w.date);
        return (
          typeof weight === 'number' &&
          !isNaN(weight) &&
          isFinite(weight) &&
          weight > 0 &&
          !isNaN(date.getTime())
        );
      });
      
      if (validWeighings.length < 2) return;
      
      // Trier par date
      const sorted = [...validWeighings].sort((a, b) => {
        const dateA = new Date(a.weighing_date || a.date).getTime();
        const dateB = new Date(b.weighing_date || b.date).getTime();
        return dateA - dateB;
      });
      
      const firstWeighing = sorted[0];
      const lastWeighing = sorted[sorted.length - 1];
      const firstDate = new Date(firstWeighing.weighing_date || firstWeighing.date);
      const lastDate = new Date(lastWeighing.weighing_date || lastWeighing.date);
      
      // Calculer la différence en jours
      const diffMs = lastDate.getTime() - firstDate.getTime();
      const joursTotal = diffMs / (1000 * 60 * 60 * 24);
      
      // Calculer le gain total
      const gainTotal = lastWeighing.average_weight_kg - firstWeighing.average_weight_kg;
      
      // Calculer le GMQ pour cette loge
      if (joursTotal > 0) {
        const joursPourCalcul = Math.max(joursTotal, 0.1);
        const gmq = (gainTotal / joursPourCalcul) * 1000;
        if (gmq > 0) {
          gmqsByBatch.push(gmq);
        }
      } else if (joursTotal === 0 && gainTotal > 0) {
        const gmq = (gainTotal / 0.1) * 1000;
        gmqsByBatch.push(gmq);
      }
    });
    
    // Retourner la moyenne des GMQ de toutes les loges
    if (gmqsByBatch.length === 0) return 0;
    return gmqsByBatch.reduce((sum, gmq) => sum + gmq, 0) / gmqsByBatch.length;
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
              average_weight_kg: w.average_weight_kg, // Contient le poids total de la ferme
              count: w.count,
            }))}
            batchName="Toutes les loges"
            gmqOverride={globalGMQ}
            showTotalWeight={true}
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
  
  // État pour la période d'affichage (commun aux deux modes)
  const [periode, setPeriode] = useState<'7j' | '30j' | '90j' | 'tout'>('30j');

  // Redux pour mode individuel
  const peseesRecents = useAppSelector(selectPeseesRecents);
  const peseesParAnimal = useAppSelector(selectPeseesParAnimal);
  const animaux = useAppSelector(selectAllAnimaux);

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
        // Trier les pesées par date croissante pour le graphique
        const sortedData = (data || []).sort((a: any, b: any) => {
          const dateA = new Date(a.weighing_date || a.date).getTime();
          const dateB = new Date(b.weighing_date || b.date).getTime();
          return dateA - dateB;
        });
        setWeighings(sortedData);
        // Mettre à jour la map pour les stats globales (trier aussi)
        setWeighingsMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(batchToLoad.id, sortedData);
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
          // Trier par date croissante pour le graphique
          const sortedData = (data || []).sort((a: any, b: any) => {
            const dateA = new Date(a.weighing_date || a.date).getTime();
            const dateB = new Date(b.weighing_date || b.date).getTime();
            return dateA - dateB;
          });
          newMap.set(b.id, sortedData);
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
        {/* Dashboard de statistiques globales (harmonisé avec mode individuel) */}
        {isBatchMode && (
          <>
            <PeseeDashboard
              projetId={projetActif?.id}
              periode={periode}
              onPeriodeChange={setPeriode}
            />

            {/* Graphique d'évolution du poids moyen (harmonisé avec mode individuel) */}
            <PoidsEvolutionChart
              projetId={projetActif?.id}
              periode={periode}
            />

            {/* Graphique avec courbes superposées (toutes les loges) */}
            <AllSubjectsChart
              projetId={projetActif?.id}
              periode={periode}
              maxSubjects={10}
            />
          </>
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

        {/* Mode individuel - Nouvelle interface harmonisée */}
        {!isBatchMode && (
          <>
            {/* Dashboard de statistiques globales */}
            <PeseeDashboard
              projetId={projetActif?.id}
              periode={periode}
              onPeriodeChange={setPeriode}
            />

            {/* Graphique d'évolution du poids moyen */}
            <PoidsEvolutionChart
              projetId={projetActif?.id}
              periode={periode}
            />

            {/* Graphique avec courbes superposées (tous les animaux) */}
            <AllSubjectsChart
              projetId={projetActif?.id}
              periode={periode}
              maxSubjects={10}
            />

            {/* Liste des animaux avec cartes */}
            {loading && !refreshing ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Chargement des animaux...
                </Text>
              </View>
            ) : (() => {
              // Filtrer les animaux actifs du projet
              const animauxActifs = animaux.filter(
                (a) => a.projet_id === projetActif?.id && a.statut?.toLowerCase() === 'actif'
              );

              if (animauxActifs.length === 0) {
                return (
                  <Card elevation="small" padding="medium" style={styles.emptyCard}>
                    <Ionicons name="paw-outline" size={48} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      Aucun animal actif dans ce projet
                    </Text>
                  </Card>
                );
              }

              return (
                <View style={styles.animalsListContainer}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    🐷 Liste des animaux ({animauxActifs.length})
                  </Text>
                  {animauxActifs.map((animal) => {
                    const pesees = peseesParAnimal[animal.id] || [];
                    const dernierePesee = pesees.length > 0 ? pesees[pesees.length - 1] : null;
                    const avantDernierePesee = pesees.length > 1 ? pesees[pesees.length - 2] : null;
                    
                    // Calculer GMQ
                    const gmq = dernierePesee && avantDernierePesee
                      ? calculateGMQ(
                          avantDernierePesee.poids_kg,
                          dernierePesee.poids_kg,
                          new Date(avantDernierePesee.date),
                          new Date(dernierePesee.date)
                        )
                      : null;
                    
                    // Vérifier si en retard
                    const enRetard = dernierePesee ? isPeseeEnRetard(dernierePesee) : false;
                    const joursDepuis = dernierePesee
                      ? joursDepuisDernierePesee(dernierePesee)
                      : null;

                    return (
                      <SujetPeseeCard
                        key={animal.id}
                        mode="individuel"
                        animal={animal}
                        dernierePesee={dernierePesee || undefined}
                        gmq={gmq}
                        enRetard={enRetard}
                        joursDepuisDernierePesee={joursDepuis}
                        onViewDetails={() => {
                          navigation.navigate(SCREENS.SUJET_PESEE_DETAIL as never, {
                            animalId: animal.id,
                          });
                        }}
                        onNouvellePesee={() => {
                          setSelectedAnimal(animal);
                          setModalVisible(true);
                        }}
                      />
                    );
                  })}
                </View>
              );
            })()}
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
  animalsListContainer: {
    marginTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
});

