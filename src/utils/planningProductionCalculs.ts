/**
 * Algorithmes de calcul pour le Planning Production
 * Moteur de simulation et de recommandations
 */

import {
  SimulationProductionInput,
  SimulationProductionResultat,
  RecommandationStrategique,
  PrevisionVenteAnimal,
  PrevisionVentesInput,
  CalendrierVentes,
  SynthesePrevisionVentes,
  CONSTANTES_PRODUCTION as CONST,
} from '../types/planningProduction';
import { ProductionAnimal, ProductionPesee } from '../types/production';
import { addDays, addMonths, differenceInDays, format } from 'date-fns';
import { getCategorieAnimal } from './animalUtils';

// ============================================
// SIMULATION DE PRODUCTION
// ============================================

/**
 * Simuler la production necessaire pour atteindre un objectif
 */
export function simulerProduction(
  input: SimulationProductionInput,
  truiesDisponibles: number,
  truiesEnGestation: number,
  truiesEnLactation: number,
  verratsDisponibles: number
): SimulationProductionResultat {
  console.log('🧮 [CALCUL] simulerProduction - Début');
  console.log('📥 Input:', input);
  console.log('🐷 Truies:', {
    disponibles: truiesDisponibles,
    gestation: truiesEnGestation,
    lactation: truiesEnLactation,
  });
  console.log('🐗 Verrats:', verratsDisponibles);

  const { objectif_tonnes, periode_mois, poids_moyen_vente, porcelets_par_portee_moyen } = input;

  const poids_moyen_vente_kg = poids_moyen_vente || CONST.POIDS_MOYEN_VENTE_KG;
  const duree_mois = periode_mois;

  console.log('✅ Paramètres extraits:', {
    objectif_tonnes,
    periode_mois,
    poids_moyen_vente_kg,
    porcelets_par_portee_moyen,
    duree_mois,
  });

  // Utiliser le paramètre fourni ou la constante par défaut
  const PORCELETS_PAR_PORTEE = porcelets_par_portee_moyen ?? CONST.PORCELETS_PAR_PORTEE_MOYEN;

  // Kg à produire
  const objectif_kg = objectif_tonnes * 1000;

  // Nombre de porcs à vendre (brut, avant mortalité)
  const nombre_porcs_necessaires = Math.ceil(objectif_kg / poids_moyen_vente_kg);

  // 🔄 LOGIQUE TEMPORELLE RÉTROGRADE
  // Le DERNIER porc doit atteindre le poids cible À LA DATE LIMITE (fin de période)
  // On doit donc planifier les naissances de manière échelonnée

  // GMQ réaliste (avec coefficient pessimiste terrain)
  const GMQ_REALISTE = CONST.GMQ_MOYEN_G_JOUR * (CONST.COEFFICIENT_PESSIMISTE_GMQ || 0.85);

  // Durée d'engraissement nécessaire pour atteindre le poids cible (en jours)
  // poids_a_gagner = poids_cible - poids_au_sevrage (environ 8-10 kg)
  const POIDS_AU_SEVRAGE_KG = 8; // Poids typique au sevrage
  const poids_a_gagner_kg = poids_moyen_vente_kg - POIDS_AU_SEVRAGE_KG;
  const poids_a_gagner_g = poids_a_gagner_kg * 1000;
  const duree_engraissement_jours = Math.ceil(poids_a_gagner_g / GMQ_REALISTE);

  // Durée totale du cycle (de la saillie à la vente)
  const duree_cycle_complet_jours =
    CONST.DUREE_GESTATION_JOURS + CONST.DUREE_LACTATION_JOURS + duree_engraissement_jours;

  console.log('⏱️ [CALCUL] Durées temporelles:', {
    GMQ_theorique: CONST.GMQ_MOYEN_G_JOUR,
    coefficient_pessimiste: CONST.COEFFICIENT_PESSIMISTE_GMQ,
    GMQ_realiste: GMQ_REALISTE,
    poids_a_gagner_kg,
    duree_engraissement_jours,
    duree_cycle_complet_jours,
    periode_disponible_jours: duree_mois * 30,
  });

  // Nombre de portées nécessaires (ajusté avec mortalité)
  const nombre_portees_necessaires_brut = Math.ceil(
    nombre_porcs_necessaires / PORCELETS_PAR_PORTEE
  );

  // Ajustement avec le taux de survie
  const TAUX_SURVIE_GLOBAL = CONST.TAUX_SURVIE_MOYEN || 0.85;
  const nombre_portees_necessaires = Math.ceil(
    nombre_portees_necessaires_brut / TAUX_SURVIE_GLOBAL
  );

  // 🎯 CALCUL DES TRUIES NÉCESSAIRES avec planification rétrograde

  // La période disponible en jours
  const periode_disponible_jours = duree_mois * 30;

  // ⚠️ CONTRAINTE CRITIQUE : Le dernier porc doit être vendable À la date limite
  // Donc la première saillie doit avoir lieu à : date_debut
  // Et la dernière saillie doit avoir lieu à : date_limite - duree_cycle_complet

  // Fenêtre de temps pour les saillies (en jours)
  const fenetre_saillies_jours = periode_disponible_jours - duree_cycle_complet_jours;

  if (fenetre_saillies_jours < 0) {
    console.warn(
      '⚠️ [CALCUL] Période trop courte! Le cycle complet dépasse la période disponible.'
    );
  }

  // Intervalle optimal entre chaque saillie pour répartir les portées
  const intervalle_entre_saillies_jours =
    fenetre_saillies_jours > 0
      ? fenetre_saillies_jours / Math.max(1, nombre_portees_necessaires - 1)
      : 0;

  // Cycles par truie par an (généralement 2.3 cycles/an)
  const cycles_par_truie_par_an = CONST.CYCLES_PAR_AN || 2.3;

  // Cycles possibles sur la durée demandée (pour une seule truie)
  const cycles_sur_duree = (duree_mois / 12) * cycles_par_truie_par_an;

  // Nombre de truies nécessaires
  // Si les portées sont trop rapprochées, il faut plus de truies en parallèle
  const nombre_truies_necessaires = Math.ceil(nombre_portees_necessaires / cycles_sur_duree);

  // Nombre de saillies par mois
  const nombre_saillies_par_mois = Math.ceil(nombre_portees_necessaires / duree_mois);

  console.log('📐 [CALCUL] Planification temporelle:', {
    portees_necessaires: nombre_portees_necessaires,
    periode_disponible_jours,
    duree_cycle_complet_jours,
    fenetre_saillies_jours,
    intervalle_entre_saillies_jours,
    cycles_par_truie_par_an,
    cycles_sur_duree,
    nombre_truies_necessaires,
    nombre_saillies_par_mois,
  });

  // Faisabilité
  const est_faisable = truiesDisponibles >= nombre_truies_necessaires && verratsDisponibles >= 1;

  // Recommandations
  const recommandations: RecommandationStrategique[] = [];

  if (!est_faisable) {
    if (truiesDisponibles < nombre_truies_necessaires) {
      recommandations.push({
        type: 'acquisition_animaux',
        priorite: 'haute',
        message: `Il manque ${nombre_truies_necessaires - truiesDisponibles} truie(s) reproductrice(s) pour atteindre l'objectif.`,
        impact_production: `Réduction de ${Math.round(
          ((nombre_truies_necessaires - truiesDisponibles) / nombre_truies_necessaires) * 100
        )}%`,
      });
    }
    if (verratsDisponibles < 1) {
      recommandations.push({
        type: 'acquisition_animaux',
        priorite: 'critique',
        message: 'Aucun verrat disponible. Achat ou location urgente nécessaire.',
        impact_production: 'Production impossible',
      });
    }
  }

  if (nombre_saillies_par_mois > truiesDisponibles) {
    recommandations.push({
      type: 'optimisation_cycles',
      priorite: 'moyenne',
      message: `Le rythme de ${nombre_saillies_par_mois} saillie(s)/mois nécessite une gestion optimale des cycles.`,
      impact_production: 'Risque de surcharge',
    });
  }

  return {
    objectif_tonnes,
    periode_mois: duree_mois,
    nombre_truies_necessaires,
    nombre_portees_necessaires,
    nombre_porcs_necessaires,
    nombre_saillies_par_mois,
    est_faisable,
    recommandations,
    details: {
      truies_disponibles: truiesDisponibles,
      truies_en_gestation: truiesEnGestation,
      truies_en_lactation: truiesEnLactation,
      verrats_disponibles: verratsDisponibles,
      porcelets_par_portee_moyen: PORCELETS_PAR_PORTEE,
      poids_moyen_vente_kg,
      taux_survie_prevu: CONST.TAUX_SURVIE_MOYEN * 100,
    },
  };
}

