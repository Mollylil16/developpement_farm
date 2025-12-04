/**
 * Types pour la gestion de la nutrition
 */

export type TypePorc =
  | 'porcelet'
  | 'truie_gestante'
  | 'truie_allaitante'
  | 'verrat'
  | 'porc_croissance';

export interface Ingredient {
  id: string;
  nom: string;
  unite: 'kg' | 'g' | 'l' | 'ml' | 'sac'; // Ajout de 'sac' (sac de 50kg)
  prix_unitaire: number; // Prix par unité en CFA
  proteine_pourcent?: number; // Pourcentage de protéines
  energie_kcal?: number; // Énergie en kcal/kg
  equivalents?: string[]; // Liste d'ingrédients équivalents suggérés
  date_creation: string;
}

export interface IngredientRation {
  id: string;
  ration_id: string;
  ingredient_id: string;
  quantite: number; // Quantité nécessaire
  ingredient?: Ingredient; // Données de l'ingrédient (pour affichage)
}

export interface Ration {
  id: string;
  projet_id: string;
  type_porc: TypePorc;
  poids_kg: number;
  nombre_porcs?: number; // Nombre de porcs pour lesquels la ration est calculée
  ingredients: IngredientRation[]; // Liste des ingrédients avec quantités
  cout_total?: number; // Coût total calculé
  cout_par_kg?: number; // Coût par kg de poids
  notes?: string;
  date_creation: string;
}

export interface CreateRationInput {
  projet_id: string;
  type_porc: TypePorc;
  poids_kg: number;
  nombre_porcs?: number;
  ingredients: {
    ingredient_id: string;
    quantite: number;
  }[];
  notes?: string;
}

export interface CreateIngredientInput {
  nom: string;
  unite: 'kg' | 'g' | 'l' | 'ml' | 'sac';
  prix_unitaire: number;
  proteine_pourcent?: number;
  energie_kcal?: number;
}

export interface UpdateIngredientInput {
  nom?: string;
  unite?: 'kg' | 'g' | 'l' | 'ml' | 'sac';
  prix_unitaire?: number;
  proteine_pourcent?: number;
  energie_kcal?: number;
}

/**
 * Base de données des valeurs nutritionnelles moyennes des ingrédients
 * Sources : Tables INRA, FAO, CIRAD
 */
export interface ValeursNutritionnelles {
  proteine_pourcent: number;
  energie_kcal: number;
  equivalents: string[]; // Ingrédients équivalents possibles
}

