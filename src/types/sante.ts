/**
 * Types pour le module Santé
 * Gestion des vaccinations, maladies, traitements et visites vétérinaires
 */

export type CategorieAnimal = 'porcelet' | 'truie' | 'verrat' | 'porc_croissance' | 'tous';
export type TypeVaccin =
  | 'rouget'
  | 'parvovirose'
  | 'mal_rouge'
  | 'circovirus'
  | 'mycoplasme'
  | 'grippe'
  | 'autre';
export type TypeProphylaxie =
  | 'vitamine'
  | 'deparasitant'
  | 'fer'
  | 'antibiotique_preventif'
  | 'vaccin_obligatoire'
  | 'autre_traitement';
export type RaisonTraitement =
  | 'suivi_normal'
  | 'renforcement_sanitaire'
  | 'prevention'
  | 'traitement_curatif'
  | 'urgence_sanitaire'
  | 'autre';
export type StatutVaccination = 'planifie' | 'effectue' | 'en_retard' | 'annule';
export type TypeMaladie =
  | 'diarrhee'
  | 'respiratoire'
  | 'gale_parasites'
  | 'fievre'
  | 'boiterie'
  | 'digestive'
  | 'cutanee'
  | 'reproduction'
  | 'neurologique'
  | 'autre';
export type GraviteMaladie = 'faible' | 'moderee' | 'grave' | 'critique';
export type TypeTraitement =
  | 'antibiotique'
  | 'antiparasitaire'
  | 'anti_inflammatoire'
  | 'vitamine'
  | 'vaccin'
  | 'autre';
export type VoieAdministration = 'orale' | 'injectable' | 'topique' | 'alimentaire';

/**
 * Calendrier de vaccination
 */
export interface CalendrierVaccination {
  id: string;
  projet_id: string;
  vaccin: TypeVaccin;
  nom_vaccin?: string;
  categorie: CategorieAnimal;
  age_jours?: number; // Âge recommandé en jours
  date_planifiee?: string; // Date ISO si planifié pour une date spécifique
  frequence_jours?: number; // Fréquence de rappel en jours
  obligatoire: boolean;
  notes?: string;
  date_creation: string;
}

export interface CreateCalendrierVaccinationInput {
  projet_id: string;
  vaccin: TypeVaccin;
  nom_vaccin?: string;
  categorie: CategorieAnimal;
  age_jours?: number;
  date_planifiee?: string;
  frequence_jours?: number;
  obligatoire?: boolean;
  notes?: string;
}

/**
 * Vaccination effectuée (Version améliorée)
 */
export interface Vaccination {
  id: string;
  projet_id: string;
  calendrier_id?: string; // Lien avec le calendrier
  animal_ids?: string[]; // IDs des animaux vaccinés (multi-select)
  lot_id?: string; // Si vaccination par lot
  batch_id?: string; // ID de la bande (mode batch)
  nombre_sujets_vaccines?: number; // Nombre de sujets vaccinés (mode batch)
  type_prophylaxie: TypeProphylaxie; // Nouveau : type de prophylaxie
  vaccin?: TypeVaccin; // Pour compatibilité
  nom_vaccin?: string;
  produit_administre: string; // Nom du produit
  photo_flacon?: string; // URI de la photo du flacon
  date_vaccination: string; // Date ISO format YYYY-MM-DD
  date_rappel?: string; // Date du prochain rappel
  numero_lot_vaccin?: string;
  dosage: string; // Ex: "2ml", "1cc", "50mg"
  unite_dosage?: string; // ml, mg, cc, etc.
  raison_traitement: RaisonTraitement; // Raison du traitement
  raison_autre?: string; // Si raison = 'autre'
  veterinaire?: string;
  cout?: number;
  statut: StatutVaccination;
  effets_secondaires?: string;
  notes?: string;
  date_creation: string;
  derniere_modification: string;
}