// ============================================
// GENERATION DU PLAN DE SAILLIES
// ============================================

/**
 * Generer les recommandations strategiques COMPLÈTES et ACTIONNABLES
 */
export function genererRecommandationsStrategiques(
  simulation: SimulationProductionResultat,
  truiesDisponibles: number
): RecommandationStrategique[] {
  const recommandations: RecommandationStrategique[] = [];

  const truiesNecessaires = simulation.nombre_truies_necessaires;
  const verratsDisponibles = simulation.details.verrats_disponibles;
  const porteesNecessaires = simulation.nombre_portees_necessaires;
  const porceletsTotaux = porteesNecessaires * simulation.details.porcelets_par_portee_moyen;
  const porceletsSurvivants = Math.floor(
    porceletsTotaux * (simulation.details.taux_survie_prevu / 100)
  );
  const ecartTruies = truiesNecessaires - truiesDisponibles;
  const tauxUtilisation = (truiesNecessaires / Math.max(1, truiesDisponibles)) * 100;

  // ========================================
  // 🎯 ÉVALUATION GLOBALE
  // ========================================

  if (simulation.est_faisable && tauxUtilisation <= 80) {
    recommandations.push({
      type: 'faisable',
      priorite: 'faible',
      titre: '✅ Objectif atteignable',
      message: `Votre cheptel actuel (${truiesDisponibles} truie(s)) est suffisant pour atteindre cet objectif.`,
      actions: [
        {
          action: 'Maintenir la production',
          description: `Planifier ${porteesNecessaires} portée(s) sur la période`,
        },
        {
          action: 'Suivi régulier',
          description: 'Surveiller le GMQ et la mortalité pour maintenir les prévisions',
        },
      ],
      impact_estime: {
        production_additionnelle: simulation.objectif_tonnes,
      },
    });
  }

  // ========================================
  // ⚠️ MANQUE DE TRUIES
  // ========================================

  if (ecartTruies > 0) {
    const coutAchatTruies = ecartTruies * CONST.COUT_TRUIE_REPRODUCTRICE;
    const delaiProductionMois = Math.ceil(ecartTruies * 2); // ~2 mois par truie à acheter

    recommandations.push({
      type: 'truies',
      priorite: ecartTruies >= 3 ? 'critique' : 'elevee',
      titre: `🐷 Acquisition de truies nécessaire`,
      message: `Il manque ${ecartTruies} truie(s) reproductrice(s) pour atteindre l'objectif de ${simulation.objectif_tonnes} tonnes.`,
      actions: [
        {
          action: `Acheter ${ecartTruies} truie(s) reproductrice(s)`,
          description: `Privilégier des truies de 6-8 mois, prêtes à être saillies`,
          cout_estime: coutAchatTruies,
          delai: `${delaiProductionMois} mois`,
        },
        {
          action: "Alternative: Réduire l'objectif",
          description: `Avec ${truiesDisponibles} truie(s), vous pouvez produire ~${((simulation.objectif_tonnes * truiesDisponibles) / truiesNecessaires).toFixed(1)} tonnes`,
        },
        {
          action: 'Alternative: Prolonger la période',
          description: `Étendre la période de ${simulation.periode_mois} à ${Math.ceil((simulation.periode_mois * truiesNecessaires) / truiesDisponibles)} mois`,
        },
      ],
      impact_estime: {
        cout_estime: coutAchatTruies,
        delai_mois: delaiProductionMois,
        production_additionnelle: (ecartTruies / truiesNecessaires) * simulation.objectif_tonnes,
      },
    });
  }

  // ========================================
  // 🐗 RATIO VERRATS/TRUIES
  // ========================================

  const ratioOptimal = CONST.RATIO_VERRAT_TRUIES;
  const verratsNecessaires = Math.ceil(truiesDisponibles / ratioOptimal);
  const ecartVerrats = verratsNecessaires - verratsDisponibles;

  if (verratsDisponibles === 0) {
    recommandations.push({
      type: 'verrats',
      priorite: 'critique',
      titre: '❌ URGENT : Aucun verrat disponible',
      message: 'Production impossible sans verrat. Achat ou location urgente nécessaire.',
      actions: [
        {
          action: 'Acheter 1 verrat reproducteur',
          description: 'Verrat de 8-12 mois, race adaptée à votre cheptel',
          cout_estime: CONST.COUT_VERRAT,
          delai: '1-2 mois',
        },
        {
          action: 'Location de verrat',
          description: 'Solution temporaire pendant 3-6 mois',
          cout_estime: CONST.COUT_VERRAT * 0.3,
          delai: 'Immédiat',
        },
        {
          action: 'Insémination artificielle',
          description: 'Solution technique avec formation requise',
        },
      ],
      impact_estime: {
        cout_estime: CONST.COUT_VERRAT,
        delai_mois: 2,
      },
    });
  } else if (ecartVerrats > 0 && truiesDisponibles >= 10) {
    recommandations.push({
      type: 'verrats',
      priorite: 'moyenne',
      titre: '🐗 Optimisation du ratio verrats/truies',
      message: `Ratio actuel : 1 verrat pour ${Math.floor(truiesDisponibles / verratsDisponibles)} truies. Ratio optimal : 1 pour ${ratioOptimal}.`,
      actions: [
        {
          action: `Ajouter ${ecartVerrats} verrat(s)`,
          description: 'Améliore la fertilité et réduit la charge de travail par verrat',
          cout_estime: ecartVerrats * CONST.COUT_VERRAT,
        },
        {
          action: 'Surveillance rapprochée',
          description: 'Suivre le taux de réussite des saillies avec le verrat actuel',
        },
      ],
      impact_estime: {
        cout_estime: ecartVerrats * CONST.COUT_VERRAT,
      },
    });
  }

  // ========================================
  // 💰 ALTERNATIVE : ENGRAISSEMENT AVEC ACHAT DE PORCELETS
  // ========================================

  if (ecartTruies > 2 || !simulation.est_faisable) {
    const porceletsAacheter = simulation.nombre_porcs_necessaires;
    const COUT_PORCELET = 15000; // F CFA (prix moyen d'un porcelet de 8-10kg)
    const coutAchatPorcelets = porceletsAacheter * COUT_PORCELET;
    const economieVsReproduction =
      ecartTruies * CONST.COUT_TRUIE_REPRODUCTRICE - coutAchatPorcelets;

    recommandations.push({
      type: 'optimisation',
      priorite: economieVsReproduction > 0 ? 'elevee' : 'moyenne',
      titre: '🔄 Alternative : Engraissement pur (achat de porcelets)',
      message: `Au lieu d'investir dans la reproduction, concentrez-vous sur l'engraissement.`,
      actions: [
        {
          action: `Acheter ${porceletsAacheter} porcelet(s) de 8-10kg`,
          description: "Acheter des porcelets sevrés et les engraisser jusqu'au poids de vente",
          cout_estime: coutAchatPorcelets,
          delai: '5-6 mois (engraissement uniquement)',
        },
        {
          action: 'Avantages de cette approche',
          description: `• Délai plus court (pas de gestation/lactation)\n• Investissement initial réduit ${economieVsReproduction > 0 ? '(économie de ' + Math.floor(economieVsReproduction / 1000) + 'k F)' : ''}\n• Flexibilité : ajuster les quantités selon le marché\n• Moins de risques (pas de reproduction)`,
        },
        {
          action: 'Inconvénients',
          description: `• Dépendance aux fournisseurs de porcelets\n• Coût récurrent à chaque cycle\n• Pas de contrôle sur la génétique`,
        },
      ],
      impact_estime: {
        cout_estime: coutAchatPorcelets,
        delai_mois: 6,
        production_additionnelle: simulation.objectif_tonnes,
      },
    });
  }

  // ========================================
  // 📊 TAUX D'UTILISATION ÉLEVÉ
  // ========================================

  if (tauxUtilisation > 90 && tauxUtilisation <= 100) {
    recommandations.push({
      type: 'alerte',
      priorite: 'elevee',
      titre: "⚠️ Taux d'utilisation critique",
      message: `Vos truies seront utilisées à ${tauxUtilisation.toFixed(0)}% de leur capacité. Risque élevé en cas de problème.`,
      actions: [
        {
          action: 'Ajouter 1-2 truies de sécurité',
          description: 'Prévoir des truies de remplacement en cas de maladie ou infertilité',
          cout_estime: 2 * CONST.COUT_TRUIE_REPRODUCTRICE,
        },
        {
          action: 'Stock de porcelets de secours',
          description: 'Avoir 10-15% de porcelets supplémentaires en engraissement',
        },
        {
          action: 'Améliorer le suivi sanitaire',
          description: 'Vaccination, vermifugation, suivi vétérinaire régulier',
        },
      ],
      impact_estime: {
        cout_estime: 2 * CONST.COUT_TRUIE_REPRODUCTRICE,
      },
    });
  }

  // ========================================
  // 📉 SOUS-UTILISATION DES RESSOURCES
  // ========================================

  if (tauxUtilisation < 50 && truiesDisponibles >= 3) {
    const productionMaxPossible = (
      (simulation.objectif_tonnes * truiesDisponibles) /
      truiesNecessaires
    ).toFixed(1);

    recommandations.push({
      type: 'optimisation',
      priorite: 'moyenne',
      titre: '💡 Sous-utilisation du cheptel',
      message: `Vos ${truiesDisponibles} truies ne seront utilisées qu'à ${tauxUtilisation.toFixed(0)}%. Vous pouvez produire jusqu'à ${productionMaxPossible} tonnes !`,
      actions: [
        {
          action: "Augmenter l'objectif de production",
          description: `Passer de ${simulation.objectif_tonnes} à ${productionMaxPossible} tonnes pour optimiser les ressources`,
        },
        {
          action: 'Diversifier les activités',
          description: `• Vente de porcelets sevrés (8-10kg)\n• Production de reproducteurs pour d'autres fermes\n• Transformation (saucisses, viande fumée)`,
        },
        {
          action: 'Réduire temporairement le cheptel',
          description: `Vendre ${Math.floor((truiesDisponibles - truiesNecessaires) * 0.7)} truie(s) excédentaire(s) pour réduire les coûts`,
          cout_estime: -(
            Math.floor((truiesDisponibles - truiesNecessaires) * 0.7) *
            CONST.COUT_TRUIE_REPRODUCTRICE *
            0.8
          ),
        },
      ],
    });
  }

  // ========================================
  // 🎯 RECOMMANDATIONS D'AMÉLIORATION CONTINUE
  // ========================================

  if (simulation.details.porcelets_par_portee_moyen < 10) {
    recommandations.push({
      type: 'optimisation',
      priorite: 'moyenne',
      titre: '🧬 Amélioration génétique recommandée',
      message: `Porcelets par portée : ${simulation.details.porcelets_par_portee_moyen}. Les races performantes atteignent 12-14 porcelets.`,
      actions: [
        {
          action: 'Améliorer la génétique',
          description: `• Acheter un verrat de race performante (Large White, Landrace)\n• Croiser avec des truies locales\n• Sélectionner les meilleures reproductrices`,
          cout_estime: CONST.COUT_VERRAT * 1.5,
        },
        {
          action: "Améliorer l'alimentation",
          description: 'Une truie bien nourrie produit plus de porcelets viables',
        },
      ],
    });
  }

  console.log(`📋 [RECOMMANDATIONS] ${recommandations.length} recommandations générées`);

  return recommandations;
}

