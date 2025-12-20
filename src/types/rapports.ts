/**
 * Types pour les rapports et analytics
 */

export interface RapportCroissance {
  id: string;
  projet_id: string;
  date: string; // Date ISO
  poids_moyen: number; // Poids moyen en kg
  nombre_porcs: number; // Nombre de porcs suivis
  gain_quotidien?: number; // Gain quotidien en kg
  poids_cible?: number; // Poids cible en kg
  notes?: string;
  date_creation: string;
}

export interface IndicateursPerformance {
  taux_mortalite: number; // Pourcentage
  taux_croissance: number; // Pourcentage (basé sur le gain de poids réel)
  efficacite_alimentaire: number; // Ratio gain_poids / alimentation_consommee (en kg)
  indice_consommation?: number; // IC = alimentation_consommee / gain_poids (en kg)
  cout_production_kg?: number; // Coût de production par kg en CFA (optionnel, calculé côté frontend)
  nombre_porcs_total: number;
  nombre_porcs_vivants: number;
  nombre_porcs_morts: number;
  poids_total: number; // Poids total en kg
  alimentation_totale: number; // Alimentation totale consommée en kg
  gain_poids_total?: number; // Gain de poids total en kg sur la période
  periode_jours?: number; // Période de calcul en jours
  date_debut?: string; // Date de début de la période
  date_fin?: string; // Date de fin de la période
}

export interface CreateRapportCroissanceInput {
  projet_id: string;
  date: string;
  poids_moyen: number;
  nombre_porcs: number;
  gain_quotidien?: number;
  poids_cible?: number;
  notes?: string;
}

/**
 * Interface pour les recommandations
 */
export interface Recommandation {
  id: string;
  type: 'avertissement' | 'information' | 'succes';
  titre: string;
  message: string;
  action?: string; // Action suggérée
}
