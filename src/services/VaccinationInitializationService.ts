/**
 * Service pour initialiser les protocoles de vaccination standard
 * 
 * Responsabilités:
 * - Créer les protocoles de vaccination standard pour un nouveau projet
 */

import * as SQLite from 'expo-sqlite';
import { CalendrierVaccinationRepository } from '../database/repositories/CalendrierVaccinationRepository';
import { PROTOCOLES_VACCINATION_STANDARD } from '../types/sante';

export class VaccinationInitializationService {
  private db: SQLite.SQLiteDatabase;

  constructor(db: SQLite.SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Initialise les protocoles de vaccination standard pour un projet
   */
  async initProtocolesVaccinationStandard(projetId: string): Promise<void> {
    const calendrierRepo = new CalendrierVaccinationRepository(this.db);

    for (const protocole of PROTOCOLES_VACCINATION_STANDARD) {
      await calendrierRepo.create({
        projet_id: projetId,
        ...protocole,
      });
    }
  }
}

