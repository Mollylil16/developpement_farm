import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateSevrageDto {
  projet_id: string;
  gestation_id: string;
  date_sevrage: string;
  nombre_porcelets_sevres: number;
  poids_moyen_sevrage?: number;
  notes?: string;
}

@Injectable()
export class SevragesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateSevrageDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO sevrages (
        id, projet_id, gestation_id, date_sevrage, nombre_porcelets_sevres,
        poids_moyen_sevrage, notes, date_creation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        id, dto.projet_id, dto.gestation_id, dto.date_sevrage,
        dto.nombre_porcelets_sevres, dto.poids_moyen_sevrage || null,
        dto.notes || null, now,
      ],
    );

    return result.rows[0];
  }

  async findByProjet(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM sevrages WHERE projet_id = $1 ORDER BY date_sevrage DESC',
      [projetId],
    );
    return result.rows;
  }

  async findByGestation(gestationId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM sevrages WHERE gestation_id = $1 ORDER BY date_sevrage DESC',
      [gestationId],
    );
    return result.rows;
  }

  async findOne(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM sevrages WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async update(id: string, updates: Partial<CreateSevrageDto>): Promise<any> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    });

    if (updateFields.length === 0) {
      return this.findOne(id);
    }

    values.push(id);

    const result = await this.databaseService.query(
      `UPDATE sevrages SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  async findByDateRange(projetId: string, dateDebut: string, dateFin: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM sevrages WHERE projet_id = $1 AND date_sevrage >= $2 AND date_sevrage <= $3 ORDER BY date_sevrage DESC',
      [projetId, dateDebut, dateFin],
    );
    return result.rows;
  }

  async remove(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM sevrages WHERE id = $1', [id]);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

