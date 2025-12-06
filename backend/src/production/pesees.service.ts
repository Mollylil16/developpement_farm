import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreatePeseeDto {
  projet_id: string;
  animal_id: string;
  date: string;
  poids_kg: number;
  gmq?: number;
  difference_standard?: number;
  commentaire?: string;
  cree_par?: string;
}

@Injectable()
export class PeseesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreatePeseeDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO production_pesees (
        id, projet_id, animal_id, date, poids_kg, gmq,
        difference_standard, commentaire, cree_par, date_creation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id, dto.projet_id, dto.animal_id, dto.date, dto.poids_kg,
        dto.gmq || null, dto.difference_standard || null,
        dto.commentaire || null, dto.cree_par || null, now,
      ],
    );

    return result.rows[0];
  }

  async findByProjet(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM production_pesees WHERE projet_id = $1 ORDER BY date DESC',
      [projetId],
    );
    return result.rows;
  }

  async findByAnimal(animalId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM production_pesees WHERE animal_id = $1 ORDER BY date DESC',
      [animalId],
    );
    return result.rows;
  }

  async findOne(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM production_pesees WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async update(id: string, updates: Partial<CreatePeseeDto>): Promise<any> {
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
      `UPDATE production_pesees SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  async findRecent(projetId: string, limit: number = 20): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM production_pesees WHERE projet_id = $1 ORDER BY date DESC LIMIT $2',
      [projetId, limit],
    );
    return result.rows;
  }

  async remove(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM production_pesees WHERE id = $1', [id]);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

