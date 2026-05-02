/**
 * Entité Animal - Domaine Production
 *
 * Représente un animal dans le domaine métier
 * Contient uniquement la logique métier, pas d'accès à la base de données
 */

export interface Animal {
  id: string;
  code: string;
  nom?: string;
  projetId: string;
  sexe: 'male' | 'femelle' | 'indetermine';
  dateNaissance?: string;
  poidsInitial?: number;
  dateEntree?: string;
  actif: boolean;
  statut: 'actif' | 'mort' | 'vendu' | 'offert' | 'autre';
  race?: string;
  reproducteur: boolean;
  pereId?: string;
  mereId?: string;
  notes?: string;
  photoUri?: string;
  dateCreation: string;
  derniereModification: string;
}

/**
 * Logique métier de l'entité Animal
 */
export class AnimalEntity {
  constructor(private animal: Animal) {}

  /**
   * Vérifie si l'animal est un reproducteur actif
   */
  isReproducteurActif(): boolean {
    return this.animal.reproducteur && this.animal.actif && this.animal.statut === 'actif';
  }

  /**
   * Calcule l'âge de l'animal en jours
   */
  getAgeEnJours(): number | null {
    if (!this.animal.dateNaissance) {
      return null;
    }
    const naissance = new Date(this.animal.dateNaissance);
    const maintenant = new Date();
    const diffTime = maintenant.getTime() - naissance.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Vérifie si l'animal peut être utilisé pour la reproduction
   */
  peutReproduire(): boolean {
    if (!this.isReproducteurActif()) {
      return false;
    }
    const age = this.getAgeEnJours();
    if (age === null) {
      return false;
    }
    // Logique métier : minimum 8 mois pour la reproduction
    return age >= 240;
  }

  /**
   * Vérifie si l'animal est disponible pour la vente
   */
  estDisponiblePourVente(): boolean {
    return this.animal.actif && this.animal.statut === 'actif' && !this.animal.reproducteur;
  }
}
