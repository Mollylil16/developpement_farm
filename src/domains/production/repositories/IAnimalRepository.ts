/**
 * Interface du repository Animal - Domaine Production
 * 
 * Définit le contrat pour l'accès aux données des animaux
 * L'implémentation concrète est dans infrastructure/database/
 */

import type { Animal } from '../entities/Animal';

export interface IAnimalRepository {
  /**
   * Récupère un animal par son ID
   */
  findById(id: string): Promise<Animal | null>;

  /**
   * Récupère tous les animaux d'un projet
   */
  findByProjet(projetId: string): Promise<Animal[]>;

  /**
   * Récupère les animaux actifs d'un projet
   */
  findActifsByProjet(projetId: string): Promise<Animal[]>;

  /**
   * Crée un nouvel animal
   */
  create(animal: Omit<Animal, 'id' | 'dateCreation' | 'derniereModification'>): Promise<Animal>;

  /**
   * Met à jour un animal
   */
  update(id: string, updates: Partial<Animal>): Promise<Animal>;

  /**
   * Supprime un animal
   */
  delete(id: string): Promise<void>;

  /**
   * Récupère les animaux reproducteurs actifs
   */
  findReproducteursActifs(projetId: string): Promise<Animal[]>;
}