export interface CreateVaccinationInput {
  projet_id: string;
  calendrier_id?: string;
  animal_ids?: string[]; // Multi-select
  lot_id?: string;
  batch_id?: string; // ID de la bande (mode batch)
  nombre_sujets_vaccines?: number; // Nombre de sujets vaccinés (mode batch)
  type_prophylaxie: TypeProphylaxie;
  vaccin?: TypeVaccin;
  nom_vaccin?: string;
  produit_administre: string;
  photo_flacon?: string;
  date_vaccination: string;
  date_rappel?: string;
  numero_lot_vaccin?: string;
  dosage: string;
  unite_dosage?: string;
  raison_traitement: RaisonTraitement;
  raison_autre?: string;
  veterinaire?: string;
  cout?: number;
  statut?: StatutVaccination;
  effets_secondaires?: string;
  notes?: string;
}

export interface UpdateVaccinationInput {
  animal_ids?: string[];
  batch_id?: string; // ID de la bande (mode batch)
  nombre_sujets_vaccines?: number; // Nombre de sujets vaccinés (mode batch)
  type_prophylaxie?: TypeProphylaxie;
  produit_administre?: string;
  photo_flacon?: string;
  date_vaccination?: string;
  date_rappel?: string;
  numero_lot_vaccin?: string;
  dosage?: string;
  unite_dosage?: string;
  raison_traitement?: RaisonTraitement;
  raison_autre?: string;
  veterinaire?: string;
  cout?: number;
  statut?: StatutVaccination;
  effets_secondaires?: string;
  notes?: string;
}

/**
 * Journal des maladies
 */
export interface Maladie {
  id: string;
  projet_id: string;
  animal_id?: string; // Si maladie individuelle
  lot_id?: string; // Si épidémie
  batch_id?: string; // ID de la bande (mode batch)
  type: TypeMaladie;
  nom_maladie: string;
  gravite: GraviteMaladie;
  date_debut: string; // Date ISO
  date_fin?: string; // Date de guérison
  symptomes: string; // Description des symptômes
  diagnostic?: string;
  contagieux: boolean;
  nombre_animaux_affectes?: number;
  nombre_deces?: number;
  veterinaire?: string;
  cout_traitement?: number;
  gueri: boolean;
  notes?: string;
  date_creation: string;
  derniere_modification: string;
}

export interface CreateMaladieInput {
  projet_id: string;
  animal_id?: string;
  lot_id?: string;
  batch_id?: string; // ID de la bande (mode batch)
  type: TypeMaladie;
  nom_maladie: string;
  gravite: GraviteMaladie;
  date_debut: string;
  date_fin?: string;
  symptomes: string;
  diagnostic?: string;
  contagieux?: boolean;
  nombre_animaux_affectes?: number;
  nombre_deces?: number;
  veterinaire?: string;
  cout_traitement?: number;
  gueri?: boolean;
  notes?: string;
}

export interface UpdateMaladieInput {
  type?: TypeMaladie;
  nom_maladie?: string;
  gravite?: GraviteMaladie;
  date_debut?: string;
  date_fin?: string;
  symptomes?: string;
  diagnostic?: string;
  contagieux?: boolean;
  nombre_animaux_affectes?: number;
  nombre_deces?: number;
  veterinaire?: string;
  cout_traitement?: number;
  gueri?: boolean;
  notes?: string;
  batch_id?: string; // ID de la bande (mode batch)
}

/**
 * Traitement médical
 */
export interface Traitement {
  id: string;
  projet_id: string;
  maladie_id?: string; // Lien avec une maladie
  animal_id?: string;
  lot_id?: string;
  batch_id?: string; // ID de la bande (mode batch)
  type: TypeTraitement;
  nom_medicament: string;
  voie_administration: VoieAdministration;
  dosage: string; // Ex: "2ml/kg", "1 comprimé"
  frequence: string; // Ex: "2x/jour", "1x/semaine"
  date_debut: string; // Date ISO
  date_fin?: string;
  duree_jours?: number;
  temps_attente_jours?: number; // Délai avant abattage
  veterinaire?: string;
  cout?: number;
  termine: boolean;
  efficace?: boolean; // Évaluation de l'efficacité
  effets_secondaires?: string;
  notes?: string;
  date_creation: string;
  derniere_modification: string;
}

