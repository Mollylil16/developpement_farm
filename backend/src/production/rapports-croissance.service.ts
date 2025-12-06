import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateRapportCroissanceDto {
  projet_id: string;
  date: string;
  poids_moyen: number;
  nombre_porcs: number;
  gain_quotidien?: number;
  poids_cible?: number;
  notes?: string;
}

@Injectable()
export class RapportsCroissanceService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateRapportCroissanceDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO rapports_croissance (
        id, projet_id, date, poids_moyen, nombre_porcs,
        gain_quotidien, poids_cible, notes, date_creation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        id, dto.projet_id, dto.date, dto.poids_moyen, dto.nombre_porcs,
        dto.gain_quotidien || null, dto.poids_cible || null,
        dto.notes || null, now,
      ],
    );

    return result.rows[0];
  }

  async findByProjet(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM rapports_croissance WHERE projet_id = $1 ORDER BY date DESC',
      [projetId],
    );
    return result.rows;
  }

  async findByDateRange(projetId: string, dateDebut: string, dateFin: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM rapports_croissance WHERE projet_id = $1 AND date >= $2 AND date <= $3 ORDER BY date DESC',
      [projetId, dateDebut, dateFin],
    );
    return result.rows;
  }

  async findOne(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM rapports_croissance WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async remove(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM rapports_croissance WHERE id = $1', [id]);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

