/**
 * Entité Revenu - Domaine Finance
 *
 * Représente un revenu dans le domaine métier
 */

export interface Revenu {
  id: string;
  projetId: string;
  montant: number;
  categorie: 'vente_porc' | 'vente_autre' | 'subvention' | 'autre';
  libelleCategorie?: string;
  date: string;
  description?: string;
  commentaire?: string;
  photos?: string[];
  poidsKg?: number;
  animalId?: string;
  coutKgOpex?: number;
  coutKgComplet?: number;
  coutReelOpex?: number;
  coutReelComplet?: number;
  margeOpex?: number;
  margeComplete?: number;
  margeOpexPourcent?: number;
  margeCompletePourcent?: number;
  dateCreation: string;
  derniereModification: string;
}

/**
 * Logique métier de l'entité Revenu
 */
export class RevenuEntity {
  constructor(private revenu: Revenu) {}

  /**
   * Vérifie si le revenu est valide
   */
  isValid(): boolean {
    return this.revenu.montant > 0 && !!this.revenu.date;
  }

  /**
   * Calcule la marge si les coûts sont disponibles
   */
  calculateMarge(): { opex?: number; complete?: number } {
    const result: { opex?: number; complete?: number } = {};

    if (this.revenu.coutReelOpex !== undefined) {
      result.opex = this.revenu.montant - this.revenu.coutReelOpex;
    }

    if (this.revenu.coutReelComplet !== undefined) {
      result.complete = this.revenu.montant - this.revenu.coutReelComplet;
    }

    return result;
  }

  /**
   * Calcule le prix au kg si le poids est disponible
   */
  getPrixAuKg(): number | null {
    if (!this.revenu.poidsKg || this.revenu.poidsKg <= 0) {
      return null;
    }
    return this.revenu.montant / this.revenu.poidsKg;
  }

  /**
   * Vérifie si c'est une vente de porc
   */
  isVentePorc(): boolean {
    return this.revenu.categorie === 'vente_porc';
  }
}
