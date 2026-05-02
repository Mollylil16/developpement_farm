/**
 * Use Case : Créer un animal
 *
 * Orchestre la création d'un animal avec validation métier
 */

import type { IAnimalRepository } from '../repositories/IAnimalRepository';
import type { Animal } from '../entities/Animal';
import { AnimalEntity } from '../entities/Animal';
import uuid from 'react-native-uuid';

export interface CreateAnimalInput {
  code: string;
  nom?: string;
  projetId: string;
  sexe: 'male' | 'femelle' | 'indetermine';
  dateNaissance?: string;
  poidsInitial?: number;
  race?: string;
  reproducteur?: boolean;
  pereId?: string;
  mereId?: string;
  notes?: string;
}

export class CreateAnimalUseCase {
  constructor(private animalRepository: IAnimalRepository) {}

  async execute(input: CreateAnimalInput): Promise<Animal> {
    // Validation métier
    if (!input.code || input.code.trim() === '') {
      throw new Error("Le code de l'animal est requis");
    }

    if (!input.projetId) {
      throw new Error('Le projet est requis');
    }

    // Vérifier que le code n'existe pas déjà dans le projet
    const existingAnimals = await this.animalRepository.findByProjet(input.projetId);
    const codeExists = existingAnimals.some((a) => a.code === input.code);
    if (codeExists) {
      throw new Error(`Un animal avec le code ${input.code} existe déjà dans ce projet`);
    }

    // Vérifier les parents si spécifiés
    if (input.pereId) {
      const pere = await this.animalRepository.findById(input.pereId);
      if (!pere) {
        throw new Error("Le père spécifié n'existe pas");
      }
      if (pere.sexe !== 'male') {
        throw new Error('Le père doit être un mâle');
      }
    }

    if (input.mereId) {
      const mere = await this.animalRepository.findById(input.mereId);
      if (!mere) {
        throw new Error("La mère spécifiée n'existe pas");
      }
      if (mere.sexe !== 'femelle') {
        throw new Error('La mère doit être une femelle');
      }
    }

    // Créer l'animal
    const now = new Date().toISOString();
    const animal: Animal = {
      id: uuid.v4(),
      code: input.code.trim(),
      nom: input.nom?.trim(),
      projetId: input.projetId,
      sexe: input.sexe,
      dateNaissance: input.dateNaissance,
      poidsInitial: input.poidsInitial,
      dateEntree: input.dateNaissance || now,
      actif: true,
      statut: 'actif',
      race: input.race,
      reproducteur: input.reproducteur || false,
      pereId: input.pereId,
      mereId: input.mereId,
      notes: input.notes,
      dateCreation: now,
      derniereModification: now,
    };

    // Validation avec l'entité
    const animalEntity = new AnimalEntity(animal);

    // Si c'est un reproducteur, vérifier qu'il peut reproduire
    if (animal.reproducteur && !animalEntity.peutReproduire()) {
      throw new Error("L'animal est trop jeune pour être reproducteur (minimum 8 mois)");
    }

    // Sauvegarder
    return await this.animalRepository.create(animal);
  }
}