export interface CreateTraitementInput {
  projet_id: string;
  maladie_id?: string;
  animal_id?: string;
  lot_id?: string;
  batch_id?: string; // ID de la bande (mode batch)
  type: TypeTraitement;
  nom_medicament: string;
  voie_administration: VoieAdministration;
  dosage: string;
  frequence: string;
  date_debut: string;
  date_fin?: string;
  duree_jours?: number;
  temps_attente_jours?: number;
  veterinaire?: string;
  cout?: number;
  termine?: boolean;
  efficace?: boolean;
  effets_secondaires?: string;
  notes?: string;
}

export interface UpdateTraitementInput {
  type?: TypeTraitement;
  nom_medicament?: string;
  voie_administration?: VoieAdministration;
  dosage?: string;
  frequence?: string;
  date_debut?: string;
  date_fin?: string;
  duree_jours?: number;
  temps_attente_jours?: number;
  veterinaire?: string;
  cout?: number;
  termine?: boolean;
  efficace?: boolean;
  effets_secondaires?: string;
  notes?: string;
  batch_id?: string; // ID de la bande (mode batch)
}

/**
 * Visite vétérinaire
 */
export interface VisiteVeterinaire {
  id: string;
  projet_id: string;
  date_visite: string; // Date ISO
  veterinaire: string;
  motif: string; // Raison de la visite
  animaux_examines?: string; // IDs des animaux séparés par virgules
  diagnostic?: string;
  prescriptions?: string;
  recommandations?: string;
  cout: number;
  prochaine_visite?: string; // Date de la prochaine visite recommandée
  notes?: string;
  date_creation: string;
  derniere_modification: string;
}

export interface CreateVisiteVeterinaireInput {
  projet_id: string;
  date_visite: string;
  veterinaire: string;
  motif: string;
  animaux_examines?: string;
  diagnostic?: string;
  prescriptions?: string;
  recommandations?: string;
  cout: number;
  prochaine_visite?: string;
  notes?: string;
}

export interface UpdateVisiteVeterinaireInput {
  date_visite?: string;
  veterinaire?: string;
  motif?: string;
  animaux_examines?: string;
  diagnostic?: string;
  prescriptions?: string;
  recommandations?: string;
  cout?: number;
  prochaine_visite?: string;
  notes?: string;
}

/**
 * Rappel de vaccination
 */
export interface RappelVaccination {
  id: string;
  vaccination_id: string;
  date_rappel: string;
  envoi: boolean; // Si le rappel a été envoyé
  date_envoi?: string;
}

/**
 * Labels pour l'affichage
 */
export const CATEGORIE_ANIMAL_LABELS: Record<CategorieAnimal, string> = {
  porcelet: 'Porcelets',
  truie: 'Truies',
  verrat: 'Verrats',
  porc_croissance: 'Porcs en croissance',
  tous: 'Tous',
};

export const TYPE_VACCIN_LABELS: Record<TypeVaccin, string> = {
  rouget: 'Rouget',
  parvovirose: 'Parvovirose',
  mal_rouge: 'Mal rouge',
  circovirus: 'Circovirus',
  mycoplasme: 'Mycoplasme',
  grippe: 'Grippe porcine',
  autre: 'Autre',
};

export const STATUT_VACCINATION_LABELS: Record<StatutVaccination, string> = {
  planifie: 'Planifié',
  effectue: 'Effectué',
  en_retard: 'En retard',
  annule: 'Annulé',
};

export const GRAVITE_MALADIE_LABELS: Record<GraviteMaladie, string> = {
  faible: 'Faible',
  moderee: 'Modérée',
  grave: 'Grave',
  critique: 'Critique',
};

export const TYPE_TRAITEMENT_LABELS: Record<TypeTraitement, string> = {
  antibiotique: 'Antibiotique',
  antiparasitaire: 'Antiparasitaire',
  anti_inflammatoire: 'Anti-inflammatoire',
  vitamine: 'Vitamine/Complément',
  vaccin: 'Vaccin',
  autre: 'Autre',
};

export const VOIE_ADMINISTRATION_LABELS: Record<VoieAdministration, string> = {
  orale: 'Orale',
  injectable: 'Injectable',
  topique: 'Topique',
  alimentaire: 'Alimentaire',
};

