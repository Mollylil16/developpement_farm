/**
 * Composant indicateurs de performance avec calcul du coût de production
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setIndicateursPerformance, setRecommandations } from '../store/slices/reportsSlice';
import { IndicateursPerformance, Recommandation } from '../types';
import { COLORS, SPACING, FONT_SIZES } from '../constants/theme';
import StatCard from './StatCard';
import LoadingSpinner from './LoadingSpinner';

export default function PerformanceIndicatorsComponent() {
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { chargesFixes, depensesPonctuelles } = useAppSelector((state) => state.finance);
  const { gestations, sevrages } = useAppSelector((state) => state.reproduction);
  const { rations } = useAppSelector((state) => state.nutrition);
  const { indicateursPerformance, recommandations } = useAppSelector((state) => state.reports);

  // Calculer les indicateurs de performance
  const calculatedIndicators = useMemo(() => {
    if (!projetActif) return null;

    // Calculer les dépenses totales (charges fixes + dépenses ponctuelles)
    const chargesFixesActives = chargesFixes.filter((cf) => cf.statut === 'actif');
    const chargesFixesMensuelles = chargesFixesActives.reduce((sum, cf) => {
      if (cf.frequence === 'mensuel') return sum + cf.montant;
      if (cf.frequence === 'trimestriel') return sum + cf.montant / 3;
      if (cf.frequence === 'annuel') return sum + cf.montant / 12;
      return sum;
    }, 0);

    const depensesPonctuellesTotales = depensesPonctuelles.reduce(
      (sum, dp) => sum + dp.montant,
      0
    );

    // Calculer le coût total d'alimentation depuis les rations
    const coutAlimentationTotal = rations.reduce((sum, ration) => {
      return sum + (ration.cout_total || 0);
    }, 0);

    // Calculer le poids total (approximation basée sur le projet)
    const poidsTotal = projetActif.poids_moyen_actuel * projetActif.nombre_porcelets;

    // Calculer le nombre de porcs total
    const nombrePorcsTotal =
      projetActif.nombre_truies +
      projetActif.nombre_verrats +
      projetActif.nombre_porcelets;

    // Calculer les mortalités (approximation - nécessiterait une table mortalites)
    // Pour l'instant, on utilise une estimation basée sur les gestations terminées
    const gestationsTerminees = gestations.filter((g) => g.statut === 'terminee');
    const nombrePorceletsNes = gestationsTerminees.reduce(
      (sum, g) => sum + (g.nombre_porcelets_reel || g.nombre_porcelets_prevu),
      0
    );
    const nombrePorceletsVivants = projetActif.nombre_porcelets;
    const nombrePorceletsMorts = nombrePorceletsNes - nombrePorceletsVivants;
    const nombrePorcsMorts = nombrePorceletsMorts; // Approximation

    // Calculer le taux de mortalité
    const tauxMortalite =
      nombrePorcsTotal > 0 ? (nombrePorcsMorts / nombrePorcsTotal) * 100 : 0;

    // Calculer le taux de croissance (basé sur les sevrages)
    const tauxCroissance = sevrages.length > 0 ? (sevrages.length / gestationsTerminees.length) * 100 : 0;

    // Calculer l'efficacité alimentaire (ratio poids_gain / alimentation_consommee)
    // Approximation: poids_total / alimentation_totale
    const alimentationTotale = coutAlimentationTotal; // En CFA, à convertir en kg si nécessaire
    const efficaciteAlimentaire =
      alimentationTotale > 0 ? poidsTotal / (alimentationTotale / 1000) : 0; // Approximation

    // Calculer le coût de production par kg
    const coutTotalMensuel = chargesFixesMensuelles + depensesPonctuellesTotales / 12; // Approximation mensuelle
    const coutProductionKg = poidsTotal > 0 ? coutTotalMensuel / poidsTotal : 0;

    return {
      taux_mortalite: tauxMortalite,
      taux_croissance: tauxCroissance,
      efficacite_alimentaire: efficaciteAlimentaire,
      cout_production_kg: coutProductionKg,
      nombre_porcs_total: nombrePorcsTotal,
      nombre_porcs_vivants: nombrePorceletsVivants,
      nombre_porcs_morts: nombrePorcsMorts,
      poids_total: poidsTotal,
      alimentation_totale: alimentationTotale,
    } as IndicateursPerformance;
  }, [
    projetActif,
    chargesFixes,
    depensesPonctuelles,
    gestations,
    sevrages,
    rations,
  ]);

  // Générer les recommandations
  const generatedRecommandations = useMemo(() => {
    const recs: Recommandation[] = [];

    if (!calculatedIndicators) return recs;

    // Recommandation sur le taux de mortalité
    if (calculatedIndicators.taux_mortalite > 5) {
      recs.push({
        id: 'rec_mortalite',
        type: 'avertissement',
        titre: 'Taux de mortalité élevé',
        message: `Le taux de mortalité est de ${calculatedIndicators.taux_mortalite.toFixed(1)}%. Il est recommandé de vérifier les conditions d'élevage.`,
        action: 'Vérifier les installations et les soins vétérinaires',
      });
    }

    // Recommandation sur l'efficacité alimentaire
    if (calculatedIndicators.efficacite_alimentaire < 2) {
      recs.push({
        id: 'rec_efficacite',
        type: 'avertissement',
        titre: 'Efficacité alimentaire faible',
        message: `L'efficacité alimentaire est de ${calculatedIndicators.efficacite_alimentaire.toFixed(2)}. Pensez à ajuster les rations.`,
        action: 'Optimiser les rations dans le module Nutrition',
      });
    }

    // Recommandation sur le coût de production
    if (calculatedIndicators.cout_production_kg > 2000) {
      recs.push({
        id: 'rec_cout',
        type: 'information',
        titre: 'Coût de production élevé',
        message: `Le coût de production par kg est de ${calculatedIndicators.cout_production_kg.toFixed(0)} CFA/kg. Analysez vos dépenses.`,
        action: 'Consulter le module Finance pour optimiser les coûts',
      });
    }

    // Recommandation positive si tout va bien
    if (
      calculatedIndicators.taux_mortalite < 3 &&
      calculatedIndicators.efficacite_alimentaire > 2.5 &&
      calculatedIndicators.cout_production_kg < 1500
    ) {
      recs.push({
        id: 'rec_succes',
        type: 'succes',
        titre: 'Performance excellente',
        message: 'Vos indicateurs sont excellents ! Continuez ainsi.',
        action: undefined,
      });
    }

    return recs;
  }, [calculatedIndicators]);

  useEffect(() => {
    if (calculatedIndicators) {
      dispatch(setIndicateursPerformance(calculatedIndicators));
    }
    if (generatedRecommandations.length > 0) {
      dispatch(setRecommandations(generatedRecommandations));
    }
  }, [calculatedIndicators, generatedRecommandations, dispatch]);

  if (!projetActif) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Aucun projet actif</Text>
      </View>
    );
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getRecommandationColor = (type: string) => {
    switch (type) {
      case 'avertissement':
        return COLORS.warning;
      case 'information':
        return COLORS.textSecondary;
      case 'succes':
        return COLORS.success;
      default:
        return COLORS.textSecondary;
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Indicateurs de Performance</Text>

        {calculatedIndicators ? (
          <>
            {/* Indicateurs principaux */}
            <View style={styles.statsContainer}>
              <StatCard
                value={calculatedIndicators.taux_mortalite.toFixed(1)}
                label="Taux de mortalité"
                unit="%"
                valueColor={
                  calculatedIndicators.taux_mortalite > 5 ? COLORS.error : COLORS.success
                }
              />
              <StatCard
                value={calculatedIndicators.taux_croissance.toFixed(1)}
                label="Taux de croissance"
                unit="%"
                valueColor={COLORS.primary}
              />
              <StatCard
                value={calculatedIndicators.efficacite_alimentaire.toFixed(2)}
                label="Efficacité alimentaire"
                valueColor={
                  calculatedIndicators.efficacite_alimentaire > 2.5
                    ? COLORS.success
                    : COLORS.warning
                }
              />
            </View>

            {/* Coût de production */}
            <View style={styles.costSection}>
              <Text style={styles.sectionTitle}>Coût de Production</Text>
              <View style={styles.costCard}>
                <Text style={styles.costLabel}>Coût par kilogramme:</Text>
                <Text style={styles.costValue}>
                  {formatAmount(calculatedIndicators.cout_production_kg)}
                </Text>
              </View>
            </View>

            {/* Détails */}
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Détails</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Nombre total de porcs:</Text>
                <Text style={styles.detailValue}>
                  {calculatedIndicators.nombre_porcs_total}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Porcs vivants:</Text>
                <Text style={styles.detailValue}>
                  {calculatedIndicators.nombre_porcs_vivants}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Porcs morts:</Text>
                <Text style={styles.detailValue}>
                  {calculatedIndicators.nombre_porcs_morts}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Poids total:</Text>
                <Text style={styles.detailValue}>
                  {calculatedIndicators.poids_total.toFixed(1)} kg
                </Text>
              </View>
            </View>

            {/* Recommandations */}
            {recommandations.length > 0 && (
              <View style={styles.recommendationsSection}>
                <Text style={styles.sectionTitle}>💡 Recommandations</Text>
                {recommandations.map((rec) => (
                  <View
                    key={rec.id}
                    style={[
                      styles.recommendationCard,
                      { borderLeftColor: getRecommandationColor(rec.type) },
                    ]}
                  >
                    <Text style={styles.recommendationTitle}>{rec.titre}</Text>
                    <Text style={styles.recommendationMessage}>{rec.message}</Text>
                    {rec.action && (
                      <Text style={styles.recommendationAction}>→ {rec.action}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <LoadingSpinner message="Calcul des indicateurs..." />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl + 85, // 85px pour la barre de navigation + espace
  },
  content: {
    padding: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  costSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  costCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  costLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  costValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  detailsSection: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.xl,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  detailLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  recommendationsSection: {
    marginBottom: SPACING.lg,
  },
  recommendationCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
  },
  recommendationTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  recommendationMessage: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  recommendationAction: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});

