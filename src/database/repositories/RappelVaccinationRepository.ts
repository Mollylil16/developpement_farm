/**
 * RappelVaccinationRepository - Gestion des rappels de vaccination
 *
 * Utilise maintenant l'API REST du backend (PostgreSQL)
 */

import { BaseRepository } from './BaseRepository';
import { RappelVaccination } from '../../types/sante';

export interface CreateRappelVaccinationInput {
  vaccination_id: string;
  date_rappel: string;
  envoi?: boolean;
  date_envoi?: string;
}

export class RappelVaccinationRepository extends BaseRepository<RappelVaccination> {
  constructor() {
    super('rappels_vaccinations', '/sante/rappels-vaccinations');
  }

  private mapRow(row: unknown): RappelVaccination {
    return {
      id: row.id,
      vaccination_id: row.vaccination_id,
      date_rappel: row.date_rappel,
      envoi: Boolean(row.envoi),
      date_envoi: row.date_envoi || undefined,
    };
  }

  async create(input: CreateRappelVaccinationInput): Promise<RappelVaccination> {
    const rappelData = {
      vaccination_id: input.vaccination_id,
      date_rappel: input.date_rappel,
      envoi: input.envoi || false,
      date_envoi: input.date_envoi || null,
    };

    const created = await this.executePost<unknown>('/sante/rappels-vaccinations', rappelData);
    return this.mapRow(created);
  }

  async findById(id: string): Promise<RappelVaccination | null> {
    try {
      const row = await this.queryOne<unknown>(`/sante/rappels-vaccinations/${id}`);
      return row ? this.mapRow(row) : null;
    } catch (error) {
      console.error('Error finding rappel by id:', error);
      return null;
    }
  }

  async findByVaccination(vaccinationId: string): Promise<RappelVaccination[]> {
    try {
      const rows = await this.query<unknown>('/sante/rappels-vaccinations', { vaccination_id: vaccinationId });
      return rows.map(this.mapRow)
        .sort((a, b) => new Date(a.date_rappel).getTime() - new Date(b.date_rappel).getTime());
    } catch (error) {
      console.error('Error finding rappels by vaccination:', error);
      return [];
    }
  }

  async findAVenir(vaccinationIds: string[], joursAvance: number = 7): Promise<RappelVaccination[]> {
    try {
      if (vaccinationIds.length === 0) return [];

      const dateMax = new Date();
      dateMax.setDate(dateMax.getDate() + joursAvance);
      const now = new Date().toISOString();

      // Récupérer les rappels pour chaque vaccination
      const allRappels: RappelVaccination[] = [];
      for (const vaccinationId of vaccinationIds) {
        try {
          const rows = await this.query<unknown>('/sante/rappels-vaccinations', { vaccination_id: vaccinationId });
          allRappels.push(...rows.map(this.mapRow));
        } catch {
          // Ignorer les erreurs individuelles (vaccination peut ne pas avoir de rappels)
        }
      }

      return allRappels
        .filter(r => 
          r.date_rappel >= now &&
          r.date_rappel <= dateMax.toISOString() &&
          !r.envoi
        )
        .sort((a, b) => new Date(a.date_rappel).getTime() - new Date(b.date_rappel).getTime());
    } catch (error) {
      console.error('Error finding rappels a venir:', error);
      return [];
    }
  }

  async findEnRetard(vaccinationIds: string[]): Promise<RappelVaccination[]> {
    try {
      if (vaccinationIds.length === 0) return [];

      const now = new Date().toISOString();

      // Récupérer les rappels pour chaque vaccination
      const allRappels: RappelVaccination[] = [];
      for (const vaccinationId of vaccinationIds) {
        try {
          const rows = await this.query<unknown>('/sante/rappels-vaccinations', { vaccination_id: vaccinationId });
          allRappels.push(...rows.map(this.mapRow));
        } catch {
          // Ignorer les erreurs individuelles (vaccination peut ne pas avoir de rappels)
        }
      }
      
      return allRappels
        .filter(r => 
          r.date_rappel < now &&
          !r.envoi
        )
        .sort((a, b) => new Date(a.date_rappel).getTime() - new Date(b.date_rappel).getTime());
    } catch (error) {
      console.error('Error finding rappels en retard:', error);
      return [];
    }
  }

  async marquerEnvoye(id: string): Promise<RappelVaccination> {
    return this.update(id, {
      envoi: true,
      date_envoi: new Date().toISOString(),
    });
  }

  async update(id: string, updates: Partial<CreateRappelVaccinationInput>): Promise<RappelVaccination> {
    const updateData: Record<string, unknown> = {};

    if (updates.date_rappel !== undefined) updateData.date_rappel = updates.date_rappel;
    if (updates.envoi !== undefined) updateData.envoi = updates.envoi;
    if (updates.date_envoi !== undefined) updateData.date_envoi = updates.date_envoi || null;

    if (Object.keys(updateData).length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Rappel introuvable');
      }
      return existing;
    }

    const updated = await this.executePatch<unknown>(`/sante/rappels-vaccinations/${id}`, updateData);
    return this.mapRow(updated);
  }
}
