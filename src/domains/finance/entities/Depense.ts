/**
 * Entité Depense - Domaine Finance
 *
 * Représente une dépense ponctuelle dans le domaine métier
 */

export interface Depense {
  id: string;
  projetId: string;
  montant: number;
  categorie: string;
  libelleCategorie?: string;
  date: string;
  commentaire?: string;
  photos?: string[];
  dateCreation: string;
  derniereModification: string;
}

/**
 * Logique métier de l'entité Depense
 */
export class DepenseEntity {
  constructor(private depense: Depense) {}

  /**
   * Vérifie si la dépense est valide
   */
  isValid(): boolean {
    return this.depense.montant > 0 && !!this.depense.date;
  }

  /**
   * Vérifie si la dépense est dans une période donnée
   */
  isInPeriod(dateDebut: string, dateFin: string): boolean {
    return this.depense.date >= dateDebut && this.depense.date <= dateFin;
  }

  /**
   * Calcule le montant TTC si un taux de TVA est fourni
   */
  calculateTTC(tauxTVA: number = 0): number {
    return this.depense.montant * (1 + tauxTVA / 100);
  }
}
