/**
 * Types pour la gestion financière
 */

export type CategorieChargeFixe =
  | 'salaires'
  | 'alimentation'
  | 'entretien'
  | 'vaccins'
  | 'eau_electricite'
  | 'autre';

export type CategorieDepense =
  // OPEX - Dépenses opérationnelles courantes
  | 'vaccins'
  | 'medicaments'
  | 'alimentation'
  | 'veterinaire'
  | 'entretien'
  | 'equipements' // Petits équipements courants
  | 'autre'
  // CAPEX - Investissements (amortis sur plusieurs années) - Limité à 3 catégories
  | 'amenagement_batiment' // Construction, rénovation
  | 'equipement_lourd' // Matériel agricole, machines
  | 'achat_sujet'; // Achat de sujets (truies, verrats)

export type FrequenceCharge = 'mensuel' | 'trimestriel' | 'annuel';

export type StatutChargeFixe = 'actif' | 'suspendu' | 'termine';

export interface ChargeFixe {
  id: string;
  projet_id?: string;
  categorie: CategorieChargeFixe;
  libelle: string;
  montant: number;
  date_debut: string;
  frequence: FrequenceCharge;
  jour_paiement?: number; // Pour mensuel (1-31)
  notes?: string;
  statut: StatutChargeFixe;
  date_creation: string;
  derniere_modification: string;
}

export interface DepensePonctuelle {
  id: string;
  projet_id: string;
  montant: number;
  categorie: CategorieDepense;
  libelle_categorie?: string; // Si "autre" est sélectionné
  date: string;
  commentaire?: string;
  photos?: string[]; // URLs des photos de reçus
  date_creation: string;
}

export interface CreateChargeFixeInput {
  projet_id?: string;
  categorie: CategorieChargeFixe;
  libelle: string;
  montant: number;
  date_debut: string;
  frequence: FrequenceCharge;
  jour_paiement?: number;
  notes?: string;
}

export interface CreateDepensePonctuelleInput {
  projet_id: string;
  montant: number;
  categorie: CategorieDepense;
  libelle_categorie?: string;
  date: string;
  commentaire?: string;
  photos?: string[];
}

export interface UpdateDepensePonctuelleInput {
  montant?: number;
  categorie?: CategorieDepense;
  libelle_categorie?: string;
  date?: string;
  commentaire?: string;
  photos?: string[];
}

export type CategorieRevenu = 'vente_porc' | 'vente_autre' | 'subvention' | 'autre';

export interface Revenu {
  id: string;
  projet_id: string;
  montant: number;
  categorie: CategorieRevenu;
  libelle_categorie?: string; // Si "autre" est sélectionné
  date: string;
  description?: string; // Description de la vente (ex: nombre de porcs vendus)
  commentaire?: string;
  photos?: string[]; // URLs des photos de factures/reçus
  date_creation: string;
  // Nouveaux champs pour ventes marketplace
  poids_kg?: number; // Ancien champ (pour compatibilité)
  poids_total?: number; // Poids total en kg (nombre entier)
  nombre_animaux?: number; // Nombre d'animaux vendus
  acheteur?: string; // Nom complet de l'acheteur
  vente_id?: string; // ID de la vente liée
  animal_id?: string; // ID de l'animal vendu (si applicable)

  // ✨ Nouveaux champs pour ventes de porcs (OPEX/CAPEX)
  poids_kg?: number; // Poids du porc vendu
  cout_kg_opex?: number; // Coût OPEX par kg au moment de la vente
  cout_kg_complet?: number; // Coût complet par kg au moment de la vente
  cout_reel_opex?: number; // Coût réel OPEX du porc
  cout_reel_complet?: number; // Coût réel complet du porc
  marge_opex?: number; // Marge OPEX en valeur
  marge_complete?: number; // Marge complète en valeur
  marge_opex_pourcent?: number; // Marge OPEX en %
  marge_complete_pourcent?: number; // Marge complète en %
}

export interface CreateRevenuInput {
  projet_id: string;
  montant: number;
  categorie: CategorieRevenu;
  libelle_categorie?: string;
  date: string;
  description?: string;
  commentaire?: string;
  photos?: string[];
  poids_kg?: number; // Pour ventes de porcs
  animal_id?: string; // ID de l'animal vendu (si applicable)
}