export const VALEURS_NUTRITIONNELLES_INGREDIENTS: Record<string, ValeursNutritionnelles> = {
  // Céréales
  mais: {
    proteine_pourcent: 8.5,
    energie_kcal: 3350,
    equivalents: ['Sorgho', 'Blé', 'Orge'],
  },
  'mais grain': {
    proteine_pourcent: 8.5,
    energie_kcal: 3350,
    equivalents: ['Sorgho', 'Blé', 'Orge'],
  },
  sorgho: {
    proteine_pourcent: 10,
    energie_kcal: 3300,
    equivalents: ['Maïs', 'Mil', 'Blé'],
  },
  ble: {
    proteine_pourcent: 12,
    energie_kcal: 3320,
    equivalents: ['Maïs', 'Orge', 'Sorgho'],
  },
  blé: {
    proteine_pourcent: 12,
    energie_kcal: 3320,
    equivalents: ['Maïs', 'Orge', 'Sorgho'],
  },
  orge: {
    proteine_pourcent: 11,
    energie_kcal: 3000,
    equivalents: ['Blé', 'Maïs', 'Avoine'],
  },
  mil: {
    proteine_pourcent: 11,
    energie_kcal: 3400,
    equivalents: ['Sorgho', 'Maïs'],
  },
  riz: {
    proteine_pourcent: 7.5,
    energie_kcal: 3600,
    equivalents: ['Maïs', 'Blé'],
  },

  // Tourteaux et sources protéiques
  'tourteau de soja': {
    proteine_pourcent: 44,
    energie_kcal: 2300,
    equivalents: ["Tourteau d'arachide", 'Farine de poisson', 'Tourteau de coton'],
  },
  'tourteau soja': {
    proteine_pourcent: 44,
    energie_kcal: 2300,
    equivalents: ["Tourteau d'arachide", 'Farine de poisson', 'Tourteau de coton'],
  },
  "tourteau d'arachide": {
    proteine_pourcent: 48,
    energie_kcal: 2200,
    equivalents: ['Tourteau de soja', 'Farine de poisson'],
  },
  'tourteau arachide': {
    proteine_pourcent: 48,
    energie_kcal: 2200,
    equivalents: ['Tourteau de soja', 'Farine de poisson'],
  },
  'tourteau de coton': {
    proteine_pourcent: 40,
    energie_kcal: 2000,
    equivalents: ['Tourteau de soja', "Tourteau d'arachide"],
  },
  'farine de poisson': {
    proteine_pourcent: 65,
    energie_kcal: 2800,
    equivalents: ['Tourteau de soja', 'Farine de viande'],
  },

  // Sons et co-produits
  'son de ble': {
    proteine_pourcent: 16,
    energie_kcal: 1900,
    equivalents: ['Son de riz', 'Remoulage', 'Son de maïs'],
  },
  'son de blé': {
    proteine_pourcent: 16,
    energie_kcal: 1900,
    equivalents: ['Son de riz', 'Remoulage', 'Son de maïs'],
  },
  'son de riz': {
    proteine_pourcent: 13,
    energie_kcal: 1800,
    equivalents: ['Son de blé', 'Son de maïs'],
  },
  'son de mais': {
    proteine_pourcent: 9,
    energie_kcal: 2000,
    equivalents: ['Son de blé', 'Son de riz'],
  },
  'son de maïs': {
    proteine_pourcent: 9,
    energie_kcal: 2000,
    equivalents: ['Son de blé', 'Son de riz'],
  },
  remoulage: {
    proteine_pourcent: 17,
    energie_kcal: 2100,
    equivalents: ['Son de blé', 'Farine basse'],
  },

  // Matières grasses
  'huile de soja': {
    proteine_pourcent: 0,
    energie_kcal: 8900,
    equivalents: ['Huile de palme', 'Huile de tournesol', 'Graisse animale'],
  },
  'huile de palme': {
    proteine_pourcent: 0,
    energie_kcal: 8900,
    equivalents: ['Huile de soja', 'Huile de tournesol'],
  },
  'graisse animale': {
    proteine_pourcent: 0,
    energie_kcal: 8500,
    equivalents: ['Huile de soja', 'Huile de palme'],
  },

  // Minéraux et compléments
  cmv: {
    proteine_pourcent: 0,
    energie_kcal: 0,
    equivalents: ['Prémix minéral vitaminé', 'CMV Porc'],
  },
  'cmv porc': {
    proteine_pourcent: 0,
    energie_kcal: 0,
    equivalents: ['CMV', 'Prémix minéral vitaminé'],
  },
  'complement mineral vitamine': {
    proteine_pourcent: 0,
    energie_kcal: 0,
    equivalents: ['CMV', 'CMV Porc'],
  },
  'carbonate de calcium': {
    proteine_pourcent: 0,
    energie_kcal: 0,
    equivalents: ['Phosphate bicalcique', "Coquilles d'huîtres"],
  },
  'phosphate bicalcique': {
    proteine_pourcent: 0,
    energie_kcal: 0,
    equivalents: ['Carbonate de calcium', 'Phosphate monocalcique'],
  },
  sel: {
    proteine_pourcent: 0,
    energie_kcal: 0,
    equivalents: [],
  },

  // Acides aminés
  lysine: {
    proteine_pourcent: 0,
    energie_kcal: 0,
    equivalents: ['L-Lysine HCl'],
  },
  methionine: {
    proteine_pourcent: 0,
    energie_kcal: 0,
    equivalents: ['DL-Méthionine'],
  },
  thréonine: {
    proteine_pourcent: 0,
    energie_kcal: 0,
    equivalents: ['L-Thréonine'],
  },
  threonine: {
    proteine_pourcent: 0,
    energie_kcal: 0,
    equivalents: ['L-Thréonine'],
  },

  // Produits laitiers
  'lait en poudre': {
    proteine_pourcent: 26,
    energie_kcal: 3600,
    equivalents: ['Lactosérum', 'Poudre de lait écrémé'],
  },
  lactoserum: {
    proteine_pourcent: 13,
    energie_kcal: 3500,
    equivalents: ['Lait en poudre', 'Babeurre'],
  },
  lactosérum: {
    proteine_pourcent: 13,
    energie_kcal: 3500,
    equivalents: ['Lait en poudre', 'Babeurre'],
  },
};

