/**
 * Entité ChargeFixe - Domaine Finance
 * 
 * Représente une charge fixe récurrente
 */

export interface ChargeFixe {
  id: string;
  projetId?: string;
  categorie: string;
  libelle: string;
  montant: number;
  dateDebut: string;
  frequence: 'mensuel' | 'trimestriel' | 'annuel';
  jourPaiement?: number;
  notes?: string;
  statut: 'actif' | 'suspendu' | 'termine';
  dateCreation: string;
  derniereModification: string;
}

/**
 * Logique métier de l'entité ChargeFixe
 */
export class ChargeFixeEntity {
  constructor(private chargeFixe: ChargeFixe) {}

  /**
   * Vérifie si la charge est active
   */
  isActive(): boolean {
    return this.chargeFixe.statut === 'actif';
  }

  /**
   * Calcule le montant annuel de la charge
   */
  getMontantAnnuel(): number {
    switch (this.chargeFixe.frequence) {
      case 'mensuel':
        return this.chargeFixe.montant * 12;
      case 'trimestriel':
        return this.chargeFixe.montant * 4;
      case 'annuel':
        return this.chargeFixe.montant;
      default:
        return 0;
    }
  }

  /**
   * Vérifie si un paiement est dû pour une date donnée
   */
  isPaiementDu(date: string): boolean {
    if (!this.isActive()) {
      return false;
    }

    const dateObj = new Date(date);
    const jour = dateObj.getDate();

    if (this.chargeFixe.jourPaiement && jour !== this.chargeFixe.jourPaiement) {
      return false;
    }

    // Logique simplifiée - à améliorer selon les besoins
    return true;
  }
}

