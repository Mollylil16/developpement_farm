/**
 * Use Case : Créer une vaccination
 * 
 * Orchestre la création d'une vaccination avec validation métier
 */

import type { ISanteRepository } from '../repositories/ISanteRepository';
import type { Vaccination } from '../entities/Vaccination';
import { VaccinationEntity } from '../entities/Vaccination';
import uuid from 'react-native-uuid';

export interface CreateVaccinationInput {
  projetId: string;
  calendrierId?: string;
  animalId?: string;
  lotId?: string;
  vaccin?: string;
  nomVaccin?: string;
  dateVaccination: string;
  dateRappel?: string;
  numeroLotVaccin?: string;
  veterinaire?: string;
  cout?: number;
  statut?: 'planifie' | 'effectue' | 'en_retard' | 'annule';
  effetsSecondaires?: string;
  notes?: string;
  typeProphylaxie?: string;
  produitAdministre?: string;
  dosage?: string;
  uniteDosage?: string;
  raisonTraitement?: string;
}

export class CreateVaccinationUseCase {
  constructor(private santeRepository: ISanteRepository) {}

  async execute(input: CreateVaccinationInput): Promise<Vaccination> {
    // Validation métier
    if (!input.projetId) {
      throw new Error('Le projet est requis');
    }

    if (!input.dateVaccination) {
      throw new Error('La date de vaccination est requise');
    }

    if (!input.animalId && !input.lotId) {
      throw new Error('Un animal ou un lot doit être spécifié');
    }

    // Vérifier que la date de rappel est après la date de vaccination
    if (input.dateRappel && input.dateVaccination) {
      const dateVaccination = new Date(input.dateVaccination);
      const dateRappel = new Date(input.dateRappel);
      if (dateRappel <= dateVaccination) {
        throw new Error('La date de rappel doit être après la date de vaccination');
      }
    }

    // Créer la vaccination
    const now = new Date().toISOString();
    const vaccination: Vaccination = {
      id: uuid.v4() as string,
      projetId: input.projetId,
      calendrierId: input.calendrierId,
      animalId: input.animalId,
      lotId: input.lotId,
      vaccin: input.vaccin,
      nomVaccin: input.nomVaccin?.trim(),
      dateVaccination: input.dateVaccination,
      dateRappel: input.dateRappel,
      numeroLotVaccin: input.numeroLotVaccin?.trim(),
      veterinaire: input.veterinaire?.trim(),
      cout: input.cout,
      statut: input.statut || 'planifie',
      effetsSecondaires: input.effetsSecondaires?.trim(),
      notes: input.notes?.trim(),
      typeProphylaxie: input.typeProphylaxie || 'vitamine',
      produitAdministre: input.produitAdministre?.trim(),
      dosage: input.dosage?.trim(),
      uniteDosage: input.uniteDosage || 'ml',
      raisonTraitement: input.raisonTraitement || 'suivi_normal',
      dateCreation: now,
      derniereModification: now,
    };

    // Sauvegarder
    return await this.santeRepository.createVaccination(vaccination);
  }
}

