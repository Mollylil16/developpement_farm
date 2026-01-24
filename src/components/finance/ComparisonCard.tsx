/**
 * Composant pour la comparaison des options de vente et recommandations
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { useProjetEffectif } from '../../hooks/useProjetEffectif';
import { selectPeseesParAnimal } from '../../store/selectors/productionSelectors';
import { SPACING, FONT_SIZES } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../Card';
import { calculatePoidsTotalAnimauxActifs } from '../../utils/animalUtils';
import { useAnimauxActifs } from '../../hooks/useAnimauxActifs';
import apiClient from '../../services/api/apiClient';
import type { Batch } from '../../types/batch';
import { logger } from '../../utils/logger';
import { TAUX_CARCASSE } from '../../config/finance.config';

const PRIX_KG_VIF_DEFAUT = 1000;
const PRIX_KG_CARCASSE_DEFAUT = 1300;
const MIN_RELOAD_INTERVAL = 60000; // 1 minute minimum entre rechargements

export default function ComparisonCard() {
  const { colors } = useTheme();
  // Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens
  const projetActif = useProjetEffectif();
  const peseesParAnimal = useAppSelector(selectPeseesParAnimal);
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
      logger.error('[ComparisonCard] Erreur lors du chargement des batches:', error);
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

  // Fonction pour calculer le poids total (utilisée dans plusieurs useMemo)
  const calculatePoidsTotal = useCallback(() => {
    if (!projetActif) return 0;

    // Mode batch : calculer à partir des batches
    // IMPORTANT: Utiliser la même logique que LivestockStatsCard pour la cohérence
    // mais exclure les reproducteurs car ils ne sont généralement pas vendus
    if (isModeBatch) {
      // Exclure les reproducteurs du calcul (truies_reproductrices et verrats_reproducteurs)
      // car les reproducteurs ne sont généralement pas vendus
      const batchesNonReproducteurs = batches.filter(
        (batch) =>
          batch.category !== 'truie_reproductrice' && batch.category !== 'verrat_reproducteur'
      );

      // Calculer le poids total : somme de (average_weight_kg * total_count) pour chaque batch non reproducteur
      // Même logique que LivestockStatsCard, mais en excluant les reproducteurs
      return batchesNonReproducteurs.reduce((sum, batch) => {
        const poidsMoyenBatch = batch.average_weight_kg || 0;
        const nombreBatch = batch.total_count || 0;
        // Utiliser la même logique que LivestockStatsCard (pas de validation supplémentaire)
        return sum + (poidsMoyenBatch * nombreBatch);
      }, 0);
    }

    // Mode individuel : calculer à partir des animaux
    return calculatePoidsTotalAnimauxActifs(
      animauxActifs,
      peseesParAnimal,
      projetActif.poids_moyen_actuel || 0
    );
  }, [isModeBatch, batches, animauxActifs, peseesParAnimal, projetActif]);

  const comparaisonOptions = React.useMemo(() => {
    if (!projetActif) {
      return {
        difference: 0,
        pourcentageDifference: 0,
        meilleureOption: 'vif' as const,
      };
    }

    const poidsTotal = calculatePoidsTotal();

    const prixKgVif = projetActif.prix_kg_vif || PRIX_KG_VIF_DEFAUT;
    const prixKgCarcasse = projetActif.prix_kg_carcasse || PRIX_KG_CARCASSE_DEFAUT;

    const revenuVifInitial = poidsTotal * prixKgVif;
    const poidsCarcasse = poidsTotal * TAUX_CARCASSE;
    const revenuCarcasseInitial = poidsCarcasse * prixKgCarcasse;

    const difference = revenuCarcasseInitial - revenuVifInitial;
    const pourcentageDifference = revenuVifInitial > 0 ? (difference / revenuVifInitial) * 100 : 0;

    return {
      difference,
      pourcentageDifference,
      meilleureOption: difference > 0 ? ('carcasse' as const) : ('vif' as const),
    };
  }, [
    projetActif?.id,
    projetActif?.prix_kg_vif,
    projetActif?.prix_kg_carcasse,
    calculatePoidsTotal,
  ]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!projetActif) return null;

  const revenuVifInitial = React.useMemo(() => {
    const poidsTotal = calculatePoidsTotal();
    return poidsTotal * (projetActif.prix_kg_vif || PRIX_KG_VIF_DEFAUT);
  }, [calculatePoidsTotal, projetActif?.prix_kg_vif]);

  if (revenuVifInitial === 0) return null;

  return (
    <Card style={StyleSheet.flatten([styles.comparisonCard, { backgroundColor: colors.surface }])}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Comparaison des options</Text>
      <View style={styles.comparisonContent}>
        <View style={styles.comparisonRow}>
          <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>
            Différence (Carcasse - Vif):
          </Text>
          <Text
            style={[
              styles.comparisonValue,
              {
                color: comparaisonOptions.difference >= 0 ? colors.success : colors.error,
                fontWeight: 'bold',
              },
            ]}
          >
            {comparaisonOptions.difference >= 0 ? '+' : ''}
            {formatAmount(comparaisonOptions.difference)} (
            {comparaisonOptions.pourcentageDifference.toFixed(1)}%)
          </Text>
        </View>
        <View
          style={[
            styles.recommendationBox,
            {
              backgroundColor:
                comparaisonOptions.meilleureOption === 'carcasse'
                  ? colors.success + '20'
                  : colors.accent + '20',
            },
          ]}
        >
          <Text style={[styles.recommendationTitle, { color: colors.text }]}>
            💡 Recommandation
          </Text>
          <Text style={[styles.recommendationText, { color: colors.text }]}>
            {comparaisonOptions.meilleureOption === 'carcasse'
              ? `La vente en carcasse est plus avantageuse de ${formatAmount(Math.abs(comparaisonOptions.difference))} (${Math.abs(comparaisonOptions.pourcentageDifference).toFixed(1)}% de plus).`
              : `La vente en vif est plus avantageuse de ${formatAmount(Math.abs(comparaisonOptions.difference))} (${Math.abs(comparaisonOptions.pourcentageDifference).toFixed(1)}% de plus).`}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  comparisonCard: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  comparisonContent: {
    gap: SPACING.md,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  comparisonLabel: {
    fontSize: FONT_SIZES.md,
    flex: 1,
  },
  comparisonValue: {
    fontSize: FONT_SIZES.md,
  },
  recommendationBox: {
    padding: SPACING.md,
    borderRadius: SPACING.sm,
    marginTop: SPACING.sm,
  },
  recommendationTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  recommendationText: {
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
});
