/**
 * Entité Maladie - Domaine Santé
 *
 * Représente une maladie dans le domaine métier
 */

export interface Maladie {
  id: string;
  projetId: string;
  animalId?: string;
  lotId?: string;
  type:
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
  nomMaladie: string;
  gravite: 'faible' | 'moderee' | 'grave' | 'critique';
  dateDebut: string;
  dateFin?: string;
  symptomes: string;
  diagnostic?: string;
  contagieux: boolean;
  nombreAnimauxAffectes?: number;
  nombreDeces?: number;
  veterinaire?: string;
  coutTraitement?: number;
  gueri: boolean;
  notes?: string;
  dateCreation: string;
  derniereModification: string;
}

/**
 * Logique métier de l'entité Maladie
 */
export class MaladieEntity {
  constructor(private maladie: Maladie) {}

  /**
   * Vérifie si la maladie est en cours
   */
  isEnCours(): boolean {
    return !this.maladie.dateFin && !this.maladie.gueri;
  }

  /**
   * Vérifie si la maladie est guérie
   */
  isGuerie(): boolean {
    return this.maladie.gueri;
  }

  /**
   * Vérifie si la maladie est critique
   */
  isCritique(): boolean {
    return this.maladie.gravite === 'critique';
  }

  /**
   * Calcule la durée de la maladie en jours
   */
  getDureeEnJours(): number | null {
    if (!this.maladie.dateDebut) {
      return null;
    }
    const dateDebut = new Date(this.maladie.dateDebut);
    const dateFin = this.maladie.dateFin ? new Date(this.maladie.dateFin) : new Date();
    const diffTime = dateFin.getTime() - dateDebut.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Vérifie si la maladie nécessite une intervention urgente
   */
  necessiteInterventionUrgente(): boolean {
    return this.isCritique() || (this.isEnCours() && this.maladie.contagieux);
  }
}
