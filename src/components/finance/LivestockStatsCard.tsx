/**
 * Composant pour afficher les statistiques du cheptel actif
 */

import React, { memo, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { 
  selectPeseesParAnimal, 
  selectProductionUpdateCounter 
} from '../../store/selectors/productionSelectors';
import { SPACING, FONT_SIZES } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../Card';
import { calculatePoidsTotalAnimauxActifs } from '../../utils/animalUtils';
import { useAnimauxActifs } from '../../hooks/useAnimauxActifs';
import { useLoadAnimauxOnMount } from '../../hooks/useLoadAnimauxOnMount';
import apiClient from '../../services/api/apiClient';
import type { Batch } from '../../types/batch';
import { logger } from '../../utils/logger';
import { TAUX_CARCASSE } from '../../config/finance.config';

const MIN_RELOAD_INTERVAL = 60000; // 1 minute minimum entre rechargements

function LivestockStatsCard() {
  const { colors } = useTheme();
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  const peseesParAnimal = useAppSelector(selectPeseesParAnimal);
  const updateCounter = useAppSelector(selectProductionUpdateCounter);
  const { animauxActifs } = useAnimauxActifs({ projetId: projetActif?.id });
  
  // État pour les batches (mode batch)
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  
  // Référence pour le dernier chargement (éviter les appels excessifs)
  const lastLoadRef = useRef<number>(0);

  // Détecter le mode batch
  const isModeBatch = projetActif?.management_method === 'batch';

  // Charger les batches en mode batch
  const loadBatches = useCallback(async () => {
    if (!projetActif?.id || !isModeBatch) return;

    setLoadingBatches(true);
    try {
      const batchesData = await apiClient.get<Batch[]>(
        `/batch-pigs/projet/${projetActif.id}`
      );
      setBatches(batchesData);
    } catch (error: any) {
      logger.error('[LivestockStatsCard] Erreur lors du chargement des batches:', error);
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  }, [projetActif?.id, isModeBatch]);

  // Charger les batches quand l'écran est visible (mode batch uniquement)
  // AVEC condition de temps pour éviter les appels excessifs
  useFocusEffect(
    useCallback(() => {
      if (!isModeBatch) return;
      
      const now = Date.now();
      if (now - lastLoadRef.current < MIN_RELOAD_INTERVAL) {
        return; // Données récentes, ne pas recharger
      }
      
      lastLoadRef.current = now;
      loadBatches();
    }, [isModeBatch, loadBatches])
  );

  // Charger les animaux au montage (hook doit toujours être appelé, même si on ne l'utilise pas en mode batch)
  useLoadAnimauxOnMount();

  const statsCheptel = React.useMemo(() => {
    if (!projetActif) {
      return {
        nombreAnimaux: 0,
        poidsTotal: 0,
        poidsCarcasse: 0,
        poidsMoyen: 0,
      };
    }

    // Mode batch : calculer à partir des batches
    if (isModeBatch) {
      const nombreAnimaux = batches.reduce((sum, batch) => sum + (batch.total_count || 0), 0);
      
      // Calculer le poids total : somme de (average_weight_kg * total_count) pour chaque batch
      const poidsTotal = batches.reduce((sum, batch) => {
        const poidsMoyenBatch = batch.average_weight_kg || 0;
        const nombreBatch = batch.total_count || 0;
        return sum + (poidsMoyenBatch * nombreBatch);
      }, 0);

      const poidsCarcasse = poidsTotal * TAUX_CARCASSE;
      const poidsMoyen = nombreAnimaux > 0 ? poidsTotal / nombreAnimaux : 0;

      return {
        nombreAnimaux,
        poidsTotal,
        poidsCarcasse,
        poidsMoyen,
      };
    }

    // Mode individuel : calculer à partir des animaux
    const poidsTotal = calculatePoidsTotalAnimauxActifs(
      animauxActifs,
      peseesParAnimal,
      projetActif.poids_moyen_actuel || 0
    );

    const nombreAnimaux = animauxActifs.length;
    const poidsCarcasse = poidsTotal * TAUX_CARCASSE;
    const poidsMoyen = nombreAnimaux > 0 ? poidsTotal / nombreAnimaux : 0;

    return {
      nombreAnimaux,
      poidsTotal,
      poidsCarcasse,
      poidsMoyen,
    };
  }, [animauxActifs, peseesParAnimal, projetActif, updateCounter, isModeBatch, batches]); // Ajouter batches et isModeBatch aux dépendances

  if (!projetActif) return null;

  return (
    <Card style={StyleSheet.flatten([styles.statsCard, { backgroundColor: colors.surface }])}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Statistiques du cheptel actif
      </Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Nombre d'animaux</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {statsCheptel.nombreAnimaux}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Poids total vif</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {statsCheptel.poidsTotal.toFixed(1)} kg
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Poids total carcasse
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {statsCheptel.poidsCarcasse.toFixed(1)} kg
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            Poids moyen/animal
          </Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {statsCheptel.poidsMoyen.toFixed(1)} kg
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: SPACING.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

// Mémoriser le composant pour éviter les re-renders inutiles
const LivestockStatsCardMemoized = memo(LivestockStatsCard);
export default LivestockStatsCardMemoized;
