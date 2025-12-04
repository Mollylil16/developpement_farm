/**
 * Interface du repository Santé - Domaine Santé
 * 
 * Définit le contrat pour l'accès aux données sanitaires
 */

import type { Vaccination } from '../entities/Vaccination';
import type { Maladie } from '../entities/Maladie';

export interface ISanteRepository {
  // Vaccinations
  findVaccinationById(id: string): Promise<Vaccination | null>;
  findVaccinationsByProjet(projetId: string): Promise<Vaccination[]>;
  findVaccinationsByAnimal(animalId: string): Promise<Vaccination[]>;
  findVaccinationsEnRetard(projetId: string): Promise<Vaccination[]>;
  createVaccination(vaccination: Omit<Vaccination, 'id' | 'dateCreation' | 'derniereModification'>): Promise<Vaccination>;
  updateVaccination(id: string, updates: Partial<Vaccination>): Promise<Vaccination>;
  deleteVaccination(id: string): Promise<void>;

  // Maladies
  findMaladieById(id: string): Promise<Maladie | null>;
  findMaladiesByProjet(projetId: string): Promise<Maladie[]>;
  findMaladiesByAnimal(animalId: string): Promise<Maladie[]>;
  findMaladiesEnCours(projetId: string): Promise<Maladie[]>;
  createMaladie(maladie: Omit<Maladie, 'id' | 'dateCreation' | 'derniereModification'>): Promise<Maladie>;
  updateMaladie(id: string, updates: Partial<Maladie>): Promise<Maladie>;
  deleteMaladie(id: string): Promise<void>;
}

