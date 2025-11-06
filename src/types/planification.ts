/**
 * Types pour la gestion de la planification
 */

export type TypeTache =
  | 'saillie'
  | 'vaccination'
  | 'sevrage'
  | 'nettoyage'
  | 'alimentation'
  | 'veterinaire'
  | 'autre';

export type StatutTache = 'a_faire' | 'en_cours' | 'terminee' | 'annulee';

export interface Planification {
  id: string;
  projet_id: string;
  type: TypeTache;
  titre: string; // Titre de la tâche
  description?: string; // Description détaillée
  date_prevue: string; // Date ISO
  date_echeance?: string; // Date ISO (optionnelle)
  rappel?: string; // Date ISO pour le rappel (optionnelle)
  statut: StatutTache;
  recurrence?: 'aucune' | 'quotidienne' | 'hebdomadaire' | 'mensuelle'; // Récurrence optionnelle
  lien_gestation_id?: string; // Lien optionnel avec une gestation
  lien_sevrage_id?: string; // Lien optionnel avec un sevrage
  notes?: string;
  date_creation: string;
  derniere_modification: string;
}

export interface CreatePlanificationInput {
  projet_id: string;
  type: TypeTache;
  titre: string;
  description?: string;
  date_prevue: string;
  date_echeance?: string;
  rappel?: string;
  recurrence?: 'aucune' | 'quotidienne' | 'hebdomadaire' | 'mensuelle';
  lien_gestation_id?: string;
  lien_sevrage_id?: string;
  notes?: string;
}

export interface UpdatePlanificationInput {
  type?: TypeTache;
  titre?: string;
  description?: string;
  date_prevue?: string;
  date_echeance?: string;
  rappel?: string;
  statut?: StatutTache;
  recurrence?: 'aucune' | 'quotidienne' | 'hebdomadaire' | 'mensuelle';
  lien_gestation_id?: string;
  lien_sevrage_id?: string;
  notes?: string;
}

/**
 * Labels pour les types de tâches
 */
export const TYPE_TACHE_LABELS: Record<TypeTache, string> = {
  saillie: 'Saillie',
  vaccination: 'Vaccination',
  sevrage: 'Sevrage',
  nettoyage: 'Nettoyage',
  alimentation: 'Alimentation',
  veterinaire: 'Vétérinaire',
  autre: 'Autre',
};

/**
 * Labels pour les statuts
 */
export const STATUT_TACHE_LABELS: Record<StatutTache, string> = {
  a_faire: 'À faire',
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée',
};

/**
 * Fonction pour obtenir les tâches à venir (dans les 7 prochains jours)
 */
export function getTachesAVenir(planifications: Planification[]): Planification[] {
  const aujourdhui = new Date();
  const dans7Jours = new Date();
  dans7Jours.setDate(aujourdhui.getDate() + 7);

  return planifications.filter((p) => {
    const datePrevue = new Date(p.date_prevue);
    return (
      datePrevue >= aujourdhui &&
      datePrevue <= dans7Jours &&
      (p.statut === 'a_faire' || p.statut === 'en_cours')
    );
  });
}

/**
 * Fonction pour obtenir les tâches en retard
 */
export function getTachesEnRetard(planifications: Planification[]): Planification[] {
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);

  return planifications.filter((p) => {
    const datePrevue = new Date(p.date_prevue);
    datePrevue.setHours(0, 0, 0, 0);
    return (
      datePrevue < aujourdhui &&
      (p.statut === 'a_faire' || p.statut === 'en_cours')
    );
  });
}