// ============================================
// AIDE A LA PLANIFICATION
// ============================================

/**
 * Calculer le calendrier optimal des saillies
 */
export function calculerCalendrierSaillies(
  dateDebut: Date,
  nombreSaillies: number,
  intervalleJours: number = 30
): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < nombreSaillies; i++) {
    dates.push(addDays(dateDebut, i * intervalleJours));
  }
  return dates;
}

/**
 * Estimer la date de mise bas
 */
export function estimerDateMiseBas(dateSaillie: Date): Date {
  return addDays(dateSaillie, CONST.DUREE_GESTATION_JOURS);
}

/**
 * Estimer la date de sevrage
 */
export function estimerDateSevrage(dateMiseBas: Date): Date {
  return addDays(dateMiseBas, CONST.DUREE_LACTATION_JOURS);
}

// ============================================
// KPIs ET INDICATEURS
// ============================================

/**
 * Calculer le taux de reussite d'une simulation
 */
export function calculerTauxReussite(productionReelle: number, objectif: number): number {
  if (objectif === 0) return 0;
  return Math.min(100, (productionReelle / objectif) * 100);
}

/**
 * Calculer le delai moyen jusqu'a la vente
 */
export function calculerDelaiMoyenVente(
  dateSaillie: Date,
  dureeEngraissement: number = CONST.DUREE_ENGRAISSEMENT_STANDARD_JOURS
): Date {
  const dateMiseBas = estimerDateMiseBas(dateSaillie);
  const dateSevrage = estimerDateSevrage(dateMiseBas);
  return addDays(dateSevrage, dureeEngraissement);
}

