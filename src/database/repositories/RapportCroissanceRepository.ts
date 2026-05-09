/**
 * Repository pour la gestion des rapports de croissance
 */

import { BaseRepository } from './BaseRepository';
import { RapportCroissance, CreateRapportCroissanceInput } from '../../types/rapports';

export class RapportCroissanceRepository extends BaseRepository<RapportCroissance> {
  constructor() {
    super('rapports_croissance', '/rapports/croissance');
  }

  async create(input: CreateRapportCroissanceInput): Promise<RapportCroissance> {
    return this.executePost<RapportCroissance>(this.apiBasePath, input);
  }

  async update(id: string, data: Partial<RapportCroissance>): Promise<RapportCroissance> {
    return this.executePatch<RapportCroissance>(`${this.apiBasePath}/${id}`, data);
  }

  async findById(id: string): Promise<RapportCroissance | null> {
    return this.queryOne<RapportCroissance>(`${this.apiBasePath}/${id}`);
  }

  async findAll(): Promise<RapportCroissance[]> {
    return this.query<RapportCroissance>(this.apiBasePath);
  }

  async findByProjet(projetId: string): Promise<RapportCroissance[]> {
    return this.query<RapportCroissance>(this.apiBasePath, { projet_id: projetId });
  }

  async findByDateRange(dateDebut: string, dateFin: string): Promise<RapportCroissance[]> {
    return this.query<RapportCroissance>(this.apiBasePath, { date_debut: dateDebut, date_fin: dateFin });
  }

  async delete(id: string): Promise<void> {
    await this.executeDelete(`${this.apiBasePath}/${id}`);
  }
}
