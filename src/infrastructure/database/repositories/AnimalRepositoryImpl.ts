/**
 * Implémentation concrète du repository Animal
 * 
 * Utilise le repository existant de la base de données
 */

import type { IAnimalRepository } from '../../../domains/production/repositories/IAnimalRepository';
import type { Animal } from '../../../domains/production/entities/Animal';
import { AnimalRepository } from '../../../database/repositories/AnimalRepository';
import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Implémentation du repository Animal utilisant la base de données
 */
export class AnimalRepositoryImpl implements IAnimalRepository {
  private repository: AnimalRepository;

  constructor(db: SQLiteDatabase) {
    this.repository = new AnimalRepository(db);
  }

  async findById(id: string): Promise<Animal | null> {
    const animal = await this.repository.findById(id);
    if (!animal) {
      return null;
    }
    return this.mapToDomain(animal);
  }

  async findByProjet(projetId: string): Promise<Animal[]> {
    const animaux = await this.repository.findByProjet(projetId);
    return animaux.map(a => this.mapToDomain(a));
  }

  async findActifsByProjet(projetId: string): Promise<Animal[]> {
    const animaux = await this.repository.findActifsByProjet(projetId);
    return animaux.map(a => this.mapToDomain(a));
  }

  async create(animal: Omit<Animal, 'id' | 'dateCreation' | 'derniereModification'>): Promise<Animal> {
    const created = await this.repository.create({
      code: animal.code,
      nom: animal.nom,
      projet_id: animal.projetId,
      sexe: animal.sexe,
      date_naissance: animal.dateNaissance,
      poids_initial: animal.poidsInitial,
      date_entree: animal.dateEntree,
      actif: animal.actif ? 1 : 0,
      statut: animal.statut,
      race: animal.race,
      reproducteur: animal.reproducteur ? 1 : 0,
      pere_id: animal.pereId,
      mere_id: animal.mereId,
      notes: animal.notes,
      photo_uri: animal.photoUri,
    });
    return this.mapToDomain(created);
  }

  async update(id: string, updates: Partial<Animal>): Promise<Animal> {
    const updated = await this.repository.update(id, {
      code: updates.code,
      nom: updates.nom,
      sexe: updates.sexe,
      date_naissance: updates.dateNaissance,
      poids_initial: updates.poidsInitial,
      actif: updates.actif !== undefined ? (updates.actif ? 1 : 0) : undefined,
      statut: updates.statut,
      race: updates.race,
      reproducteur: updates.reproducteur !== undefined ? (updates.reproducteur ? 1 : 0) : undefined,
      pere_id: updates.pereId,
      mere_id: updates.mereId,
      notes: updates.notes,
      photo_uri: updates.photoUri,
    });
    return this.mapToDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.repository.deleteById(id);
  }

  async findReproducteursActifs(projetId: string): Promise<Animal[]> {
    const animaux = await this.repository.findReproducteursActifs(projetId);
    return animaux.map(a => this.mapToDomain(a));
  }

  /**
   * Mappe l'entité de la base de données vers l'entité du domaine
   */
  private mapToDomain(dbAnimal: any): Animal {
    return {
      id: dbAnimal.id,
      code: dbAnimal.code,
      nom: dbAnimal.nom,
      projetId: dbAnimal.projet_id,
      sexe: dbAnimal.sexe,
      dateNaissance: dbAnimal.date_naissance,
      poidsInitial: dbAnimal.poids_initial,
      dateEntree: dbAnimal.date_entree,
      actif: dbAnimal.actif === 1,
      statut: dbAnimal.statut,
      race: dbAnimal.race,
      reproducteur: dbAnimal.reproducteur === 1,
      pereId: dbAnimal.pere_id,
      mereId: dbAnimal.mere_id,
      notes: dbAnimal.notes,
      photoUri: dbAnimal.photo_uri,
      dateCreation: dbAnimal.date_creation,
      derniereModification: dbAnimal.derniere_modification,
    };
  }
}

