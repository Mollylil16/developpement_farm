/**
 * Composant indicateurs de performance avec calcul du coût de production
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setIndicateursPerformance, setRecommandations } from '../store/slices/reportsSlice';
import { loadProductionAnimaux, loadPeseesParAnimal } from '../store/slices/productionSlice';
import { loadMortalites } from '../store/slices/mortalitesSlice';
import { selectAllAnimaux, selectPeseesParAnimal } from '../store/selectors/productionSelectors';
import { selectAllChargesFixes, selectAllDepensesPonctuelles, selectAllRevenus } from '../store/selectors/financeSelectors';
import { selectAllGestations, selectAllSevrages } from '../store/selectors/reproductionSelectors';
import { selectAllMortalites } from '../store/selectors/mortalitesSelectors';
import { IndicateursPerformance, Recommandation, ChargeFixe, DepensePonctuelle, Gestation, Sevrage, Mortalite } from '../types';
import { SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import StatCard from './StatCard';
import LoadingSpinner from './LoadingSpinner';
import { parseISO, differenceInMonths, differenceInDays, isAfter, isBefore } from 'date-fns';
import { calculatePoidsTotalAnimauxActifs } from '../utils/animalUtils';
import { exportRapportCompletPDF } from '../services/pdf/rapportCompletPDF';

const areIndicatorsEqual = (
  a: IndicateursPerformance | null | undefined,
  b: IndicateursPerformance | null | undefined
) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.taux_mortalite === b.taux_mortalite &&
    a.taux_croissance === b.taux_croissance &&
    a.efficacite_alimentaire === b.efficacite_alimentaire &&
    a.cout_production_kg === b.cout_production_kg &&
    a.nombre_porcs_total === b.nombre_porcs_total &&
    a.nombre_porcs_vivants === b.nombre_porcs_vivants &&
    a.nombre_porcs_morts === b.nombre_porcs_morts &&
    a.poids_total === b.poids_total &&
    a.alimentation_totale === b.alimentation_totale
  );
};

const areRecommandationsEqual = (a: Recommandation[], b: Recommandation[]) => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((rec, index) => {
    const other = b[index];
    return (
      rec.id === other.id &&
      rec.type === other.type &&
      rec.titre === other.titre &&
      rec.message === other.message &&
      rec.action === other.action
    );
  });
};

export default function PerformanceIndicatorsComponent() {
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const [exportingPDF, setExportingPDF] = useState(false);
  const { projetActif } = useAppSelector((state) => state.projet);
  const chargesFixes: ChargeFixe[] = useAppSelector(selectAllChargesFixes);
  const depensesPonctuelles: DepensePonctuelle[] = useAppSelector(selectAllDepensesPonctuelles);
  const revenus = useAppSelector(selectAllRevenus);
  const gestations: Gestation[] = useAppSelector(selectAllGestations);
  const sevrages: Sevrage[] = useAppSelector(selectAllSevrages);
  const { rations } = useAppSelector((state) => state.nutrition);
  const animaux = useAppSelector(selectAllAnimaux);
  const peseesParAnimal = useAppSelector(selectPeseesParAnimal);
  const mortalites: Mortalite[] = useAppSelector(selectAllMortalites);
  const { indicateursPerformance, recommandations } = useAppSelector((state) => state.reports);

  // Utiliser useRef pour tracker les chargements et éviter les boucles
  const aChargeRef = useRef<string | null>(null);
  const animauxChargesRef = useRef<Set<string>>(new Set());
  
  // Charger les animaux de production et leurs pesées (une seule fois par projet)
  useEffect(() => {
    if (!projetActif) {
      aChargeRef.current = null;
      animauxChargesRef.current.clear();
      return;
    }
    
    // Charger uniquement si le projet a changé
    if (aChargeRef.current !== projetActif.id) {
      aChargeRef.current = projetActif.id;
      animauxChargesRef.current.clear(); // Réinitialiser pour le nouveau projet
      dispatch(loadProductionAnimaux({ projetId: projetActif.id, inclureInactifs: true }));
      dispatch(loadMortalites(projetActif.id));
    }
  }, [dispatch, projetActif?.id]);
  
  // Créer un identifiant stable basé sur les IDs des animaux pour éviter les boucles infinies
  const animauxIdsString = useMemo(() => {
    if (!Array.isArray(animaux)) return '';
    return animaux.map(a => a.id).sort().join(',');
  }, [animaux]);

  // Créer un identifiant stable basé sur les clés de peseesParAnimal pour éviter les boucles infinies
  const peseesParAnimalKeysString = useMemo(() => {
    if (!peseesParAnimal || typeof peseesParAnimal !== 'object') return '';
    return Object.keys(peseesParAnimal).sort().join(',');
  }, [peseesParAnimal]);

  useEffect(() => {
    if (!projetActif || !Array.isArray(animaux) || animaux.length === 0) return;
    
    // Charger uniquement si on est sur le bon projet
    if (aChargeRef.current !== projetActif.id) return;
    
    // Utiliser peseesParAnimalKeysString pour éviter les re-renders inutiles
    // mais accéder à peseesParAnimal directement dans le filtre
    const animauxSansPesees = animaux.filter(
      (animal) => 
        animal.projet_id === projetActif.id &&
        (!peseesParAnimal || !peseesParAnimal[animal.id]) && 
        !animauxChargesRef.current.has(animal.id)
    );
    // Limiter à 10 animaux à la fois pour éviter de surcharger
    animauxSansPesees.slice(0, 10).forEach((animal) => {
      animauxChargesRef.current.add(animal.id);
      dispatch(loadPeseesParAnimal(animal.id));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, projetActif?.id, animauxIdsString, peseesParAnimalKeysString]);

  // Calculer les indicateurs de performance
  const calculatedIndicators = useMemo(() => {
    if (!projetActif) return null;

    // Calculer les dépenses totales (charges fixes + dépenses ponctuelles)
    const chargesFixesActives = chargesFixes.filter((cf: ChargeFixe) => cf.statut === 'actif');
    const chargesFixesMensuelles = chargesFixesActives.reduce((sum: number, cf: ChargeFixe) => {
      if (cf.frequence === 'mensuel') return sum + cf.montant;
      if (cf.frequence === 'trimestriel') return sum + cf.montant / 3;
      if (cf.frequence === 'annuel') return sum + cf.montant / 12;
      return sum;
    }, 0);

    const depensesPonctuellesTotales = depensesPonctuelles.reduce(
      (sum: number, dp: DepensePonctuelle) => sum + dp.montant,
      0
    );

    // Calculer le coût total d'alimentation depuis les rations
    const coutAlimentationTotal = rations.reduce((sum, ration) => {
      return sum + (ration.cout_total || 0);
    }, 0);

    // Filtrer les animaux du projet
    const animauxProjet = animaux.filter((animal) => animal.projet_id === projetActif.id);

    // Calculer le nombre total de porcs ACTIFS : UNIQUEMENT les animaux avec statut "Actif" (insensible à la casse)
    const nombrePorcsActifs = animauxProjet.filter((animal) => 
      animal.statut?.toLowerCase() === 'actif'
    ).length;

    // Calculer le nombre de porcs vendus : UNIQUEMENT les animaux avec statut "Vendu" (insensible à la casse)
    const nombrePorcsVendus = animauxProjet.filter((animal) => 
      animal.statut?.toLowerCase() === 'vendu'
    ).length;

    // Calculer le nombre d'animaux morts : UNIQUEMENT depuis les animaux avec statut "mort" dans le cheptel
    // C'est la source de vérité car les animaux sont automatiquement mis à jour lors de l'enregistrement d'une mortalité
    const nombrePorcsMorts = animauxProjet.filter((animal) => 
      animal.statut?.toLowerCase() === 'mort'
    ).length;

    // Population totale = tous les animaux du projet (actifs + morts + vendus + autres)
    // C'est la population initiale qui a existé dans le projet
    const nombrePorcsTotal = animauxProjet.length;

    // Calculer le poids total (basé sur les animaux actifs avec pesées)
    let poidsTotal = calculatePoidsTotalAnimauxActifs(
      animauxProjet,
      peseesParAnimal,
      projetActif.poids_moyen_actuel || 0
    );
    
    // Si aucun animal actif avec poids, utiliser l'approximation basée sur le projet
    if (poidsTotal === 0 && nombrePorcsActifs > 0) {
      poidsTotal = (projetActif.poids_moyen_actuel || 0) * nombrePorcsActifs;
    }

    // Calculer le taux de mortalité
    // Taux = (nombre de morts / population totale) * 100
    // Population totale = tous les animaux du projet (actifs + morts + vendus + autres)
    // Les animaux morts sont SOUSTRAITS de la population totale pour obtenir la population actuelle
    const tauxMortalite =
      nombrePorcsTotal > 0 ? (nombrePorcsMorts / nombrePorcsTotal) * 100 : 0;

    // Calculer le taux de croissance (basé sur les sevrages)
    const gestationsTerminees = gestations.filter((g: Gestation) => g.statut === 'terminee');
    const tauxCroissance = gestationsTerminees.length > 0 && sevrages.length > 0 
      ? (sevrages.length / gestationsTerminees.length) * 100 
      : 0;

    // Calculer l'efficacité alimentaire (ratio poids_gain / alimentation_consommee)
    // On utilise le poids réel basé sur les pesées si disponible
    const alimentationTotale = coutAlimentationTotal; // En CFA, à convertir en kg si nécessaire
    
    // Calculer le poids réel pour l'efficacité alimentaire (dernières pesées des animaux actifs)
    let poidsReelPourEfficacite = calculatePoidsTotalAnimauxActifs(
      animauxProjet,
      peseesParAnimal,
      projetActif.poids_moyen_actuel || 0
    );
    
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
      // Mais on utilise quand même le poids réel basé sur les pesées des animaux actifs si disponible
      let poidsReelPourCalcul = calculatePoidsTotalAnimauxActifs(
        animauxProjet,
        peseesParAnimal,
        projetActif.poids_moyen_actuel || 0
      );
      
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
        nombre_porcs_total: nombrePorcsActifs, // Population actuelle (animaux actifs uniquement)
        nombre_porcs_vivants: nombrePorcsVendus, // Renommé : maintenant "Porcs vendus"
        nombre_porcs_morts: nombrePorcsMorts,
        poids_total: poidsReelPourCalcul || poidsTotal,
        alimentation_totale: alimentationTotale,
      } as IndicateursPerformance;
    }

    const datesEntree = animauxAvecDateEntree.map((a) => parseISO(a.date_entree!));
    const dateDebutProduction = new Date(Math.min(...datesEntree.map((d) => d.getTime())));
    const dateFinProduction = new Date(); // Aujourd'hui

    // 2. Calculer le nombre de mois de production
    const nombreMoisProduction = Math.max(1, differenceInMonths(dateFinProduction, dateDebutProduction) + 1);

    // 3. Calculer les charges fixes totales sur toute la période
    const chargesFixesTotales = chargesFixesActives.reduce((sum: number, cf: ChargeFixe) => {
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
    const depensesPonctuellesDansPeriode = depensesPonctuelles.reduce((sum: number, dp: DepensePonctuelle) => {
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

    // 6. Calculer le poids total du cheptel dans la période de production (basé sur les dernières pesées réelles)
    // NOTE: Ce calcul diffère de FinanceRevenusComponent car :
    // - Ici : on calcule le poids dans une période de production spécifique (dateDebutProduction à dateFinProduction)
    // - FinanceRevenusComponent : calcule le poids ACTUEL total (toutes les pesées récentes, sans filtre de période)
    // On utilise la dernière pesée de chaque animal ACTIF dans la période pour obtenir le poids total
    let poidsTotalProduit = 0;
    let animauxAvecPesee = 0;
    
    // Filtrer uniquement les animaux actifs
    const animauxActifsPourPoids = animauxProjet.filter((animal) => animal.statut?.toLowerCase() === 'actif');
    
    animauxActifsPourPoids.forEach((animal) => {
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
      } else if (animal.poids_initial) {
        // Si pas de pesée mais poids initial disponible
        poidsTotalProduit += animal.poids_initial;
        animauxAvecPesee++;
      }
    });

    // Si aucun animal n'a de pesée ou poids initial, utiliser l'approximation basée sur le projet
    // Sinon, si certains animaux n'ont pas de pesée, on peut les estimer avec le poids moyen
    if (animauxAvecPesee === 0) {
      poidsTotalProduit = poidsTotal;
    } else if (animauxAvecPesee < animauxActifsPourPoids.length) {
      // Si certains animaux n'ont pas de pesée, estimer leur poids avec le poids moyen du projet
      const animauxSansPesee = animauxActifsPourPoids.length - animauxAvecPesee;
      const poidsEstime = (projetActif.poids_moyen_actuel || 0) * animauxSansPesee;
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
      nombre_porcs_total: nombrePorcsActifs, // Population actuelle (animaux actifs uniquement)
      nombre_porcs_vivants: nombrePorcsVendus, // Renommé : maintenant "Porcs vendus"
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
    if (calculatedIndicators && !areIndicatorsEqual(calculatedIndicators, indicateursPerformance)) {
      dispatch(setIndicateursPerformance(calculatedIndicators));
    }
  }, [calculatedIndicators, indicateursPerformance, dispatch]);

  useEffect(() => {
    if (
      generatedRecommandations.length > 0 &&
      !areRecommandationsEqual(generatedRecommandations, recommandations)
    ) {
      dispatch(setRecommandations(generatedRecommandations));
    }
  }, [generatedRecommandations, recommandations, dispatch]);

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

  // Fonction pour exporter le rapport COMPLET en PDF (Dashboard + Finance + Rapports)
  const handleExportPDF = useCallback(async () => {
    if (!projetActif || !calculatedIndicators) return;
    
    setExportingPDF(true);
    try {
      // Calculer les totaux financiers
      const totalCharges = chargesFixes.reduce((sum, c) => sum + c.montant, 0);
      const totalDepenses = depensesPonctuelles.reduce((sum, d) => sum + d.montant, 0);
      const totalRevenus = revenus.reduce((sum, r) => sum + r.montant, 0);
      const solde = totalRevenus - (totalCharges + totalDepenses);
      const rentabilite = totalRevenus > 0 ? ((solde / totalRevenus) * 100) : 0;
      
      // Stats de reproduction
      const gestationsTerminees = gestations.filter(g => g.statut === 'terminee').length;
      const gestationsEnCours = gestations.filter(g => g.statut === 'en_cours').length;
      const porceletsNes = gestations
        .filter(g => g.statut === 'terminee' && g.nombre_porcelets_reel)
        .reduce((sum, g) => sum + (g.nombre_porcelets_reel || 0), 0);
      const porceletsSevres = sevrages.reduce((sum, s) => sum + s.nombre_porcelets, 0);
      const tauxSurvie = porceletsNes > 0 ? ((porceletsSevres / porceletsNes) * 100) : 0;
      
      // Sevrages récents (30 derniers jours)
      const sevragesRecents = sevrages.filter(s => {
        const dateS = new Date(s.date_sevrage);
        const now = new Date();
        const diffDays = (now.getTime() - dateS.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 30;
      }).length;
      
      // Trouver la prochaine mise bas
      const gestationsAvecDatePrevue = gestations
        .filter((g) => g.statut === 'en_cours' && g.date_mise_bas_prevue)
        .sort((a, b) => new Date(a.date_mise_bas_prevue!).getTime() - new Date(b.date_mise_bas_prevue!).getTime());
      const prochaineMiseBas = gestationsAvecDatePrevue.length > 0 
        ? gestationsAvecDatePrevue[0].date_mise_bas_prevue 
        : null;
      
      // Stats de production
      const animauxActifs = animaux.filter(a => a.statut?.toLowerCase() === 'actif');
      const toutesPesees = Object.values(peseesParAnimal).flat();
      const peseesEffectuees = toutesPesees.length;
      const peseesRecentes = toutesPesees.slice(0, 20).length;
      
      // Calculer le poids total et GMQ moyen
      let poidsTotal = 0;
      const gmqValues: number[] = [];
      animauxActifs.forEach(animal => {
        const pesees = peseesParAnimal[animal.id];
        if (pesees && pesees.length > 0) {
          poidsTotal += pesees[0].poids_kg;
          if (pesees[0].gmq) {
            gmqValues.push(pesees[0].gmq);
          }
        }
      });
      const gmqMoyen = gmqValues.length > 0 
        ? gmqValues.reduce((sum, val) => sum + val, 0) / gmqValues.length 
        : 0;
      
      // Calculer le gain de poids total
      let gainPoidsTotal = 0;
      animauxActifs.forEach(animal => {
        const pesees = peseesParAnimal[animal.id];
        if (pesees && pesees.length >= 2) {
          const premierePesee = pesees[pesees.length - 1];
          const dernierePesee = pesees[0];
          gainPoidsTotal += (dernierePesee.poids_kg - premierePesee.poids_kg);
        }
      });
      
      // Calculer moyennes mensuelles
      const nombreMois = 6;
      const depensesMensuelle = (totalCharges + totalDepenses) / nombreMois;
      const revenusMensuel = totalRevenus / nombreMois;
      
      // Préparer les données pour le PDF COMPLET
      const rapportCompletData = {
        projet: projetActif,
        animaux: animaux,
        
        // Dashboard
        finances: {
          totalDepenses: totalCharges + totalDepenses,
          totalRevenus: totalRevenus,
          solde: solde,
          chargesFixes: totalCharges,
          depensesPonctuelles: totalDepenses,
        },
        productionDashboard: {
          animauxActifs: animauxActifs.length,
          peseesRecentes: peseesRecentes,
          poidsTotal: poidsTotal,
          gmqMoyen: gmqMoyen,
        },
        reproductionDashboard: {
          gestationsEnCours: gestationsEnCours,
          prochaineMiseBas: prochaineMiseBas,
          sevragesRecents: sevragesRecents,
        },
        
        // Finance détaillée
        chargesFixes: chargesFixes,
        depensesPonctuelles: depensesPonctuelles,
        revenus: revenus,
        totauxFinance: {
          chargesFixes: totalCharges,
          depensesPonctuelles: totalDepenses,
          totalDepenses: totalCharges + totalDepenses,
          totalRevenus: totalRevenus,
          solde: solde,
        },
        moyennes: {
          depensesMensuelle: depensesMensuelle,
          revenusMensuel: revenusMensuel,
        },
        
        // Indicateurs de performance
        indicateurs: {
          gmqMoyen: calculatedIndicators.taux_croissance,
          tauxMortalite: calculatedIndicators.taux_mortalite,
          tauxReproduction: calculatedIndicators.taux_croissance,
          coutProduction: calculatedIndicators.cout_production_kg,
          efficaciteAlimentaire: calculatedIndicators.efficacite_alimentaire,
          poidsVifTotal: calculatedIndicators.poids_total,
          poidsCarcasseTotal: calculatedIndicators.poids_total * 0.75,
          valeurEstimee: calculatedIndicators.poids_total * (projetActif.prix_kg_vif || 0),
        },
        production: {
          nombreAnimauxActifs: calculatedIndicators.nombre_porcs_vivants,
          peseesEffectuees: peseesEffectuees,
          gainPoidsTotal: gainPoidsTotal,
          joursProduction: 120,
        },
        financeIndicateurs: {
          totalDepenses: totalCharges + totalDepenses,
          totalRevenus: totalRevenus,
          solde: solde,
          rentabilite: rentabilite,
        },
        reproduction: {
          gestationsTerminees: gestationsTerminees,
          porceletsNes: porceletsNes,
          porceletsSevres: porceletsSevres,
          tauxSurvie: tauxSurvie,
        },
        recommandations: (recommandations || []).map(r => ({
          categorie: r.titre,
          priorite: r.type === 'avertissement' ? 'haute' as const : 'moyenne' as const,
          message: r.message,
        })),
      };
      
      // Générer et partager le PDF COMPLET
      await exportRapportCompletPDF(rapportCompletData);
      
      Alert.alert(
        '✅ Rapport complet généré',
        'Le rapport complet (Dashboard + Finance + Indicateurs) a été généré avec succès et est prêt à être partagé.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      Alert.alert(
        'Erreur',
        'Impossible de générer le rapport complet. Vérifiez vos données et réessayez.',
        [{ text: 'OK' }]
      );
    } finally {
      setExportingPDF(false);
    }
  }, [projetActif, calculatedIndicators, recommandations, chargesFixes, depensesPonctuelles, revenus, gestations, sevrages, animaux, peseesParAnimal]);

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Indicateurs de Performance</Text>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: colors.success }]}
            onPress={handleExportPDF}
            disabled={exportingPDF}
            activeOpacity={0.7}
          >
            {exportingPDF ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.exportButtonText}>📄 Rapport Complet</Text>
            )}
          </TouchableOpacity>
        </View>

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
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Porcs vendus:</Text>
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
    paddingBottom: 100, // Espace pour la barre de navigation
  },
  content: {
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    flex: 1,
  },
  exportButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
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

