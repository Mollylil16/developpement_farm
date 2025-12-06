import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateAnimalDto {
  projet_id: string;
  code: string;
  nom?: string;
  origine?: string;
  sexe: 'male' | 'femelle' | 'indetermine';
  date_naissance?: string;
  poids_initial?: number;
  date_entree?: string;
  actif?: boolean;
  statut?: 'actif' | 'mort' | 'vendu' | 'offert' | 'autre';
  race?: string;
  reproducteur?: boolean;
  pere_id?: string;
  mere_id?: string;
  notes?: string;
  photo_uri?: string;
}

@Injectable()
export class AnimauxService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateAnimalDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO production_animaux (
        id, projet_id, code, nom, origine, sexe, date_naissance,
        poids_initial, date_entree, actif, statut, race, reproducteur,
        pere_id, mere_id, notes, photo_uri, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        id, dto.projet_id, dto.code, dto.nom || null, dto.origine || null,
        dto.sexe, dto.date_naissance || null, dto.poids_initial || null,
        dto.date_entree || null, dto.actif !== false, dto.statut || 'actif',
        dto.race || null, dto.reproducteur || false, dto.pere_id || null,
        dto.mere_id || null, dto.notes || null, dto.photo_uri || null, now, now,
      ],
    );

    return result.rows[0];
  }

  async findByProjet(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM production_animaux WHERE projet_id = $1 ORDER BY date_creation DESC',
      [projetId],
    );
    return result.rows;
  }

  async findOne(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM production_animaux WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async update(id: string, updates: Partial<CreateAnimalDto>): Promise<any> {
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
      `UPDATE production_animaux SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  async remove(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM production_animaux WHERE id = $1', [id]);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