// ============================================
// PREVISIONS DE VENTES (MODE 1 : CHEPTEL ACTUEL)
// ============================================

/**
 * Calculer les previsions de ventes basees sur le cheptel actuel
 * Mode 1 : GMQ adaptatif par pesee
 */
export function calculerPrevisionVentes(
  animaux: ProductionAnimal[],
  peseesParAnimal: { [animalId: string]: ProductionPesee[] },
  input: PrevisionVentesInput
): SynthesePrevisionVentes {
  const { poids_cible_kg, gmq_moyen, marge_jours = 7 } = input;
  const previsions: PrevisionVenteAnimal[] = [];
  const maintenant = new Date();

  // Pour chaque animal actif
  animaux
    .filter((a) => a.statut?.toLowerCase() === 'actif')
    .forEach((animal) => {
      const pesees = peseesParAnimal[animal.id] || [];

      if (pesees.length === 0) return;

      const peseesTriees = [...pesees].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const dernierePesee = peseesTriees[0];
      const poids_actuel = dernierePesee.poids_kg;

      if (poids_actuel >= poids_cible_kg) {
        previsions.push({
          animal_id: animal.id,
          animal_code: animal.code,
          animal_nom: animal.nom || animal.code,
          poids_actuel,
          poids_cible: poids_cible_kg,
          poids_a_gagner: 0,
          gmq_historique: dernierePesee.gmq || gmq_moyen,
          gmq_utilise: gmq_moyen,
          date_derniere_pesee: dernierePesee.date,
          jours_restants: 0,
          date_vente_prevue: maintenant.toISOString(),
          pret_pour_vente: true,
          priorite: 'urgente',
          categorie: getCategorieAnimal(animal),
        });
        return;
      }

      // 🔄 APPLIQUER LE COEFFICIENT PESSIMISTE GMQ (réalité terrain)
      const gmq_historique =
        dernierePesee.gmq && dernierePesee.gmq > 0 ? dernierePesee.gmq : gmq_moyen;

      // GMQ réaliste avec coefficient pessimiste
      const COEFFICIENT_PESSIMISTE = CONST.COEFFICIENT_PESSIMISTE_GMQ || 0.85;
      const gmq_utilise = gmq_historique * COEFFICIENT_PESSIMISTE;

      const poids_a_gagner = poids_cible_kg - poids_actuel;
      const jours_restants = Math.ceil((poids_a_gagner * 1000) / gmq_utilise);

      console.log(
        `🐷 [PRÉVISION] ${animal.code}: GMQ=${gmq_historique}g → ${gmq_utilise.toFixed(0)}g (×${COEFFICIENT_PESSIMISTE}), jours=${jours_restants}`
      );

      const date_vente_prevue = addDays(new Date(dernierePesee.date), jours_restants);
      const date_vente_min = addDays(date_vente_prevue, -marge_jours);
      const date_vente_max = addDays(date_vente_prevue, marge_jours);

      let priorite: 'urgente' | 'haute' | 'normale' | 'basse' = 'normale';
      if (jours_restants <= 7) priorite = 'urgente';
      else if (jours_restants <= 14) priorite = 'haute';
      else if (jours_restants > 60) priorite = 'basse';

      previsions.push({
        animal_id: animal.id,
        animal_code: animal.code,
        animal_nom: animal.nom || animal.code,
        poids_actuel,
        poids_cible: poids_cible_kg,
        poids_a_gagner,
        gmq_historique: gmq_historique,
        gmq_utilise,
        date_derniere_pesee: dernierePesee.date,
        jours_restants,
        date_vente_prevue: date_vente_prevue.toISOString(),
        date_vente_min: date_vente_min.toISOString(),
        date_vente_max: date_vente_max.toISOString(),
        pret_pour_vente: false,
        priorite,
        prix_estime: poids_cible_kg * CONST.PRIX_VENTE_KG_MOYEN,
        categorie: getCategorieAnimal(animal),
      });
    });

  const total_animaux = previsions.length;
  const total_poids_kg = previsions.reduce((sum, p) => sum + p.poids_cible, 0);
  const total_prix_estime = previsions.reduce((sum, p) => sum + (p.prix_estime || 0), 0);

  const par_categorie: any = {};
  previsions.forEach((p) => {
    if (!par_categorie[p.categorie]) {
      par_categorie[p.categorie] = { nombre: 0, poids_total: 0, prix_total: 0 };
    }
    par_categorie[p.categorie].nombre++;
    par_categorie[p.categorie].poids_total += p.poids_cible;
    par_categorie[p.categorie].prix_total += p.prix_estime || 0;
  });

  const calendrier_mensuel = creerCalendrierVentes(previsions, 'mensuel');

  return {
    periode_debut: maintenant.toISOString(),
    periode_fin: addMonths(maintenant, 12).toISOString(),
    total_animaux,
    total_poids_kg,
    total_prix_estime,
    par_categorie,
    calendrier_mensuel,
  };
}

