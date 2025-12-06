import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateRationDto {
  projet_id: string;
  type_porc: 'porcelet' | 'truie_gestante' | 'truie_allaitante' | 'verrat' | 'porc_croissance';
  poids_kg: number;
  nombre_porcs?: number;
  cout_total?: number;
  cout_par_kg?: number;
  notes?: string;
}

export interface CreateRationBudgetDto {
  projet_id: string;
  nom: string;
  type_porc: 'porcelet' | 'truie_gestante' | 'truie_allaitante' | 'verrat' | 'porc_croissance';
  poids_moyen_kg: number;
  nombre_porcs: number;
  duree_jours: number;
  ration_journaliere_par_porc: number;
  quantite_totale_kg: number;
  cout_total: number;
  cout_par_kg: number;
  cout_par_porc: number;
  ingredients: string; // JSON string
  notes?: string;
}

@Injectable()
export class RationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ========== RATIONS ==========

  async createRation(dto: CreateRationDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO rations (
        id, projet_id, type_porc, poids_kg, nombre_porcs,
        cout_total, cout_par_kg, notes, date_creation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        id, dto.projet_id, dto.type_porc, dto.poids_kg,
        dto.nombre_porcs || null, dto.cout_total || null,
        dto.cout_par_kg || null, dto.notes || null, now,
      ],
    );

    return result.rows[0];
  }

  async findRationsByProjet(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM rations WHERE projet_id = $1 ORDER BY date_creation DESC',
      [projetId],
    );
    return result.rows;
  }

  async findRationById(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM rations WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async removeRation(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM rations WHERE id = $1', [id]);
  }

  // ========== RATIONS BUDGET ==========

  async createRationBudget(dto: CreateRationBudgetDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO rations_budget (
        id, projet_id, nom, type_porc, poids_moyen_kg, nombre_porcs,
        duree_jours, ration_journaliere_par_porc, quantite_totale_kg,
        cout_total, cout_par_kg, cout_par_porc, ingredients, notes,
        date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        id, dto.projet_id, dto.nom, dto.type_porc, dto.poids_moyen_kg,
        dto.nombre_porcs, dto.duree_jours, dto.ration_journaliere_par_porc,
        dto.quantite_totale_kg, dto.cout_total, dto.cout_par_kg,
        dto.cout_par_porc, dto.ingredients, dto.notes || null, now, now,
      ],
    );

    return result.rows[0];
  }

  async findRationsBudgetByProjet(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM rations_budget WHERE projet_id = $1 ORDER BY date_creation DESC',
      [projetId],
    );
    return result.rows;
  }

  async findRationBudgetById(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM rations_budget WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async updateRationBudget(id: string, updates: Partial<CreateRationBudgetDto>): Promise<any> {
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
      return this.findRationBudgetById(id);
    }

    updateFields.push(`derniere_modification = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(id);

    const result = await this.databaseService.query(
      `UPDATE rations_budget SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  async removeRationBudget(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM rations_budget WHERE id = $1', [id]);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

