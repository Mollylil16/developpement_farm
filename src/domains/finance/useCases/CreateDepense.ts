/**
 * Use Case : Créer une dépense
 *
 * Orchestre la création d'une dépense avec validation métier
 */

import type { IFinanceRepository } from '../repositories/IFinanceRepository';
import type { Depense } from '../entities/Depense';
import { DepenseEntity } from '../entities/Depense';
import uuid from 'react-native-uuid';

export interface CreateDepenseInput {
  projetId: string;
  montant: number;
  categorie: string;
  libelleCategorie?: string;
  date: string;
  commentaire?: string;
  photos?: string[];
}

export class CreateDepenseUseCase {
  constructor(private financeRepository: IFinanceRepository) {}

  async execute(input: CreateDepenseInput): Promise<Depense> {
    // Validation métier
    if (!input.projetId) {
      throw new Error('Le projet est requis');
    }

    if (!input.montant || input.montant <= 0) {
      throw new Error('Le montant doit être supérieur à 0');
    }

    if (!input.date) {
      throw new Error('La date est requise');
    }

    if (!input.categorie || input.categorie.trim() === '') {
      throw new Error('La catégorie est requise');
    }

    // Vérifier que la date n'est pas dans le futur
    const dateDepense = new Date(input.date);
    const maintenant = new Date();
    if (dateDepense > maintenant) {
      throw new Error('La date de la dépense ne peut pas être dans le futur');
    }

    // Créer la dépense
    const now = new Date().toISOString();
    const depense: Depense = {
      id: uuid.v4(),
      projetId: input.projetId,
      montant: input.montant,
      categorie: input.categorie.trim(),
      libelleCategorie: input.libelleCategorie?.trim(),
      date: input.date,
      commentaire: input.commentaire?.trim(),
      photos: input.photos,
      dateCreation: now,
      derniereModification: now,
    };

    // Validation avec l'entité
    const depenseEntity = new DepenseEntity(depense);
    if (!depenseEntity.isValid()) {
      throw new Error("La dépense n'est pas valide");
    }

    // Sauvegarder
    return await this.financeRepository.createDepense(depense);
  }
}
