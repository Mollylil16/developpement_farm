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

import React, { useState, useEffect } from 'react';
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
import { Alert } from 'react-native';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ChatAgentFAB from '../components/chatAgent/ChatAgentFAB';
import { SPACING, BORDER_RADIUS, FONT_SIZES } from '../constants/theme';

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
}

const WeighingCard: React.FC<WeighingCardProps> = ({ weighing, isBatchMode }) => {
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
    </Card>
  );
};

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

  // Redux pour mode individuel
  const peseesRecents = useAppSelector(selectPeseesRecents);
  const peseesParAnimal = useAppSelector(selectPeseesParAnimal);

  // Charger les données selon le mode
  useEffect(() => {
    if (isBatchMode && batch?.id) {
      loadBatchWeighings();
    } else if (projetActif?.id) {
      loadIndividualWeighings();
    }
  }, [batch?.id, projetActif?.id, isBatchMode, animalId]);

  async function loadBatchWeighings() {
    if (!batch?.id) return;

    setLoading(true);
    try {
      const data = await apiClient.get(`/batch-weighings/batch/${batch.id}/history`);
      setWeighings(data || []);
    } catch (error: any) {
      console.error('Erreur chargement pesées batch:', error);
      Alert.alert('Erreur', 'Impossible de charger les pesées');
      setWeighings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

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
    if (isBatchMode && batch?.id) {
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
    ? `Pesées - ${batch?.pen_name || 'Bande'}`
    : animalId
    ? 'Pesées - Animal'
    : 'Pesées';
  const subtitle = isBatchMode
    ? `${batch?.total_count || 0} porc(s)`
    : `${stats.total} pesée(s)`;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StandardHeader icon="scale" title={title} subtitle={subtitle} />

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
            {/* Carte de statistiques */}
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
                    {isBatchMode ? 'Poids moyen' : 'Poids moyen'}
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
                isBatchMode={isBatchMode}
              />
            ))}
          </>
        )}

        <Button
          title="Nouvelle pesée"
          onPress={() => setModalVisible(true)}
          icon={<Ionicons name="add-circle-outline" size={20} color="#fff" />}
          style={styles.addButton}
        />
      </ScrollView>

      {/* Modal de création de pesée */}
      {isBatchMode && batch ? (
        <ProductionPeseeFormModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSuccess={() => {
            loadBatchWeighings();
            setModalVisible(false);
          }}
          projetId={projetActif.id}
          animal={null} // Pas d'animal en mode batch
          batchId={batch.id}
          batchTotalCount={batch.total_count}
        />
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
  addButton: {
    marginTop: SPACING.md,
  },
});

