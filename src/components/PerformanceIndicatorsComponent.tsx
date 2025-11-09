/**
 * Composant indicateurs de performance avec calcul du coût de production
 */

import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setIndicateursPerformance, setRecommandations } from '../store/slices/reportsSlice';
import { loadProductionAnimaux, loadPeseesParAnimal } from '../store/slices/productionSlice';
import { loadMortalites } from '../store/slices/mortalitesSlice';
import { IndicateursPerformance, Recommandation } from '../types';
import { SPACING, FONT_SIZES } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import StatCard from './StatCard';
import LoadingSpinner from './LoadingSpinner';
import { parseISO, differenceInMonths, differenceInDays, isAfter, isBefore } from 'date-fns';

export default function PerformanceIndicatorsComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { chargesFixes, depensesPonctuelles } = useAppSelector((state) => state.finance);
  const { gestations, sevrages } = useAppSelector((state) => state.reproduction);
  const { rations } = useAppSelector((state) => state.nutrition);
  const { animaux, peseesParAnimal } = useAppSelector((state) => state.production);
  const { mortalites } = useAppSelector((state) => state.mortalites);
  const { indicateursPerformance, recommandations } = useAppSelector((state) => state.reports);

  // Charger les animaux de production et leurs pesées
  useEffect(() => {
    if (projetActif) {
      dispatch(loadProductionAnimaux({ projetId: projetActif.id, inclureInactifs: true }));
      dispatch(loadMortalites(projetActif.id));
    }
  }, [dispatch, projetActif]);

  useEffect(() => {
    animaux.forEach((animal) => {
      dispatch(loadPeseesParAnimal(animal.id));
    });
  }, [dispatch, animaux]);

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

    // Calculer les mortalités à partir des données réelles
    const nombrePorcsMorts = mortalites.reduce((sum, m) => sum + m.nombre_porcs, 0);
    
    // Calculer le nombre de porcs vivants (total - morts)
    // Le nombre total inclut les truies, verrats et porcelets
    const nombrePorcsVivants = Math.max(0, nombrePorcsTotal - nombrePorcsMorts);

    // Calculer le taux de mortalité
    // Taux = (nombre de morts / nombre total initial) * 100
    // Le nombre total initial = nombre actuel + nombre de morts
    const nombrePorcsTotalInitial = nombrePorcsTotal + nombrePorcsMorts;
    const tauxMortalite =
      nombrePorcsTotalInitial > 0 ? (nombrePorcsMorts / nombrePorcsTotalInitial) * 100 : 0;

    // Calculer le taux de croissance (basé sur les sevrages)
    const gestationsTerminees = gestations.filter((g) => g.statut === 'terminee');
    const tauxCroissance = gestationsTerminees.length > 0 && sevrages.length > 0 
      ? (sevrages.length / gestationsTerminees.length) * 100 
      : 0;

    // Calculer l'efficacité alimentaire (ratio poids_gain / alimentation_consommee)
    // On utilise le poids réel basé sur les pesées si disponible
    const alimentationTotale = coutAlimentationTotal; // En CFA, à convertir en kg si nécessaire
    
    // Calculer le poids réel pour l'efficacité alimentaire (dernières pesées)
    let poidsReelPourEfficacite = 0;
    animaux.forEach((animal) => {
      const pesees = peseesParAnimal[animal.id] || [];
      if (pesees.length > 0) {
        const peseesTriees = [...pesees].sort((a, b) => 
          parseISO(b.date).getTime() - parseISO(a.date).getTime()
        );
        poidsReelPourEfficacite += peseesTriees[0].poids_kg;
      }
    });
    
    // Si pas de pesées, utiliser l'approximation
    if (poidsReelPourEfficacite === 0) {
      poidsReelPourEfficacite = poidsTotal;
    }
    
    const efficaciteAlimentaire =
      alimentationTotale > 0 ? poidsReelPourEfficacite / (alimentationTotale / 1000) : 0; // Approximation

    // Calculer le coût de production par kg sur TOUTE la période de production
    // 1. Trouver la période de production (date d'entrée la plus ancienne jusqu'à aujourd'hui)
    const animauxAvecDateEntree = animaux.filter((a) => a.date_entree);
    if (animauxAvecDateEntree.length === 0) {
      // Si aucun animal avec date d'entrée, utiliser l'approximation mensuelle
      // Mais on utilise quand même le poids réel basé sur les pesées si disponible
      let poidsReelPourCalcul = 0;
      animaux.forEach((animal) => {
        const pesees = peseesParAnimal[animal.id] || [];
        if (pesees.length > 0) {
          const peseesTriees = [...pesees].sort((a, b) => 
            parseISO(b.date).getTime() - parseISO(a.date).getTime()
          );
          poidsReelPourCalcul += peseesTriees[0].poids_kg;
        }
      });
      
      // Si pas de pesées, utiliser l'approximation du projet
      if (poidsReelPourCalcul === 0) {
        poidsReelPourCalcul = poidsTotal;
      }
      
      const coutTotalMensuel = chargesFixesMensuelles + depensesPonctuellesTotales / 12;
      const coutProductionKg = poidsReelPourCalcul > 0 ? coutTotalMensuel / poidsReelPourCalcul : 0;
      return {
        taux_mortalite: tauxMortalite,
        taux_croissance: tauxCroissance,
        efficacite_alimentaire: efficaciteAlimentaire,
        cout_production_kg: coutProductionKg,
        nombre_porcs_total: nombrePorcsTotal,
        nombre_porcs_vivants: nombrePorcsVivants,
        nombre_porcs_morts: nombrePorcsMorts,
        poids_total: poidsReelPourCalcul,
        alimentation_totale: alimentationTotale,
      } as IndicateursPerformance;
    }

    const datesEntree = animauxAvecDateEntree.map((a) => parseISO(a.date_entree!));
    const dateDebutProduction = new Date(Math.min(...datesEntree.map((d) => d.getTime())));
    const dateFinProduction = new Date(); // Aujourd'hui

    // 2. Calculer le nombre de mois de production
    const nombreMoisProduction = Math.max(1, differenceInMonths(dateFinProduction, dateDebutProduction) + 1);

    // 3. Calculer les charges fixes totales sur toute la période
    const chargesFixesTotales = chargesFixesActives.reduce((sum, cf) => {
      let montantMensuel = 0;
      if (cf.frequence === 'mensuel') montantMensuel = cf.montant;
      else if (cf.frequence === 'trimestriel') montantMensuel = cf.montant / 3;
      else if (cf.frequence === 'annuel') montantMensuel = cf.montant / 12;
      
      // Si la charge fixe a une date de début, ne compter que depuis cette date
      if (cf.date_debut) {
        const dateDebutCharge = parseISO(cf.date_debut);
        
        // Ne compter que si la charge a commencé avant ou pendant la période de production
        if (isAfter(dateDebutCharge, dateFinProduction)) {
          return sum; // La charge commence après la fin de production
        }
        
        // Si la charge est terminée (statut = 'termine'), utiliser la date de dernière modification comme fin
        // Sinon, elle continue jusqu'à aujourd'hui
        const dateFinCharge = cf.statut === 'termine' && cf.derniere_modification 
          ? parseISO(cf.derniere_modification)
          : dateFinProduction;
        
        const debutEffectif = isAfter(dateDebutCharge, dateDebutProduction) ? dateDebutCharge : dateDebutProduction;
        const finEffectif = isBefore(dateFinCharge, dateFinProduction) ? dateFinCharge : dateFinProduction;
        
        // Ne compter que si la période effective est valide
        if (isAfter(debutEffectif, finEffectif)) {
          return sum;
        }
        
        const moisEffectifs = Math.max(1, differenceInMonths(finEffectif, debutEffectif) + 1);
        return sum + montantMensuel * moisEffectifs;
      }
      
      // Si pas de date_debut, compter sur toute la période de production
      return sum + montantMensuel * nombreMoisProduction;
    }, 0);

    // 4. Calculer les dépenses ponctuelles dans la période de production
    const depensesPonctuellesDansPeriode = depensesPonctuelles.reduce((sum, dp) => {
      const dateDepense = parseISO(dp.date);
      if (isAfter(dateDepense, dateFinProduction) || isBefore(dateDepense, dateDebutProduction)) {
        return sum;
      }
      return sum + dp.montant;
    }, 0);

    // 5. Calculer le coût total d'alimentation (rations) dans la période
    const coutAlimentationDansPeriode = rations.reduce((sum, ration) => {
      const dateRation = parseISO(ration.date_creation);
      if (isAfter(dateRation, dateFinProduction) || isBefore(dateRation, dateDebutProduction)) {
        return sum;
      }
      return sum + (ration.cout_total || 0);
    }, 0);

    // 6. Calculer le poids total actuel du cheptel (basé sur les dernières pesées réelles)
    // On utilise la dernière pesée de chaque animal pour obtenir le poids total actuel
    let poidsTotalProduit = 0;
    let animauxAvecPesee = 0;
    
    animaux.forEach((animal) => {
      const pesees = peseesParAnimal[animal.id] || [];
      if (pesees.length > 0) {
        // Trier les pesées par date (la plus récente en premier)
        const peseesTriees = [...pesees].sort((a, b) => 
          parseISO(b.date).getTime() - parseISO(a.date).getTime()
        );
        
        // Prendre la dernière pesée (la plus récente)
        const dernierePesee = peseesTriees[0];
        const datePesee = parseISO(dernierePesee.date);
        
        // Ne compter que si la pesée est dans la période de production
        if (!isAfter(datePesee, dateFinProduction) && !isBefore(datePesee, dateDebutProduction)) {
          poidsTotalProduit += dernierePesee.poids_kg;
          animauxAvecPesee++;
        }
      }
    });

    // Si aucun animal n'a de pesée, utiliser l'approximation basée sur le projet
    // Sinon, si certains animaux n'ont pas de pesée, on peut les estimer avec le poids moyen
    if (animauxAvecPesee === 0) {
      poidsTotalProduit = poidsTotal;
    } else if (animauxAvecPesee < animaux.length) {
      // Si certains animaux n'ont pas de pesée, estimer leur poids avec le poids moyen du projet
      const animauxSansPesee = animaux.length - animauxAvecPesee;
      const poidsEstime = projetActif.poids_moyen_actuel * animauxSansPesee;
      poidsTotalProduit += poidsEstime;
    }

    // 7. Calculer le coût total sur toute la période
    const coutTotalProduction = chargesFixesTotales + depensesPonctuellesDansPeriode + coutAlimentationDansPeriode;

    // 8. Calculer le coût par kg
    const coutProductionKg = poidsTotalProduit > 0 ? coutTotalProduction / poidsTotalProduit : 0;

    return {
      taux_mortalite: tauxMortalite,
      taux_croissance: tauxCroissance,
      efficacite_alimentaire: efficaciteAlimentaire,
      cout_production_kg: coutProductionKg,
      nombre_porcs_total: nombrePorcsTotal,
      nombre_porcs_vivants: nombrePorcsVivants,
      nombre_porcs_morts: nombrePorcsMorts,
      poids_total: poidsTotalProduit || poidsTotal,
      alimentation_totale: alimentationTotale,
    } as IndicateursPerformance;
  }, [
    projetActif,
    chargesFixes,
    depensesPonctuelles,
    gestations,
    sevrages,
    rations,
    animaux,
    peseesParAnimal,
    mortalites,
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
        return colors.warning;
      case 'information':
        return colors.textSecondary;
      case 'succes':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Indicateurs de Performance</Text>

        {calculatedIndicators ? (
          <>
            {/* Indicateurs principaux */}
            <View style={styles.statsContainer}>
              <StatCard
                value={calculatedIndicators.taux_mortalite.toFixed(1)}
                label="Taux de mortalité"
                unit="%"
                valueColor={
                  calculatedIndicators.taux_mortalite > 5 ? colors.error : colors.success
                }
              />
              <StatCard
                value={calculatedIndicators.taux_croissance.toFixed(1)}
                label="Taux de croissance"
                unit="%"
                valueColor={colors.primary}
              />
              <StatCard
                value={calculatedIndicators.efficacite_alimentaire.toFixed(2)}
                label="Efficacité alimentaire"
                valueColor={
                  calculatedIndicators.efficacite_alimentaire > 2.5
                    ? colors.success
                    : colors.warning
                }
              />
            </View>

            {/* Coût de production */}
            <View style={styles.costSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Coût de Production</Text>
              <View style={[styles.costCard, { backgroundColor: colors.surface }]}>
                <Text style={[styles.costLabel, { color: colors.textSecondary }]}>Coût par kilogramme:</Text>
                <Text style={[styles.costValue, { color: colors.text }]}>
                  {formatAmount(calculatedIndicators.cout_production_kg)}
                </Text>
              </View>
            </View>

            {/* Détails */}
            <View style={styles.detailsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Détails</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Nombre total de porcs:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {calculatedIndicators.nombre_porcs_total}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Porcs vivants:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {calculatedIndicators.nombre_porcs_vivants}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Porcs morts:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {calculatedIndicators.nombre_porcs_morts}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Poids total:</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {calculatedIndicators.poids_total.toFixed(1)} kg
                </Text>
              </View>
            </View>

            {/* Recommandations */}
            {recommandations.length > 0 && (
              <View style={styles.recommendationsSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>💡 Recommandations</Text>
                {recommandations.map((rec) => (
                  <View
                    key={rec.id}
                    style={[
                      styles.recommendationCard,
                      { borderLeftColor: getRecommandationColor(rec.type), backgroundColor: colors.surface },
                    ]}
                  >
                    <Text style={[styles.recommendationTitle, { color: colors.text }]}>{rec.titre}</Text>
                    <Text style={[styles.recommendationMessage, { color: colors.textSecondary }]}>{rec.message}</Text>
                    {rec.action && (
                      <Text style={[styles.recommendationAction, { color: colors.primary }]}>→ {rec.action}</Text>
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
    marginBottom: SPACING.md,
  },
  costCard: {
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  costLabel: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.xs,
  },
  costValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
  },
  detailsSection: {
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
  },
  detailValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  recommendationsSection: {
    marginBottom: SPACING.lg,
  },
  recommendationCard: {
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
  },
  recommendationTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  recommendationMessage: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  recommendationAction: {
    fontSize: FONT_SIZES.sm,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});

