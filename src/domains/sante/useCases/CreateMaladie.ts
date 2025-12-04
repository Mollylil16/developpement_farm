/**
 * Use Case : Créer une maladie
 * 
 * Orchestre la création d'une maladie avec validation métier
 */

import type { ISanteRepository } from '../repositories/ISanteRepository';
import type { Maladie } from '../entities/Maladie';
import { MaladieEntity } from '../entities/Maladie';
import uuid from 'react-native-uuid';

export interface CreateMaladieInput {
  projetId: string;
  animalId?: string;
  lotId?: string;
  type: 'diarrhee' | 'respiratoire' | 'gale_parasites' | 'fievre' | 'boiterie' | 'digestive' | 'cutanee' | 'reproduction' | 'neurologique' | 'autre';
  nomMaladie: string;
  gravite: 'faible' | 'moderee' | 'grave' | 'critique';
  dateDebut: string;
  symptomes: string;
  diagnostic?: string;
  contagieux?: boolean;
  nombreAnimauxAffectes?: number;
  nombreDeces?: number;
  veterinaire?: string;
  coutTraitement?: number;
  notes?: string;
}

export class CreateMaladieUseCase {
  constructor(private santeRepository: ISanteRepository) {}

  async execute(input: CreateMaladieInput): Promise<Maladie> {
    // Validation métier
    if (!input.projetId) {
      throw new Error('Le projet est requis');
    }

    if (!input.nomMaladie || input.nomMaladie.trim() === '') {
      throw new Error('Le nom de la maladie est requis');
    }

    if (!input.dateDebut) {
      throw new Error('La date de début est requise');
    }

    if (!input.symptomes || input.symptomes.trim() === '') {
      throw new Error('Les symptômes sont requis');
    }

    if (!input.animalId && !input.lotId) {
      throw new Error('Un animal ou un lot doit être spécifié');
    }

    // Vérifier que la date de début n'est pas dans le futur
    const dateDebut = new Date(input.dateDebut);
    const maintenant = new Date();
    if (dateDebut > maintenant) {
      throw new Error('La date de début ne peut pas être dans le futur');
    }

    // Si c'est critique, exiger un vétérinaire
    if (input.gravite === 'critique' && !input.veterinaire) {
      throw new Error('Une maladie critique nécessite l\'intervention d\'un vétérinaire');
    }

    // Créer la maladie
    const now = new Date().toISOString();
    const maladie: Maladie = {
      id: uuid.v4() as string,
      projetId: input.projetId,
      animalId: input.animalId,
      lotId: input.lotId,
      type: input.type,
      nomMaladie: input.nomMaladie.trim(),
      gravite: input.gravite,
      dateDebut: input.dateDebut,
      symptomes: input.symptomes.trim(),
      diagnostic: input.diagnostic?.trim(),
      contagieux: input.contagieux || false,
      nombreAnimauxAffectes: input.nombreAnimauxAffectes,
      nombreDeces: input.nombreDeces,
      veterinaire: input.veterinaire?.trim(),
      coutTraitement: input.coutTraitement,
      gueri: false,
      notes: input.notes?.trim(),
      dateCreation: now,
      derniereModification: now,
    };

    // Validation avec l'entité
    const maladieEntity = new MaladieEntity(maladie);
    
    // Si c'est critique, créer une alerte
    if (maladieEntity.isCritique()) {
      console.warn('⚠️ ALERTE: Maladie critique détectée:', maladie.nomMaladie);
    }

    // Sauvegarder
    return await this.santeRepository.createMaladie(maladie);
  }
}

