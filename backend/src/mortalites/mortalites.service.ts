import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateMortaliteDto {
  projet_id: string;
  nombre_porcs: number;
  date: string;
  cause?: string;
  categorie: 'porcelet' | 'truie' | 'verrat' | 'autre';
  animal_code?: string;
  notes?: string;
}

@Injectable()
export class MortalitesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateMortaliteDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO mortalites (
        id, projet_id, nombre_porcs, date, cause, categorie,
        animal_code, notes, date_creation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        id, dto.projet_id, dto.nombre_porcs, dto.date,
        dto.cause || null, dto.categorie, dto.animal_code || null,
        dto.notes || null, now,
      ],
    );

    return result.rows[0];
  }

  async findByProjet(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM mortalites WHERE projet_id = $1 ORDER BY date DESC',
      [projetId],
    );
    return result.rows;
  }

  async findOne(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM mortalites WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async update(id: string, updates: Partial<CreateMortaliteDto>): Promise<any> {
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
      `UPDATE mortalites SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  async findByDateRange(projetId: string, dateDebut: string, dateFin: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM mortalites WHERE projet_id = $1 AND date >= $2 AND date <= $3 ORDER BY date DESC',
      [projetId, dateDebut, dateFin],
    );
    return result.rows;
  }

  async findByCategorie(projetId: string, categorie: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM mortalites WHERE projet_id = $1 AND categorie = $2 ORDER BY date DESC',
      [projetId, categorie],
    );
    return result.rows;
  }

  async getStatistiques(projetId: string): Promise<any> {
    const total = await this.databaseService.query(
      'SELECT COUNT(*) as count, SUM(nombre_porcs) as total_porcs FROM mortalites WHERE projet_id = $1',
      [projetId],
    );

    const parCategorie = await this.databaseService.query(
      'SELECT categorie, COUNT(*) as count, SUM(nombre_porcs) as total FROM mortalites WHERE projet_id = $1 GROUP BY categorie',
      [projetId],
    );

    const parCause = await this.databaseService.query(
      'SELECT cause, COUNT(*) as count, SUM(nombre_porcs) as total FROM mortalites WHERE projet_id = $1 AND cause IS NOT NULL GROUP BY cause',
      [projetId],
    );

    return {
      total: total.rows[0]?.count || 0,
      total_porcs: total.rows[0]?.total_porcs || 0,
      par_categorie: parCategorie.rows,
      par_cause: parCause.rows,
    };
  }

  async getTauxParCause(projetId: string): Promise<any[]> {
    const total = await this.databaseService.query(
      'SELECT COUNT(*) as count FROM mortalites WHERE projet_id = $1',
      [projetId],
    );

    const parCause = await this.databaseService.query(
      'SELECT cause, COUNT(*) as count FROM mortalites WHERE projet_id = $1 AND cause IS NOT NULL GROUP BY cause ORDER BY count DESC',
      [projetId],
    );

    const totalCount = total.rows[0]?.count || 0;

    return parCause.rows.map((item: any) => ({
      cause: item.cause,
      nombre: item.count,
      pourcentage: totalCount > 0 ? (item.count / totalCount) * 100 : 0,
    }));
  }

  async remove(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM mortalites WHERE id = $1', [id]);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