/**
 * Fonction pour obtenir les valeurs nutritionnelles d'un ingrédient
 * Recherche insensible à la casse et aux accents
 */
export function getValeursNutritionnelles(nomIngredient: string): ValeursNutritionnelles | null {
  const nomNormalise = nomIngredient
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
    .trim();

  // Recherche exacte
  if (VALEURS_NUTRITIONNELLES_INGREDIENTS[nomNormalise]) {
    return VALEURS_NUTRITIONNELLES_INGREDIENTS[nomNormalise];
  }

  // Recherche partielle (si le nom contient un des ingrédients connus)
  for (const [cle, valeurs] of Object.entries(VALEURS_NUTRITIONNELLES_INGREDIENTS)) {
    if (nomNormalise.includes(cle) || cle.includes(nomNormalise)) {
      return valeurs;
    }
  }

  return null;
}

export type UniteStock = 'kg' | 'g' | 'l' | 'ml' | 'sac' | 'unite';

export type TypeMouvementStock = 'entree' | 'sortie' | 'ajustement';

export interface StockAliment {
  id: string;
  projet_id: string;
  nom: string;
  categorie?: string;
  quantite_actuelle: number;
  unite: UniteStock;
  seuil_alerte?: number;
  date_derniere_entree?: string;
  date_derniere_sortie?: string;
  alerte_active: boolean;
  notes?: string;
  date_creation: string;
  derniere_modification: string;
}

export interface CreateStockAlimentInput {
  projet_id: string;
  nom: string;
  categorie?: string;
  quantite_initiale?: number;
  unite: UniteStock;
  seuil_alerte?: number;
  notes?: string;
}

export interface UpdateStockAlimentInput {
  nom?: string;
  categorie?: string;
  unite?: UniteStock;
  seuil_alerte?: number | null;
  notes?: string | null;
}

export interface StockMouvement {
  id: string;
  projet_id: string;
  aliment_id: string;
  type: TypeMouvementStock;
  quantite: number;
  unite: UniteStock;
  date: string;
  origine?: string;
  commentaire?: string;
  cree_par?: string;
  date_creation: string;
}

export interface CreateStockMouvementInput {
  projet_id: string;
  aliment_id: string;
  type: TypeMouvementStock;
  quantite: number;
  unite: UniteStock;
  date: string;
  origine?: string;
  commentaire?: string;
  cree_par?: string;
}

/**
 * Recommandations nutritionnelles standards par type de porc (kg/jour)
 * Ces valeurs sont des moyennes et peuvent être ajustées
 */
export const RECOMMANDATIONS_NUTRITION: Record<
  TypePorc,
  {
    energie_kcal_kg?: number;
    proteine_pourcent?: number;
    ration_kg_jour?: number; // Ration quotidienne recommandée en kg
  }
> = {
  porcelet: {
    energie_kcal_kg: 3500,
    proteine_pourcent: 18,
    ration_kg_jour: 1.5,
  },
  truie_gestante: {
    energie_kcal_kg: 3000,
    proteine_pourcent: 14,
    ration_kg_jour: 2.5,
  },
  truie_allaitante: {
    energie_kcal_kg: 3500,
    proteine_pourcent: 16,
    ration_kg_jour: 5.0,
  },
  verrat: {
    energie_kcal_kg: 3200,
    proteine_pourcent: 15,
    ration_kg_jour: 2.0,
  },
  porc_croissance: {
    energie_kcal_kg: 3300,
    proteine_pourcent: 16,
    ration_kg_jour: 2.5,
  },
};

/**
 * Fonction pour obtenir le libellé du type de porc
 */
