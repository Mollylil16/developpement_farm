/**
 * Use Case : Créer un revenu
 *
 * Orchestre la création d'un revenu avec validation métier
 */

import type { IFinanceRepository } from '../repositories/IFinanceRepository';
import type { Revenu } from '../entities/Revenu';
import { RevenuEntity } from '../entities/Revenu';
import uuid from 'react-native-uuid';

export interface CreateRevenuInput {
  projetId: string;
  montant: number;
  categorie: 'vente_porc' | 'vente_autre' | 'subvention' | 'autre';
  libelleCategorie?: string;
  date: string;
  description?: string;
  commentaire?: string;
  photos?: string[];
  poidsKg?: number;
  animalId?: string;
}

export class CreateRevenuUseCase {
  constructor(private financeRepository: IFinanceRepository) {}

  async execute(input: CreateRevenuInput): Promise<Revenu> {
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

    // Vérifier que la date n'est pas dans le futur
    const dateRevenu = new Date(input.date);
    const maintenant = new Date();
    if (dateRevenu > maintenant) {
      throw new Error('La date du revenu ne peut pas être dans le futur');
    }

    // Si c'est une vente de porc, le poids est recommandé
    if (input.categorie === 'vente_porc' && !input.poidsKg) {
      console.warn(
        '⚠️ Vente de porc sans poids spécifié - les calculs de coût/kg seront indisponibles'
      );
    }

    // Créer le revenu
    const now = new Date().toISOString();
    const revenu: Revenu = {
      id: uuid.v4(),
      projetId: input.projetId,
      montant: input.montant,
      categorie: input.categorie,
      libelleCategorie: input.libelleCategorie?.trim(),
      date: input.date,
      description: input.description?.trim(),
      commentaire: input.commentaire?.trim(),
      photos: input.photos,
      poidsKg: input.poidsKg,
      animalId: input.animalId,
      dateCreation: now,
      derniereModification: now,
    };

    // Validation avec l'entité
    const revenuEntity = new RevenuEntity(revenu);
    if (!revenuEntity.isValid()) {
      throw new Error("Le revenu n'est pas valide");
    }

    // Sauvegarder
    return await this.financeRepository.createRevenu(revenu);
  }
}
