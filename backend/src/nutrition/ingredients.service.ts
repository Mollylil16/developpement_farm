import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateIngredientDto {
  nom: string;
  unite: 'kg' | 'g' | 'l' | 'ml' | 'sac';
  prix_unitaire: number;
  proteine_pourcent?: number;
  energie_kcal?: number;
}

@Injectable()
export class IngredientsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateIngredientDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO ingredients (
        id, nom, unite, prix_unitaire, proteine_pourcent, energie_kcal, date_creation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        id, dto.nom, dto.unite, dto.prix_unitaire,
        dto.proteine_pourcent || null, dto.energie_kcal || null, now,
      ],
    );

    return result.rows[0];
  }

  async findAll(): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM ingredients ORDER BY nom ASC',
    );
    return result.rows;
  }

  async findOne(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM ingredients WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async update(id: string, updates: Partial<CreateIngredientDto>): Promise<any> {
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
      `UPDATE ingredients SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  async remove(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM ingredients WHERE id = $1', [id]);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