export const TYPE_PROPHYLAXIE_LABELS: Record<TypeProphylaxie, string> = {
  vitamine: 'Vitamines',
  deparasitant: 'Déparasitant',
  fer: 'Fer',
  antibiotique_preventif: 'Antibiotiques préventifs',
  vaccin_obligatoire: 'Vaccins obligatoires',
  autre_traitement: 'Autres traitements',
};

export const RAISON_TRAITEMENT_LABELS: Record<RaisonTraitement, string> = {
  suivi_normal: 'Suivi normal',
  renforcement_sanitaire: 'Renforcement sanitaire',
  prevention: 'Prévention',
  traitement_curatif: 'Traitement curatif',
  urgence_sanitaire: 'Urgence sanitaire',
  autre: 'Autre',
};

/**
 * Protocoles de vaccination standard
 */
export interface ProtocoleVaccination {
  vaccin: TypeVaccin;
  nom_vaccin: string;
  categorie: CategorieAnimal;
  age_jours: number;
  frequence_jours?: number;
  obligatoire: boolean;
  description: string;
}

export const PROTOCOLES_VACCINATION_STANDARD: ProtocoleVaccination[] = [
  {
    vaccin: 'rouget',
    nom_vaccin: 'Vaccin Rouget',
    categorie: 'porcelet',
    age_jours: 56, // 8 semaines
    frequence_jours: 180, // Rappel tous les 6 mois
    obligatoire: true,
    description: 'Protection contre le rouget du porc (Erysipelothrix rhusiopathiae)',
  },
  {
    vaccin: 'parvovirose',
    nom_vaccin: 'Vaccin Parvovirose',
    categorie: 'truie',
    age_jours: 180, // 6 mois
    frequence_jours: 180, // Rappel tous les 6 mois
    obligatoire: true,
    description: 'Protection contre la parvovirose porcine (troubles de reproduction)',
  },
  {
    vaccin: 'circovirus',
    nom_vaccin: 'Vaccin Circovirus PCV2',
    categorie: 'porcelet',
    age_jours: 21, // 3 semaines
    frequence_jours: 365, // Rappel annuel
    obligatoire: false,
    description: 'Protection contre le circovirus porcin de type 2',
  },
  {
    vaccin: 'mycoplasme',
    nom_vaccin: 'Vaccin Mycoplasme',
    categorie: 'porcelet',
    age_jours: 7, // 1 semaine
    frequence_jours: 0, // Une seule injection
    obligatoire: false,
    description: 'Protection contre Mycoplasma hyopneumoniae',
  },
  {
    vaccin: 'grippe',
    nom_vaccin: 'Vaccin Grippe Porcine',
    categorie: 'truie',
    age_jours: 90, // 3 mois
    frequence_jours: 180, // Rappel tous les 6 mois
    obligatoire: false,
    description: 'Protection contre la grippe porcine (Influenza)',
  },
];

/**
 * Fonction utilitaire pour calculer la date de prochain rappel
 */
export function calculerDateRappel(dateVaccination: string, frequenceJours: number): string {
  const date = new Date(dateVaccination);
  date.setDate(date.getDate() + frequenceJours);
  return date.toISOString().split('T')[0];
}

/**
 * Fonction utilitaire pour vérifier si un rappel est en retard
 */
export function estEnRetard(dateRappel: string): boolean {
  const rappel = new Date(dateRappel);
  const aujourdhui = new Date();
  return rappel < aujourdhui;
}

/**
 * Fonction utilitaire pour calculer les jours avant/après rappel
 */