// ============================================
// MODE 2 : PROJECTION FUTURE
// ============================================

/**
 * Calculer les prévisions de ventes basées sur la simulation et les saillies planifiées
 * Mode 2 : Projection future sur 12-24 mois
 */
export function calculerPrevisionsFutures(
  sailliesPlanifiees: any[],
  parametres: {
    porcelets_par_portee: number;
    taux_survie_sevrage: number; // %
    duree_engraissement_jours: number;
    poids_cible_kg: number;
    prix_vente_kg: number;
  }
): SynthesePrevisionVentes {
  const previsions: PrevisionVenteAnimal[] = [];
  const maintenant = new Date();

  // Constantes par défaut avec coefficient pessimiste
  const PORCELETS_PAR_PORTEE = parametres.porcelets_par_portee || CONST.PORCELETS_PAR_PORTEE_MOYEN;
  const TAUX_SURVIE = (parametres.taux_survie_sevrage || 90) / 100;
  const POIDS_CIBLE = parametres.poids_cible_kg || CONST.POIDS_MOYEN_VENTE_KG;
  const PRIX_KG = parametres.prix_vente_kg || CONST.PRIX_VENTE_KG_MOYEN;

  // 🔄 GMQ RÉALISTE avec coefficient pessimiste terrain
  const GMQ_THEORIQUE = CONST.GMQ_MOYEN_G_JOUR;
  const COEFFICIENT_PESSIMISTE = CONST.COEFFICIENT_PESSIMISTE_GMQ || 0.85;
  const GMQ_REALISTE = GMQ_THEORIQUE * COEFFICIENT_PESSIMISTE;

  // Durée d'engraissement recalculée avec GMQ réaliste
  const POIDS_AU_SEVRAGE_KG = 8;
  const poids_a_gagner_kg = POIDS_CIBLE - POIDS_AU_SEVRAGE_KG;
  const DUREE_ENGRAISSEMENT = Math.ceil((poids_a_gagner_kg * 1000) / GMQ_REALISTE);

  console.log('📊 [PRÉVISIONS FUTURES] Paramètres:', {
    GMQ_theorique: GMQ_THEORIQUE,
    coefficient_pessimiste: COEFFICIENT_PESSIMISTE,
    GMQ_realiste: GMQ_REALISTE,
    duree_engraissement_jours: DUREE_ENGRAISSEMENT,
  });

  // Filtrer les saillies planifiées ou effectuées (exclure annulées)
  const sailliesActives = sailliesPlanifiees.filter(
    (s) => s.statut === 'planifiee' || s.statut === 'effectuee'
  );

  sailliesActives.forEach((saillie, index) => {
    // Date de sevrage (21 jours après mise bas)
    const dateSevrage = new Date(saillie.date_sevrage_prevue);

    // Date de vente = sevrage + engraissement
    const dateVente = addDays(dateSevrage, DUREE_ENGRAISSEMENT);

    // Nombre de porcelets survivants
    const porceletsVendables = Math.floor(PORCELETS_PAR_PORTEE * TAUX_SURVIE);

    // Jours restants jusqu'à la vente
    const joursRestants = differenceInDays(dateVente, maintenant);

    // Créer une prévision pour chaque porcelet de la portée
    for (let i = 0; i < porceletsVendables; i++) {
      const animalId = `future_${saillie.id}_${i}`;

      let priorite: 'urgente' | 'haute' | 'normale' | 'basse' = 'normale';
      if (joursRestants <= 7) priorite = 'urgente';
      else if (joursRestants <= 30) priorite = 'haute';
      else if (joursRestants > 180) priorite = 'basse';

      previsions.push({
        animal_id: animalId,
        animal_code: `Portée ${format(new Date(saillie.date_mise_bas_prevue), 'MM/yyyy')} #${i + 1}`,
        animal_nom: `Porcelet ${i + 1} (Saillie ${format(new Date(saillie.date_saillie_prevue), 'dd/MM/yy')})`,
        poids_actuel: 0, // Animal futur
        poids_cible: POIDS_CIBLE,
        poids_a_gagner: POIDS_CIBLE,
        gmq_historique: GMQ_THEORIQUE,
        gmq_utilise: GMQ_REALISTE,
        date_derniere_pesee: dateSevrage.toISOString(),
        jours_restants: Math.max(0, joursRestants),
        date_vente_prevue: dateVente.toISOString(),
        date_vente_min: addDays(dateVente, -7).toISOString(),
        date_vente_max: addDays(dateVente, 7).toISOString(),
        pret_pour_vente: joursRestants <= 0,
        priorite,
        prix_estime: POIDS_CIBLE * PRIX_KG,
        categorie: 'porcelet',
      });
    }
  });

  // Trier par date de vente
  previsions.sort(
    (a, b) => new Date(a.date_vente_prevue).getTime() - new Date(b.date_vente_prevue).getTime()
  );

  // Calculer les totaux
  const total_animaux = previsions.length;
  const total_poids_kg = previsions.reduce((sum, p) => sum + p.poids_cible, 0);
  const total_prix_estime = previsions.reduce((sum, p) => sum + (p.prix_estime || 0), 0);

  const par_categorie: any = {};
  previsions.forEach((p) => {
    if (!par_categorie[p.categorie]) {
      par_categorie[p.categorie] = { nombre: 0, poids_total: 0, prix_total: 0 };
    }
    par_categorie[p.categorie].nombre++;
    par_categorie[p.categorie].poids_total += p.poids_cible;
    par_categorie[p.categorie].prix_total += p.prix_estime || 0;
  });

  const calendrier_mensuel = creerCalendrierVentes(previsions, 'mensuel');

  // Période de projection : du premier au dernier sevrage + engraissement
  const dateDebut = maintenant;
  const dateFin =
    previsions.length > 0
      ? new Date(previsions[previsions.length - 1].date_vente_prevue)
      : addMonths(maintenant, 12);

  return {
    periode_debut: dateDebut.toISOString(),
    periode_fin: dateFin.toISOString(),
    total_animaux,
    total_poids_kg,
    total_prix_estime,
    par_categorie,
    calendrier_mensuel,
  };
}

