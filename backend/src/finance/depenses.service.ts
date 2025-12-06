import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateDepenseDto {
  projet_id: string;
  montant: number;
  categorie: string;
  libelle_categorie?: string;
  date: string;
  commentaire?: string;
  photos?: string;
}

@Injectable()
export class DepensesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateDepenseDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO depenses_ponctuelles (
        id, projet_id, montant, categorie, libelle_categorie, date,
        commentaire, photos, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id, dto.projet_id, dto.montant, dto.categorie,
        dto.libelle_categorie || null, dto.date, dto.commentaire || null,
        dto.photos || null, now, now,
      ],
    );

    return result.rows[0];
  }

  async findByProjet(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM depenses_ponctuelles WHERE projet_id = $1 ORDER BY date DESC',
      [projetId],
    );
    return result.rows;
  }

  async findOne(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM depenses_ponctuelles WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async update(id: string, updates: Partial<CreateDepenseDto>): Promise<any> {
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

    updateFields.push(`derniere_modification = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(id);

    const result = await this.databaseService.query(
      `UPDATE depenses_ponctuelles SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  async findByDateRange(projetId: string, dateDebut: string, dateFin: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM depenses_ponctuelles WHERE projet_id = $1 AND date >= $2 AND date <= $3 ORDER BY date DESC',
      [projetId, dateDebut, dateFin],
    );
    return result.rows;
  }

  async remove(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM depenses_ponctuelles WHERE id = $1', [id]);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

