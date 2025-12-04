/**
 * Use Case : Mettre à jour un animal
 * 
 * Orchestre la mise à jour d'un animal avec validation métier
 */

import type { IAnimalRepository } from '../repositories/IAnimalRepository';
import type { Animal } from '../entities/Animal';
import { AnimalEntity } from '../entities/Animal';

export interface UpdateAnimalInput {
  id: string;
  code?: string;
  nom?: string;
  sexe?: 'male' | 'femelle' | 'indetermine';
  dateNaissance?: string;
  poidsInitial?: number;
  actif?: boolean;
  statut?: 'actif' | 'mort' | 'vendu' | 'offert' | 'autre';
  race?: string;
  reproducteur?: boolean;
  pereId?: string;
  mereId?: string;
  notes?: string;
  photoUri?: string;
}

export class UpdateAnimalUseCase {
  constructor(private animalRepository: IAnimalRepository) {}

  async execute(input: UpdateAnimalInput): Promise<Animal> {
    // Récupérer l'animal existant
    const animal = await this.animalRepository.findById(input.id);
    if (!animal) {
      throw new Error(`Animal avec l'ID ${input.id} introuvable`);
    }

    // Validation métier
    if (input.code && input.code.trim() === '') {
      throw new Error('Le code de l\'animal ne peut pas être vide');
    }

    // Vérifier l'unicité du code si modifié
    if (input.code && input.code !== animal.code) {
      const existingAnimals = await this.animalRepository.findByProjet(animal.projetId);
      const codeExists = existingAnimals.some(a => a.code === input.code && a.id !== input.id);
      if (codeExists) {
        throw new Error(`Un animal avec le code ${input.code} existe déjà dans ce projet`);
      }
    }

    // Vérifier les parents si modifiés
    if (input.pereId) {
      const pere = await this.animalRepository.findById(input.pereId);
      if (!pere) {
        throw new Error('Le père spécifié n\'existe pas');
      }
      if (pere.sexe !== 'male') {
        throw new Error('Le père doit être un mâle');
      }
    }

    if (input.mereId) {
      const mere = await this.animalRepository.findById(input.mereId);
      if (!mere) {
        throw new Error('La mère spécifiée n\'existe pas');
      }
      if (mere.sexe !== 'femelle') {
        throw new Error('La mère doit être une femelle');
      }
    }

    // Préparer les mises à jour
    const updates: Partial<Animal> = {
      ...input,
      derniereModification: new Date().toISOString(),
    };

    // Si on désactive l'animal, mettre le statut approprié
    if (input.actif === false && animal.actif) {
      if (!updates.statut) {
        updates.statut = 'autre';
      }
    }

    // Si on change le statut à "mort", désactiver
    if (input.statut === 'mort' && animal.statut !== 'mort') {
      updates.actif = false;
    }

    // Mettre à jour
    const updated = await this.animalRepository.update(input.id, updates);

    // Validation avec l'entité
    const animalEntity = new AnimalEntity(updated);
    
    // Si on essaie de rendre un animal reproducteur, vérifier qu'il peut reproduire
    if (input.reproducteur === true && !animal.reproducteur) {
      if (!animalEntity.peutReproduire()) {
        throw new Error('L\'animal est trop jeune pour être reproducteur (minimum 8 mois)');
      }
    }

    return updated;
  }
}

