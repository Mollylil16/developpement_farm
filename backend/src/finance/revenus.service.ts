import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateRevenuDto {
  projet_id: string;
  montant: number;
  categorie: 'vente_porc' | 'vente_autre' | 'subvention' | 'autre';
  libelle_categorie?: string;
  date: string;
  description?: string;
  commentaire?: string;
  photos?: string;
  poids_kg?: number;
  animal_id?: string;
  cout_kg_opex?: number;
  cout_kg_complet?: number;
  cout_reel_opex?: number;
  cout_reel_complet?: number;
  marge_opex?: number;
  marge_complete?: number;
  marge_opex_pourcent?: number;
  marge_complete_pourcent?: number;
}

@Injectable()
export class RevenusService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateRevenuDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO revenus (
        id, projet_id, montant, categorie, libelle_categorie, date,
        description, commentaire, photos, poids_kg, animal_id,
        cout_kg_opex, cout_kg_complet, cout_reel_opex, cout_reel_complet,
        marge_opex, marge_complete, marge_opex_pourcent, marge_complete_pourcent,
        date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`,
      [
        id, dto.projet_id, dto.montant, dto.categorie, dto.libelle_categorie || null,
        dto.date, dto.description || null, dto.commentaire || null, dto.photos || null,
        dto.poids_kg || null, dto.animal_id || null, dto.cout_kg_opex || null,
        dto.cout_kg_complet || null, dto.cout_reel_opex || null, dto.cout_reel_complet || null,
        dto.marge_opex || null, dto.marge_complete || null, dto.marge_opex_pourcent || null,
        dto.marge_complete_pourcent || null, now, now,
      ],
    );

    return result.rows[0];
  }

  async findByProjet(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM revenus WHERE projet_id = $1 ORDER BY date DESC',
      [projetId],
    );
    return result.rows;
  }

  async findOne(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM revenus WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async update(id: string, updates: Partial<CreateRevenuDto>): Promise<any> {
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
      `UPDATE revenus SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  async findByDateRange(projetId: string, dateDebut: string, dateFin: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM revenus WHERE projet_id = $1 AND date >= $2 AND date <= $3 ORDER BY date DESC',
      [projetId, dateDebut, dateFin],
    );
    return result.rows;
  }

  async remove(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM revenus WHERE id = $1', [id]);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

