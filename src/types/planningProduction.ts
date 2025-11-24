/**
 * Types pour le module Planning Production
 */

// ============================================
// OBJECTIF DE PRODUCTION
// ============================================

export interface ObjectifProduction {
  objectif_tonnes: number;
  periode_mois: number;
  date_debut: string; // ISO date
  date_fin: string; // ISO date
}

// ============================================
// PARAMETRES DE PRODUCTION
// ============================================

export interface ParametresProduction {
  poids_moyen_vente_kg: number;
  gmq_moyen_g_jour: number;
  duree_gestation_jours: number;
  duree_lactation_jours: number;
  duree_engraissement_jours: number;
  porcelets_par_portee_moyen: number;
  taux_survie_sevrage: number;
  taux_survie_engraissement: number;
  cycles_par_an: number;
  ratio_verrat_truies: number;
}

export const PARAMETRES_PRODUCTION_DEFAUT: ParametresProduction = {
  poids_moyen_vente_kg: 110,
  gmq_moyen_g_jour: 700,
  duree_gestation_jours: 114,
  duree_lactation_jours: 21,
  duree_engraissement_jours: 180,
  porcelets_par_portee_moyen: 12,
  taux_survie_sevrage: 0.9, // 90%
  taux_survie_engraissement: 0.95, // 95%
  cycles_par_an: 2.3,
  ratio_verrat_truies: 20, // 1 verrat pour 20 truies
};

// ============================================
// CONSTANTES DE PRODUCTION
// ============================================

export const CONSTANTES_PRODUCTION = {
  PORCELETS_PAR_PORTEE_MOYEN: 12,
  TAUX_SURVIE_SEVRAGE: 0.9,
  TAUX_SURVIE_MOYEN: 0.85, // Taux de survie global (sevrage + engraissement)
  CYCLES_PAR_AN: 2.3,
  DUREE_GESTATION_JOURS: 114,
  DUREE_LACTATION_JOURS: 21,
  DUREE_ENGRAISSEMENT_STANDARD_JOURS: 180,
  POIDS_MOYEN_VENTE_KG: 110,
  GMQ_MOYEN_G_JOUR: 700,
  COEFFICIENT_PESSIMISTE_GMQ: 0.85, // Coefficient réalité terrain (85% du GMQ théorique)
  RATIO_VERRAT_TRUIES: 20,
  COUT_TRUIE_REPRODUCTRICE: 150000, // F CFA
  COUT_VERRAT: 200000, // F CFA
  DELAI_ACHAT_TRUIE_MOIS: 2,
  DELAI_ACHAT_VERRAT_MOIS: 2,
  PRIX_VENTE_KG_MOYEN: 1500, // F CFA/kg
};

// ============================================
// SIMULATION
// ============================================

export interface SimulationProductionInput {
  objectif_tonnes: number;
  periode_mois: number;
  poids_moyen_vente: number;
  porcelets_par_portee_moyen?: number; // Optionnel, utilise la constante par défaut si non fourni
}

export interface SimulationProductionResultat {
  objectif_tonnes: number;
  periode_mois: number;
  nombre_porcs_necessaires: number;
  nombre_portees_necessaires: number;
  nombre_truies_necessaires: number;
  nombre_saillies_par_mois: number;
  truies_disponibles: number;
  truies_en_gestation: number;
  truies_en_lactation: number;
  verrats_disponibles: number;
  est_faisable: boolean;
  ecart_truies: number;
  taux_utilisation: number;
  details: {
    porcelets_par_portee_moyen: number;
    taux_survie: number;
    cycles_par_truie_par_an: number;
    duree_gestation_jours: number;
    duree_lactation_jours: number;
  };
}

// ============================================
// RECOMMANDATIONS
// ============================================

export type TypeRecommandation = 'faisable' | 'alerte' | 'truies' | 'verrats' | 'optimisation';

export type PrioriteRecommandation = 'faible' | 'moyenne' | 'elevee' | 'critique';

export interface ActionRecommandee {
  action: string;
  description: string;
  cout_estime?: number;
  delai?: string;
}

export interface ImpactEstime {
  cout_estime?: number;
  delai_mois?: number;
  production_additionnelle?: number;
}

export interface RecommandationStrategique {
  type: TypeRecommandation;
  priorite: PrioriteRecommandation;
  titre: string;
  message: string;
  actions: ActionRecommandee[];
  impact_estime?: ImpactEstime;
}

// ============================================
// SAILLIES PLANIFIEES
// ============================================

export interface SailliePlanifiee {
  id: string;
  projet_id: string;
  date_saillie_prevue: string; // ISO date
  date_mise_bas_prevue: string; // ISO date
  date_sevrage_prevue: string; // ISO date
  date_vente_prevue?: string; // ISO date (fin engraissement)
  truie_id?: string;
  verrat_id?: string;
  statut: 'planifiee' | 'effectuee' | 'annulee';
  validee?: boolean; // true si les tâches ont été créées dans le planning
  taches_creees?: string[]; // IDs des tâches créées dans le planning
  notes?: string;
  date_creation: string;
  derniere_modification: string;
}

export const STATUT_SAILLIE_LABELS: Record<SailliePlanifiee['statut'], string> = {
  planifiee: 'Planifiee',
  effectuee: 'Effectuee',
  annulee: 'Annulee',
};

// ============================================
// PREVISIONS DE VENTES
// ============================================

export interface PrevisionVenteAnimal {
  animal_id: string;
  animal_code: string;
  animal_nom: string;
  poids_actuel: number;
  poids_cible: number;
  poids_a_gagner: number;
  gmq_historique: number;
  gmq_utilise: number;
  date_derniere_pesee: string;
  jours_restants: number;
  date_vente_prevue: string;
  date_vente_min?: string;
  date_vente_max?: string;
  pret_pour_vente: boolean;
  priorite: 'urgente' | 'haute' | 'normale' | 'basse';
  prix_estime?: number;
  categorie: 'porcelet' | 'porc_croissance' | 'truie' | 'verrat';
}

export interface PrevisionVentesInput {
  poids_cible_kg: number;
  gmq_moyen: number;
  marge_jours?: number;
}

export interface CalendrierVentes {
  mois?: string;
  semaine?: string;
  nombre_animaux: number;
  poids_total_kg: number;
  prix_total_estime?: number;
  animaux: PrevisionVenteAnimal[];
}

export interface SynthesePrevisionVentes {
  periode_debut: string;
  periode_fin: string;
  total_animaux: number;
  total_poids_kg: number;
  total_prix_estime: number;
  par_categorie: {
    [categorie: string]: {
      nombre: number;
      poids_total: number;
      prix_total: number;
    };
  };
  calendrier_mensuel: CalendrierVentes[];
}

// ============================================
// ALERTES
// ============================================

export interface AlertePlanningProduction {
  type: string;
  message: string;
  gravite: 'critique' | 'elevee' | 'moyenne' | 'faible';
}

// ============================================
// ETAT REDUX
// ============================================

export interface PlanningProductionState {
  objectifProduction: ObjectifProduction | null;
  parametresProduction: ParametresProduction;
  simulationResultat: SimulationProductionResultat | null;
  sailliesPlanifiees: SailliePlanifiee[];
  previsionsVentes: PrevisionVenteAnimal[];
  recommendations: RecommandationStrategique[];
  alertes: AlertePlanningProduction[];
  loading: boolean;
  error: string | null;
}
