/**
 * Composant pour afficher les revenus prévisionnels (VIF ou CARCASSE)
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { selectPeseesParAnimal } from '../../store/selectors/productionSelectors';
import { selectAllRevenus } from '../../store/selectors/financeSelectors';
import { SPACING, FONT_SIZES } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import Card from '../Card';
import { calculatePoidsTotalAnimauxActifs } from '../../utils/animalUtils';
import { useAnimauxActifs } from '../../hooks/useAnimauxActifs';
import apiClient from '../../services/api/apiClient';
import type { Batch } from '../../types/batch';
import { logger } from '../../utils/logger';

const TAUX_CARCASSE = 0.75; // 75% du poids vif
const PRIX_KG_VIF_DEFAUT = 1000;
const PRIX_KG_CARCASSE_DEFAUT = 1300;

interface ProjectedRevenueCardProps {
  type: 'vif' | 'carcasse';
}

export default function ProjectedRevenueCard({ type }: ProjectedRevenueCardProps) {
  const { colors } = useTheme();
  const { projetActif } = useAppSelector((state) => state.projet);
  const revenus = useAppSelector(selectAllRevenus);
  const peseesParAnimal = useAppSelector(selectPeseesParAnimal);
  const { animauxActifs } = useAnimauxActifs({ projetId: projetActif?.id });
  
  // État pour les batches (mode batch)
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

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
      logger.error('[ProjectedRevenueCard] Erreur lors du chargement des batches:', error);
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  }, [projetActif?.id, isModeBatch]);

  // Charger les batches quand l'écran est visible (mode batch uniquement)
  useFocusEffect(
    useCallback(() => {
      if (isModeBatch) {
        loadBatches();
      }
    }, [isModeBatch, loadBatches])
  );

  // Filtrer les revenus par projet
  const revenusProjet = useMemo(() => {
    if (!projetActif?.id) return [];
    return revenus.filter((r) => r.projet_id === projetActif.id);
  }, [revenus, projetActif?.id]);

  const revenusPrevisionnels = React.useMemo(() => {
    if (!projetActif) {
      return {
        revenuInitial: 0,
        revenusRealises: 0,
        revenuRestant: 0,
      };
    }

    let poidsTotal = 0;

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
      poidsTotal = batchesNonReproducteurs.reduce((sum, batch) => {
        const poidsMoyenBatch = batch.average_weight_kg || 0;
        const nombreBatch = batch.total_count || 0;
        // Utiliser la même logique que LivestockStatsCard (pas de validation supplémentaire)
        return sum + (poidsMoyenBatch * nombreBatch);
      }, 0);
    } else {
      // Mode individuel : calculer à partir des animaux
      // Exclure les reproducteurs du calcul du poids total pour les revenus prévisionnels
      // car les reproducteurs ne sont généralement pas vendus
      // Note: LivestockStatsCard n'exclut pas les reproducteurs en mode individuel,
      // mais pour les revenus prévisionnels, on les exclut car ils ne sont généralement pas vendus
      poidsTotal = calculatePoidsTotalAnimauxActifs(
        animauxActifs,
        peseesParAnimal,
        projetActif.poids_moyen_actuel || 0,
        true // exclureReproducteurs = true
      );
    }

    const prixKg =
      type === 'vif'
        ? projetActif.prix_kg_vif || PRIX_KG_VIF_DEFAUT
        : projetActif.prix_kg_carcasse || PRIX_KG_CARCASSE_DEFAUT;

    const poidsPourCalcul = type === 'vif' ? poidsTotal : poidsTotal * TAUX_CARCASSE;
    const revenuInitial = poidsPourCalcul * prixKg;
    const revenusRealises = revenusProjet
      .filter((r) => r.categorie === 'vente_porc')
      .reduce((sum, r) => sum + r.montant, 0);
    const revenuRestant = Math.max(0, revenuInitial - revenusRealises);

    return {
      revenuInitial,
      revenusRealises,
      revenuRestant,
    };
  }, [
    animauxActifs,
    peseesParAnimal,
    projetActif?.id,
    projetActif?.prix_kg_vif,
    projetActif?.prix_kg_carcasse,
    projetActif?.poids_moyen_actuel,
    revenusProjet,
    type,
    isModeBatch,
    batches,
  ]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!projetActif) return null;

  const emoji = type === 'vif' ? '🐷' : '🥩';
  const label = type === 'vif' ? 'Vente en VIF' : 'Vente en CARCASSE';

  return (
    <Card
      style={StyleSheet.flatten([styles.previsionnelCard, { backgroundColor: colors.surface }])}
    >
      <View style={styles.previsionnelHeader}>
        <Text style={[styles.previsionnelLabel, { color: colors.text }]}>
          {emoji} Revenu prévisionnel - {label}
        </Text>
      </View>
      <View style={styles.previsionnelContent}>
        <View style={styles.previsionnelRow}>
          <Text style={[styles.previsionnelText, { color: colors.textSecondary }]}>
            Potentiel initial:
          </Text>
          <Text
            style={[
              styles.previsionnelValue,
              { color: colors.success || colors.primary, fontWeight: 'bold' },
            ]}
          >
            {formatAmount(revenusPrevisionnels.revenuInitial)}
          </Text>
        </View>
        {revenusPrevisionnels.revenuInitial > 0 && (
          <>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.round(Math.min(100, (revenusPrevisionnels.revenusRealises / revenusPrevisionnels.revenuInitial) * 100))}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                {revenusPrevisionnels.revenusRealises > 0
                  ? `${((revenusPrevisionnels.revenusRealises / revenusPrevisionnels.revenuInitial) * 100).toFixed(1)}% réalisé`
                  : '0% réalisé'}
              </Text>
            </View>
            {revenusPrevisionnels.revenusRealises > 0 && (
              <View style={styles.previsionnelRow}>
                <Text style={[styles.previsionnelText, { color: colors.textSecondary }]}>
                  Déjà réalisé:
                </Text>
                <Text style={[styles.previsionnelValue, { color: colors.text }]}>
                  {formatAmount(revenusPrevisionnels.revenusRealises)}
                </Text>
              </View>
            )}
            <View style={[styles.previsionnelRow, styles.previsionnelRowHighlight]}>
              <Text
                style={[
                  styles.previsionnelText,
                  { color: colors.textSecondary, fontWeight: '600' },
                ]}
              >
                Revenu prévisionnel restant:
              </Text>
              <Text
                style={[
                  styles.previsionnelValue,
                  { color: colors.success || colors.primary, fontWeight: 'bold' },
                ]}
              >
                {formatAmount(revenusPrevisionnels.revenuRestant)}
              </Text>
            </View>
          </>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  previsionnelCard: {
    marginBottom: SPACING.lg,
  },
  previsionnelHeader: {
    marginBottom: SPACING.md,
  },
  previsionnelLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
  previsionnelContent: {
    gap: SPACING.sm,
  },
  previsionnelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previsionnelRowHighlight: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  previsionnelText: {
    fontSize: FONT_SIZES.md,
  },
  previsionnelValue: {
    fontSize: FONT_SIZES.md,
  },
  progressContainer: {
    marginVertical: SPACING.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: FONT_SIZES.sm,
    textAlign: 'right',
  },
});