/**
 * Creer un calendrier de ventes
 */
function creerCalendrierVentes(
  previsions: PrevisionVenteAnimal[],
  type: 'mensuel' | 'hebdomadaire'
): CalendrierVentes[] {
  const calendrier: { [key: string]: CalendrierVentes } = {};

  previsions.forEach((prevision) => {
    const date = new Date(prevision.date_vente_prevue);
    let cle: string;

    if (type === 'mensuel') {
      cle = format(date, 'yyyy-MM');
    } else {
      const numSemaine =
        Math.floor(differenceInDays(date, new Date(date.getFullYear(), 0, 1)) / 7) + 1;
      cle = `${date.getFullYear()}-S${numSemaine}`;
    }

    if (!calendrier[cle]) {
      calendrier[cle] = {
        [type === 'mensuel' ? 'mois' : 'semaine']: cle,
        nombre_animaux: 0,
        poids_total_kg: 0,
        prix_total_estime: 0,
        animaux: [],
      };
    }

    calendrier[cle].nombre_animaux++;
    calendrier[cle].poids_total_kg += prevision.poids_cible;
    calendrier[cle].prix_total_estime! += prevision.prix_estime || 0;
    calendrier[cle].animaux.push(prevision);
  });

  return Object.values(calendrier).sort((a, b) => {
    const cleA = a.mois || a.semaine || '';
    const cleB = b.mois || b.semaine || '';
    return cleA.localeCompare(cleB);
  });
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Formater un montant en FCFA
 */
export function formaterMontant(montant: number): string {
  return (
    new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant) + ' F CFA'
  );
}

