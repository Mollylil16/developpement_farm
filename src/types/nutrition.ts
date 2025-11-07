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
  unite: 'kg' | 'g' | 'l' | 'ml';
  prix_unitaire: number; // Prix par unité en CFA
  proteine_pourcent?: number; // Pourcentage de protéines
  energie_kcal?: number; // Énergie en kcal/kg
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
  unite: 'kg' | 'g' | 'l' | 'ml';
  prix_unitaire: number;
  proteine_pourcent?: number;
  energie_kcal?: number;
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
export const RECOMMANDATIONS_NUTRITION: Record<TypePorc, {
  energie_kcal_kg?: number;
  proteine_pourcent?: number;
  ration_kg_jour?: number; // Ration quotidienne recommandée en kg
}> = {
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
    verrat: 'Verrats',
    porc_croissance: 'Porc en croissance',
  };
  return labels[type];
}