export function joursAvantRappel(dateRappel: string): number {
  const rappel = new Date(dateRappel);
  const aujourdhui = new Date();
  const diffMs = rappel.getTime() - aujourdhui.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * CALENDRIER VACCINAL TYPE PAR ÂGE
 * Basé sur les bonnes pratiques en élevage porcin
 */
export interface CalendrierTypeAge {
  age_jours: number;
  age_display: string;
  type_prophylaxie: TypeProphylaxie;
  nom_traitement: string;
  description: string;
  obligatoire: boolean;
  dosage_recommande?: string;
  notes?: string;
}

export const CALENDRIER_VACCINAL_TYPE: CalendrierTypeAge[] = [
  {
    age_jours: 3,
    age_display: 'J3-5',
    type_prophylaxie: 'fer',
    nom_traitement: 'Fer dextran',
    description: "Injection de fer pour prévenir l'anémie ferriprive",
    obligatoire: true,
    dosage_recommande: '200mg (2ml)',
    notes:
      'Administration IM dans le cou ou la cuisse. Essentiel pour les porcelets nés en élevage intensif.',
  },
  {
    age_jours: 7,
    age_display: 'J7-10',
    type_prophylaxie: 'vitamine',
    nom_traitement: 'Vitamines AD3E',
    description: 'Apport vitaminique pour renforcer le système immunitaire',
    obligatoire: false,
    dosage_recommande: '1ml',
    notes: 'Particulièrement important en période de stress ou de sevrage précoce.',
  },
  {
    age_jours: 14,
    age_display: 'J14',
    type_prophylaxie: 'vaccin_obligatoire',
    nom_traitement: 'Vaccin Mycoplasme',
    description: 'Protection contre Mycoplasma hyopneumoniae (pneumonie enzootique)',
    obligatoire: true,
    dosage_recommande: '2ml IM',
    notes: 'Première injection. Rappel à J28 recommandé.',
  },
  {
    age_jours: 21,
    age_display: 'J21',
    type_prophylaxie: 'deparasitant',
    nom_traitement: 'Vermifuge',
    description: 'Déparasitage interne (vers ronds et plats)',
    obligatoire: true,
    dosage_recommande: '1ml/10kg',
    notes: 'Ivermectine ou fenbendazole. À répéter selon le protocole.',
  },
  {
    age_jours: 28,
    age_display: 'J28 (Sevrage)',
    type_prophylaxie: 'vaccin_obligatoire',
    nom_traitement: 'Vaccin Circovirus PCV2',
    description: 'Protection contre le circovirus porcin type 2',
    obligatoire: true,
    dosage_recommande: '2ml IM',
    notes: "Moment critique : sevrage. Renforce l'immunité lors du stress de séparation.",
  },
  {
    age_jours: 35,
    age_display: 'J35',
    type_prophylaxie: 'antibiotique_preventif',
    nom_traitement: 'Antibiotique préventif',
    description: 'Prévention des infections post-sevrage',
    obligatoire: false,
    dosage_recommande: 'Selon prescription vétérinaire',
    notes: "Uniquement si historique de problèmes sanitaires. Éviter l'usage systématique.",
  },
  {
    age_jours: 42,
    age_display: 'J42 (6 semaines)',
    type_prophylaxie: 'vitamine',
    nom_traitement: 'Renforcement vitaminique',
    description: 'Vitamines B-complex + Électrolytes',
    obligatoire: false,
    dosage_recommande: "Dans l'eau de boisson",
    notes: 'Favorise la croissance et réduit le stress.',
  },
  {
    age_jours: 56,
    age_display: 'J56 (8 semaines)',
    type_prophylaxie: 'vaccin_obligatoire',
    nom_traitement: 'Vaccin Rouget',
    description: 'Protection contre le rouget du porc (Erysipelothrix)',
    obligatoire: true,
    dosage_recommande: '2ml IM',
    notes: 'Maladie grave. Rappel à 6 mois puis annuellement.',
  },
  {
    age_jours: 70,
    age_display: 'J70 (10 semaines)',
    type_prophylaxie: 'deparasitant',
    nom_traitement: 'Déparasitage externe',
    description: 'Traitement contre la gale et les poux',
    obligatoire: false,
    dosage_recommande: 'Pulvérisation ou pour-on',
    notes: 'Particulièrement en élevage plein air ou si signes cliniques.',
  },
  {
    age_jours: 84,
    age_display: 'J84 (12 semaines)',
    type_prophylaxie: 'autre_traitement',
    nom_traitement: 'Bilan sanitaire',
    description: 'Examen général et ajustement du protocole',
    obligatoire: false,
    notes: "Moment idéal pour évaluer l'état sanitaire global du lot.",
  },
  {
    age_jours: 120,
    age_display: 'J120 (4 mois)',
    type_prophylaxie: 'deparasitant',
    nom_traitement: 'Déparasitage complet',
    description: 'Vermifuge large spectre',
    obligatoire: true,
    dosage_recommande: '1ml/10kg',
    notes: 'Important pour les porcs en finition.',
  },
  {
    age_jours: 180,
    age_display: 'J180 (6 mois) - Futurs reproducteurs',
    type_prophylaxie: 'vaccin_obligatoire',
    nom_traitement: 'Vaccin Parvovirose + Rouget (Rappel)',
    description: 'Protection des futurs reproducteurs',
    obligatoire: true,
    dosage_recommande: '2ml IM',
    notes:
      'Uniquement pour les animaux destinés à la reproduction. Essentiel avant la mise à la reproduction.',
  },
];

/**
 * Fonction pour obtenir les traitements recommandés selon l'âge
 */
export function getTraitementsParAge(
  ageJours: number,
  margeJours: number = 3
): CalendrierTypeAge[] {
  return CALENDRIER_VACCINAL_TYPE.filter((cal) => Math.abs(cal.age_jours - ageJours) <= margeJours);
}

/**
 * Fonction pour calculer l'âge en jours depuis la naissance
 */
export function calculerAgeJours(dateNaissance: string): number {
  const naissance = new Date(dateNaissance);
  const aujourdhui = new Date();
  const diffMs = aujourdhui.getTime() - naissance.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Interface pour les statistiques de prophylaxie par type
 */
export interface StatistiquesProphylaxieParType {
  type_prophylaxie: TypeProphylaxie;
  nom_type: string;
  total_vaccinations: number;
  porcs_vaccines: number;
  total_porcs: number;
  taux_couverture: number; // Pourcentage
  dernier_traitement?: string; // Date ISO
  prochain_prevu?: string; // Date ISO
  cout_total: number;
  en_retard: number; // Nombre de porcs en retard
}

/**
 * Labels pour les types de maladies
 */
export const TYPE_MALADIE_LABELS: Record<TypeMaladie, string> = {
  diarrhee: 'Diarrhée',
  respiratoire: 'Infections respiratoires',
  gale_parasites: 'Gale/Parasites externes',
  fievre: 'Fièvre',
  boiterie: 'Boiterie',
  digestive: 'Problèmes digestifs',
  cutanee: 'Infections cutanées',
  reproduction: 'Problèmes de reproduction',
  neurologique: 'Problèmes neurologiques',
  autre: 'Autre',
};

/**
 * Mapping traitement → type de prophylaxie pour liaison automatique
 */
export const TRAITEMENT_TO_PROPHYLAXIE_MAPPING: Record<string, TypeProphylaxie> = {
  antibiotique: 'antibiotique_preventif',
  antibiotic: 'antibiotique_preventif',
  deparasitant: 'deparasitant',
  déparasitant: 'deparasitant',
  vermifuge: 'deparasitant',
  vitamine: 'vitamine',
  fer: 'fer',
  iron: 'fer',
};

/**
 * Interface pour les stats sanitaires de la ferme
 */
export interface StatsSanitairesFerme {
  total_actifs: number;
  porcs_malades: number;
  taux_maladie: number; // Pourcentage
  maladies_recurrentes: Array<{
    type: TypeMaladie;
    nom: string;
    count: number;
    pourcentage: number;
  }>;
  suggestions: string[];
}

/**
 * Interface pour la maladie avec photos et traitement
 */
export interface MaladieAvecTraitement extends Maladie {
  photos?: string[]; // URIs des photos
  traitement_administre?: string; // Description du traitement
  produit_utilise?: string;
  dosage_traitement?: string;
  date_administration?: string;
  linked_vaccination_id?: string; // ID de la vaccination liée si applicable
}

/**
 * Input pour créer une maladie avec traitement et liaison auto
 */
export interface CreateMaladieAvecTraitementInput extends CreateMaladieInput {
  photos?: string[];
  traitement_administre?: string;
  produit_utilise?: string;
  dosage_traitement?: string;
  date_administration?: string;
}