/**
 * Formater une duree en mois/jours
 */
export function formaterDuree(jours: number): string {
  if (jours < 30) return `${jours} jour${jours > 1 ? 's' : ''}`;
  const mois = Math.floor(jours / 30);
  const joursRestants = jours % 30;
  if (joursRestants === 0) return `${mois} mois`;
  return `${mois} mois ${joursRestants}j`;
}

// ============================================
// GÉNÉRATION DE TÂCHES DEPUIS SAILLIES
// ============================================

export interface TacheGeneree {
  type: 'saillie' | 'vaccination' | 'veterinaire' | 'sevrage' | 'autre';
  titre: string;
  description: string;
  date_prevue: string;
  date_echeance?: string;
  rappel?: string;
  notes?: string;
}

/**
 * Générer automatiquement les tâches depuis une saillie planifiée
 * - Saillie (J-0)
 * - Visite vétérinaire post-saillie (J+7)
 * - Contrôle gestation (J+30)
 * - Vaccination pré-mise bas (J+100)
 * - Préparation mise bas (J+110)
 * - Mise bas attendue (J+114)
 * - Visite vétérinaire post-mise bas (J+116)
 * - Sevrage (J+135)
 * - Vaccination porcelets (J+145)
 * - Vente prévue (J+135 + engraissement)
 */
