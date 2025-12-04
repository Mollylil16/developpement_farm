/**
 * Entité Vaccination - Domaine Santé
 * 
 * Représente une vaccination dans le domaine métier
 */

export interface Vaccination {
  id: string;
  projetId: string;
  calendrierId?: string;
  animalId?: string;
  lotId?: string;
  vaccin?: string;
  nomVaccin?: string;
  dateVaccination: string;
  dateRappel?: string;
  numeroLotVaccin?: string;
  veterinaire?: string;
  cout?: number;
  statut: 'planifie' | 'effectue' | 'en_retard' | 'annule';
  effetsSecondaires?: string;
  notes?: string;
  animalIds?: string;
  typeProphylaxie?: string;
  produitAdministre?: string;
  photoFlacon?: string;
  dosage?: string;
  uniteDosage?: string;
  raisonTraitement?: string;
  raisonAutre?: string;
  dateCreation: string;
  derniereModification: string;
}

/**
 * Logique métier de l'entité Vaccination
 */
export class VaccinationEntity {
  constructor(private vaccination: Vaccination) {}

  /**
   * Vérifie si la vaccination est effectuée
   */
  isEffectuee(): boolean {
    return this.vaccination.statut === 'effectue';
  }

  /**
   * Vérifie si la vaccination est en retard
   */
  isEnRetard(): boolean {
    if (this.vaccination.statut !== 'en_retard') {
      return false;
    }
    if (!this.vaccination.dateVaccination) {
      return false;
    }
    const dateVaccination = new Date(this.vaccination.dateVaccination);
    const maintenant = new Date();
    return maintenant > dateVaccination;
  }

  /**
   * Vérifie si un rappel est nécessaire
   */
  isRappelNecessaire(): boolean {
    if (!this.vaccination.dateRappel) {
      return false;
    }
    const dateRappel = new Date(this.vaccination.dateRappel);
    const maintenant = new Date();
    return maintenant >= dateRappel && !this.isRappelEffectue();
  }

  /**
   * Vérifie si le rappel a été effectué
   */
  isRappelEffectue(): boolean {
    // Logique simplifiée - à améliorer selon les besoins
    return this.isEffectuee() && !!this.vaccination.dateRappel;
  }

  /**
   * Calcule le nombre de jours depuis la vaccination
   */
  getJoursDepuisVaccination(): number | null {
    if (!this.vaccination.dateVaccination) {
      return null;
    }
    const dateVaccination = new Date(this.vaccination.dateVaccination);
    const maintenant = new Date();
    const diffTime = maintenant.getTime() - dateVaccination.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
}