export function getTypePorcLabel(type: TypePorc): string {
  const labels: Record<TypePorc, string> = {
    porcelet: 'Porcelet',
    truie_gestante: 'Truie gestante',
    truie_allaitante: 'Truie allaitante',
    verrat: 'Verrat',
    porc_croissance: 'Porc en croissance',
  };
  return labels[type];
}

/**
 * Types pour le système de budgétisation d'aliment
 */

// Ration sauvegardée (budget d'alimentation)
export interface RationBudget {
  id: string;
  projet_id: string;
  nom: string; // Ex: "Porcelets - Bâtiment A", "Truies gestantes - Janvier"
  type_porc: TypePorc;
  poids_moyen_kg: number;
  nombre_porcs: number;
  duree_jours: number;
  ration_journaliere_par_porc: number; // kg/jour/porc
  quantite_totale_kg: number;
  cout_total: number;
  cout_par_kg: number;
  cout_par_porc: number;
  ingredients: Array<{
    nom: string;
    pourcentage: number;
    quantite_kg: number;
    prix_unitaire: number;
    cout_total: number;
  }>;
  notes?: string;
  date_creation: string;
  derniere_modification: string;
}

export interface CreateRationBudgetInput {
  projet_id: string;
  nom: string;
  type_porc: TypePorc;
  poids_moyen_kg: number;
  nombre_porcs: number;
  duree_jours: number;
  ration_journaliere_par_porc: number;
  quantite_totale_kg: number;
  cout_total: number;
  cout_par_kg: number;
  cout_par_porc: number;
  ingredients: Array<{
    nom: string;
    pourcentage: number;
    quantite_kg: number;
    prix_unitaire: number;
    cout_total: number;
  }>;
  notes?: string;
}

export interface UpdateRationBudgetInput {
  nom?: string;
  type_porc?: TypePorc;
  poids_moyen_kg?: number;
  nombre_porcs?: number;
  duree_jours?: number;
  notes?: string;
}

// Composition d'un ingrédient dans une formule alimentaire
export interface CompositionIngredient {
  ingredient_id: string;
  nom: string;
  pourcentage: number; // Pourcentage dans la formule (0-100)
  prix_unitaire: number;
}

// Formule alimentaire recommandée
export interface FormuleAlimentaire {
  type_porc: TypePorc;
  nom: string;
  description: string;
  composition: CompositionIngredient[];
}

// Résultat du calcul de ration
export interface ResultatCalculRation {
  // Inputs
  type_porc: TypePorc;
  poids_moyen_kg: number;
  nombre_porcs: number;
  duree_jours: number;

  // Recommandation nutritionnelle
  ration_journaliere_par_porc: number; // kg/jour/porc
  formule_recommandee: FormuleAlimentaire;

  // Quantités par ingrédient
  details_ingredients: Array<{
    nom: string;
    pourcentage: number;
    quantite_kg: number;
    prix_unitaire: number;
    cout_total: number;
  }>;

  // Totaux
  quantite_totale_kg: number; // Quantité totale d'aliment nécessaire
  cout_total: number; // Coût total de l'alimentation
  cout_par_kg: number; // Coût par kg d'aliment
  cout_par_porc: number; // Coût par porc pour la période
}

/**
 * Formules alimentaires recommandées par type de porc
 * Sources : Standards FAO et pratiques d'élevage porcin
 */