export function genererTachesDepuisSaillie(
  saillie: any,
  truieNom?: string,
  verratNom?: string
): TacheGeneree[] {
  const taches: TacheGeneree[] = [];

  const dateSaillie = new Date(saillie.date_saillie_prevue);
  const dateMiseBas = new Date(saillie.date_mise_bas_prevue);
  const dateSevrage = new Date(saillie.date_sevrage_prevue);
  const dateVente = saillie.date_vente_prevue
    ? new Date(saillie.date_vente_prevue)
    : addDays(dateSevrage, CONST.DUREE_ENGRAISSEMENT_STANDARD_JOURS);

  const truieInfo = truieNom ? ` - Truie: ${truieNom}` : '';
  const verratInfo = verratNom ? ` - Verrat: ${verratNom}` : '';
  const infos = `${truieInfo}${verratInfo}`;

  // 1️⃣ SAILLIE (J-0)
  taches.push({
    type: 'saillie',
    titre: `🐗 Saillie${infos}`,
    description: `Saillie planifiée${infos}\n\n📅 Dates prévisionnelles:\n• Mise bas attendue: ${format(dateMiseBas, 'dd/MM/yyyy')} (J+114)\n• Sevrage prévu: ${format(dateSevrage, 'dd/MM/yyyy')} (J+135)\n• Vente estimée: ${format(dateVente, 'dd/MM/yyyy')}`,
    date_prevue: saillie.date_saillie_prevue,
    date_echeance: saillie.date_saillie_prevue,
    rappel: addDays(dateSaillie, -1).toISOString(),
    notes: `Saillie planifiée par le module Planning Production\nRéférence: ${saillie.id}`,
  });

  // 2️⃣ VISITE VÉTÉRINAIRE POST-SAILLIE (J+7)
  taches.push({
    type: 'veterinaire',
    titre: `🩺 Contrôle post-saillie${truieInfo}`,
    description: `Visite vétérinaire de contrôle 7 jours après la saillie${truieInfo}\n\n✅ Points à vérifier:\n• État général de la truie\n• Signes de gestation précoce\n• Absence de retour en chaleur`,
    date_prevue: addDays(dateSaillie, 7).toISOString(),
    rappel: addDays(dateSaillie, 6).toISOString(),
  });

  // 3️⃣ CONTRÔLE GESTATION (J+30)
  taches.push({
    type: 'veterinaire',
    titre: `🔍 Contrôle gestation${truieInfo}`,
    description: `Confirmation de la gestation par échographie ou palpation${truieInfo}\n\n📋 Actions:\n• Échographie de confirmation\n• Évaluation du nombre de fœtus\n• Ajustement de l'alimentation`,
    date_prevue: addDays(dateSaillie, 30).toISOString(),
    rappel: addDays(dateSaillie, 28).toISOString(),
  });

  // 4️⃣ VACCINATION PRÉ-MISE BAS (J+100)
  taches.push({
    type: 'vaccination',
    titre: `💉 Vaccination pré-mise bas${truieInfo}`,
    description: `Vaccination de la truie avant la mise bas${truieInfo}\n\n💉 Vaccins recommandés:\n• Colibacillose (E. coli)\n• Rotavirus\n• Selon le protocole sanitaire`,
    date_prevue: addDays(dateSaillie, 100).toISOString(),
    date_echeance: addDays(dateSaillie, 105).toISOString(),
    rappel: addDays(dateSaillie, 98).toISOString(),
  });

  // 5️⃣ PRÉPARATION MISE BAS (J+110)
  taches.push({
    type: 'autre',
    titre: `🏠 Préparation loge de mise bas${truieInfo}`,
    description: `Préparer la loge de maternité pour la mise bas${truieInfo}\n\n✅ Checklist:\n• Nettoyer et désinfecter la loge\n• Installer la lampe chauffante\n• Préparer la litière\n• Vérifier l'eau et l'alimentation\n• Préparer le matériel (désinfectant, fil dentaire, ciseaux)`,
    date_prevue: addDays(dateSaillie, 110).toISOString(),
    date_echeance: addDays(dateSaillie, 113).toISOString(),
    rappel: addDays(dateSaillie, 109).toISOString(),
  });

  // 6️⃣ MISE BAS ATTENDUE (J+114)
  taches.push({
    type: 'autre',
    titre: `🐷 Mise bas attendue${truieInfo}`,
    description: `Date attendue de la mise bas${truieInfo}\n\n⚠️ Surveillance rapprochée 3 jours avant et après\n\n🚨 Signes de mise bas imminente:\n• Agitation\n• Comportement de nidification\n• Baisse de température\n• Production de lait\n\n📞 Avoir le vétérinaire en alerte`,
    date_prevue: saillie.date_mise_bas_prevue,
    date_echeance: addDays(dateMiseBas, 2).toISOString(),
    rappel: addDays(dateMiseBas, -1).toISOString(),
  });

  // 7️⃣ VISITE VÉTÉRINAIRE POST-MISE BAS (J+116)
  taches.push({
    type: 'veterinaire',
    titre: `🩺 Contrôle post-mise bas${truieInfo}`,
    description: `Visite vétérinaire après la mise bas${truieInfo}\n\n✅ Points à vérifier:\n• État de la truie (métrite, fièvre)\n• Qualité du lait\n• État des porcelets\n• Traitement antibiotique si nécessaire`,
    date_prevue: addDays(dateMiseBas, 2).toISOString(),
    rappel: addDays(dateMiseBas, 1).toISOString(),
  });

  // 8️⃣ SEVRAGE (J+135 = J+114 + 21)
  taches.push({
    type: 'sevrage',
    titre: `🥛 Sevrage des porcelets${truieInfo}`,
    description: `Sevrage de la portée${truieInfo}\n\n📋 Actions:\n• Séparer les porcelets de la mère\n• Peser les porcelets\n• Vaccination des porcelets\n• Démarrage alimentation solide\n• Transfert en post-sevrage`,
    date_prevue: saillie.date_sevrage_prevue,
    date_echeance: addDays(dateSevrage, 1).toISOString(),
    rappel: addDays(dateSevrage, -2).toISOString(),
  });

  // 9️⃣ VACCINATION PORCELETS (J+145)
  taches.push({
    type: 'vaccination',
    titre: `💉 Vaccination porcelets (10j post-sevrage)`,
    description: `Vaccination des porcelets 10 jours après le sevrage\n\n💉 Vaccins:\n• Rouget\n• Mycoplasme\n• Selon protocole sanitaire\n\n📊 Évaluation:\n• Peser les porcelets\n• Identifier les sujets faibles`,
    date_prevue: addDays(dateSevrage, 10).toISOString(),
    date_echeance: addDays(dateSevrage, 12).toISOString(),
    rappel: addDays(dateSevrage, 9).toISOString(),
  });

  // 🔟 VENTE PRÉVUE
  if (saillie.date_vente_prevue) {
    taches.push({
      type: 'autre',
      titre: `💰 Vente prévue de la portée`,
      description: `Vente estimée des porcs de cette portée\n\n📊 Préparation:\n• Commencer à chercher des acheteurs 2 semaines avant\n• Peser les animaux\n• Évaluer le poids moyen\n• Calculer le prix de vente\n\n🎯 Poids cible: ${CONST.POIDS_MOYEN_VENTE_KG}kg`,
      date_prevue: saillie.date_vente_prevue,
      rappel: addDays(dateVente, -14).toISOString(),
      notes: 'Vente estimée - Date flexible selon le poids atteint',
    });
  }

  console.log(`📋 [TÂCHES] ${taches.length} tâches générées pour la saillie ${saillie.id}`);

  return taches;
}