export interface UpdateRevenuInput {
  montant?: number;
  categorie?: CategorieRevenu;
  libelle_categorie?: string;
  date?: string;
  description?: string;
  commentaire?: string;
  photos?: string[];
  poids_kg?: number; // Pour ventes de porcs
  animal_id?: string; // ID de l'animal vendu (si applicable)
}

/**
 * Type de dépense (dérivé automatiquement de la catégorie)
 */
export type TypeDepense = 'OPEX' | 'CAPEX';

/**
 * Catégories classées comme CAPEX (Investissements)
 * Limité à 3 catégories : aménagement bâtiment, équipement lourd, achat sujet
 */
export const CATEGORIES_CAPEX: CategorieDepense[] = [
  'amenagement_batiment',
  'equipement_lourd',
  'achat_sujet',
];

/**
 * Détermine si une catégorie est un CAPEX
 */
export function isCapex(categorie: CategorieDepense): boolean {
  return CATEGORIES_CAPEX.includes(categorie);
}

/**
 * Retourne le type de dépense (OPEX ou CAPEX) selon la catégorie
 */
export function getTypeDepense(categorie: CategorieDepense): TypeDepense {
  return isCapex(categorie) ? 'CAPEX' : 'OPEX';
}

/**
 * Labels pour les catégories de dépenses
 */
export const CATEGORIE_DEPENSE_LABELS: Record<CategorieDepense, string> = {
  // OPEX
  vaccins: 'Vaccins & Prophylaxie',
  medicaments: 'Médicaments',
  alimentation: 'Alimentation',
  veterinaire: 'Services vétérinaires',
  entretien: 'Entretien & Maintenance',
  equipements: 'Équipements courants',
  autre: 'Autre',
  // CAPEX - Limité à 3 catégories
  amenagement_batiment: '🏗️ Aménagement bâtiment',
  equipement_lourd: '🚜 Équipement lourd',
  achat_sujet: '🐷 Achat sujet',
};

// ==================== DETTES ====================

export type TypeDette = 'pret_bancaire' | 'pret_personnel' | 'fournisseur' | 'autre';

export type StatutDette = 'en_cours' | 'rembourse' | 'en_defaut' | 'annule';

export type FrequenceRemboursement = 'mensuel' | 'trimestriel' | 'annuel' | 'ponctuel';

export interface Dette {
  id: string;
  projet_id: string;
  libelle: string;
  type_dette: TypeDette;
  montant_initial: number;
  montant_restant: number;
  taux_interet: number;
  date_debut: string;
  date_echeance?: string;
  frequence_remboursement: FrequenceRemboursement;
  montant_remboursement?: number;
  statut: StatutDette;
  preteur?: string;
  notes?: string;
  date_creation: string;
  derniere_modification: string;
}

export interface CreateDetteInput {
  projet_id: string;
  libelle: string;
  type_dette: TypeDette;
  montant_initial: number;
  montant_restant: number;
  taux_interet?: number;
  date_debut: string;
  date_echeance?: string;
  frequence_remboursement?: FrequenceRemboursement;
  montant_remboursement?: number;
  statut?: StatutDette;
  preteur?: string;
  notes?: string;
}

export interface UpdateDetteInput {
  libelle?: string;
  type_dette?: TypeDette;
  montant_initial?: number;
  montant_restant?: number;
  taux_interet?: number;
  date_debut?: string;
  date_echeance?: string;
  frequence_remboursement?: FrequenceRemboursement;
  montant_remboursement?: number;
  statut?: StatutDette;
  preteur?: string;
  notes?: string;
}

export const TYPE_DETTE_LABELS: Record<TypeDette, string> = {
  pret_bancaire: 'Prêt bancaire',
  pret_personnel: 'Prêt personnel',
  fournisseur: 'Crédit fournisseur',
  autre: 'Autre',
};

export const STATUT_DETTE_LABELS: Record<StatutDette, string> = {
  en_cours: 'En cours',
  rembourse: 'Remboursé',
  en_defaut: 'En défaut',
  annule: 'Annulé',
};

export const FREQUENCE_REMBOURSEMENT_LABELS: Record<FrequenceRemboursement, string> = {
  mensuel: 'Mensuel',
  trimestriel: 'Trimestriel',
  annuel: 'Annuel',
  ponctuel: 'Ponctuel',
};