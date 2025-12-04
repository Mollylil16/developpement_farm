/**
 * Interface du repository Finance - Domaine Finance
 * 
 * Définit le contrat pour l'accès aux données financières
 */

import type { Depense } from '../entities/Depense';
import type { Revenu } from '../entities/Revenu';
import type { ChargeFixe } from '../entities/ChargeFixe';

export interface IFinanceRepository {
  // Depenses
  findDepenseById(id: string): Promise<Depense | null>;
  findDepensesByProjet(projetId: string): Promise<Depense[]>;
  findDepensesByPeriod(projetId: string, dateDebut: string, dateFin: string): Promise<Depense[]>;
  createDepense(depense: Omit<Depense, 'id' | 'dateCreation' | 'derniereModification'>): Promise<Depense>;
  updateDepense(id: string, updates: Partial<Depense>): Promise<Depense>;
  deleteDepense(id: string): Promise<void>;

  // Revenus
  findRevenuById(id: string): Promise<Revenu | null>;
  findRevenusByProjet(projetId: string): Promise<Revenu[]>;
  findRevenusByPeriod(projetId: string, dateDebut: string, dateFin: string): Promise<Revenu[]>;
  createRevenu(revenu: Omit<Revenu, 'id' | 'dateCreation' | 'derniereModification'>): Promise<Revenu>;
  updateRevenu(id: string, updates: Partial<Revenu>): Promise<Revenu>;
  deleteRevenu(id: string): Promise<void>;

  // Charges fixes
  findChargeFixeById(id: string): Promise<ChargeFixe | null>;
  findChargesFixesByProjet(projetId: string): Promise<ChargeFixe[]>;
  findChargesFixesActives(projetId: string): Promise<ChargeFixe[]>;
  createChargeFixe(charge: Omit<ChargeFixe, 'id' | 'dateCreation' | 'derniereModification'>): Promise<ChargeFixe>;
  updateChargeFixe(id: string, updates: Partial<ChargeFixe>): Promise<ChargeFixe>;
  deleteChargeFixe(id: string): Promise<void>;
}