export const FORMULES_RECOMMANDEES: Record<TypePorc, FormuleAlimentaire> = {
  porcelet: {
    type_porc: 'porcelet',
    nom: 'Aliment Pré-démarrage / Démarrage',
    description: 'Formule pour porcelets sevrés (7-25 kg)',
    composition: [
      { ingredient_id: '', nom: 'Maïs', pourcentage: 50, prix_unitaire: 0 },
      { ingredient_id: '', nom: 'Tourteau de soja', pourcentage: 28, prix_unitaire: 0 },
      { ingredient_id: '', nom: 'Son de blé', pourcentage: 10, prix_unitaire: 0 },
      { ingredient_id: '', nom: 'Lait en poudre', pourcentage: 5, prix_unitaire: 0 },
      {
        ingredient_id: '',
        nom: 'CMV (Complément Minéral Vitaminé)',
        pourcentage: 4.7,
        prix_unitaire: 0,
      },
      { ingredient_id: '', nom: 'Lysine', pourcentage: 2, prix_unitaire: 0 },
      { ingredient_id: '', nom: 'Sel', pourcentage: 0.3, prix_unitaire: 0 },
    ],
  },
  truie_gestante: {
    type_porc: 'truie_gestante',
    nom: 'Aliment Truie Gestante',
    description: 'Formule pour truies en gestation',
    composition: [
      { ingredient_id: '', nom: 'Maïs', pourcentage: 60, prix_unitaire: 0 },
      { ingredient_id: '', nom: 'Tourteau de soja', pourcentage: 15, prix_unitaire: 0 },
      { ingredient_id: '', nom: 'Son de blé', pourcentage: 20, prix_unitaire: 0 },
      {
        ingredient_id: '',
        nom: 'CMV (Complément Minéral Vitaminé)',
        pourcentage: 3,
        prix_unitaire: 0,
      },
      { ingredient_id: '', nom: 'Carbonate de calcium', pourcentage: 1.7, prix_unitaire: 0 },
      { ingredient_id: '', nom: 'Sel', pourcentage: 0.3, prix_unitaire: 0 },
    ],
  },
  truie_allaitante: {
    type_porc: 'truie_allaitante',
    nom: 'Aliment Truie Allaitante',
    description: 'Formule pour truies en lactation',
    composition: [
      { ingredient_id: '', nom: 'Maïs', pourcentage: 55, prix_unitaire: 0 },
      { ingredient_id: '', nom: 'Tourteau de soja', pourcentage: 25, prix_unitaire: 0 },
      { ingredient_id: '', nom: 'Son de blé', pourcentage: 10, prix_unitaire: 0 },
      { ingredient_id: '', nom: 'Huile de soja', pourcentage: 3, prix_unitaire: 0 },
      {
        ingredient_id: '',
        nom: 'CMV (Complément Minéral Vitaminé)',
        pourcentage: 4.7,
        prix_unitaire: 0,
      },
      { ingredient_id: '', nom: 'Lysine', pourcentage: 2, prix_unitaire: 0 },
      { ingredient_id: '', nom: 'Sel', pourcentage: 0.3, prix_unitaire: 0 },
    ],
  },
  verrat: {
    type_porc: 'verrat',
    nom: 'Aliment Verrat',
    description: 'Formule pour verrats reproducteurs',
    composition: [
      { ingredient_id: '', nom: 'Maïs', pourcentage: 62, prix_unitaire: 0 },
      { ingredient_id: '', nom: 'Tourteau de soja', pourcentage: 18, prix_unitaire: 0 },
      { ingredient_id: '', nom: 'Son de blé', pourcentage: 15, prix_unitaire: 0 },
      {
        ingredient_id: '',
        nom: 'CMV (Complément Minéral Vitaminé)',
        pourcentage: 2.7,
        prix_unitaire: 0,
      },
      { ingredient_id: '', nom: 'Lysine', pourcentage: 2, prix_unitaire: 0 },
      { ingredient_id: '', nom: 'Sel', pourcentage: 0.3, prix_unitaire: 0 },
    ],
  },
  porc_croissance: {
    type_porc: 'porc_croissance',
    nom: 'Aliment Croissance / Finition',
    description: 'Formule pour porcs en croissance (25-100 kg)',
    composition: [
      { ingredient_id: '', nom: 'Maïs', pourcentage: 65, prix_unitaire: 0 },
      { ingredient_id: '', nom: 'Tourteau de soja', pourcentage: 20, prix_unitaire: 0 },
      { ingredient_id: '', nom: 'Son de blé', pourcentage: 10, prix_unitaire: 0 },
      {
        ingredient_id: '',
        nom: 'CMV (Complément Minéral Vitaminé)',
        pourcentage: 2.7,
        prix_unitaire: 0,
      },
      { ingredient_id: '', nom: 'Lysine', pourcentage: 2, prix_unitaire: 0 },
      { ingredient_id: '', nom: 'Sel', pourcentage: 0.3, prix_unitaire: 0 },
    ],
  },
};
