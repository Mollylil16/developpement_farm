import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateGestationDto {
  projet_id: string;
  truie_id: string;
  truie_nom?: string;
  verrat_id?: string;
  verrat_nom?: string;
  date_sautage: string;
  nombre_porcelets_prevu: number;
  notes?: string;
}

@Injectable()
export class GestationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateGestationDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();
    
    // Calculer date_mise_bas_prevue (114 jours après sautage)
    const dateSautage = new Date(dto.date_sautage);
    dateSautage.setDate(dateSautage.getDate() + 114);
    const dateMiseBasPrevue = dateSautage.toISOString().split('T')[0];

    const result = await this.databaseService.query(
      `INSERT INTO gestations (
        id, projet_id, truie_id, truie_nom, verrat_id, verrat_nom,
        date_sautage, date_mise_bas_prevue, nombre_porcelets_prevu,
        statut, notes, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        id, dto.projet_id, dto.truie_id, dto.truie_nom || null,
        dto.verrat_id || null, dto.verrat_nom || null, dto.date_sautage,
        dateMiseBasPrevue, dto.nombre_porcelets_prevu, 'en_cours',
        dto.notes || null, now, now,
      ],
    );

    return result.rows[0];
  }

  async findByProjet(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM gestations WHERE projet_id = $1 ORDER BY date_sautage DESC',
      [projetId],
    );
    return result.rows;
  }

  async findOne(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM gestations WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async update(id: string, updates: Partial<CreateGestationDto & { date_mise_bas_reelle?: string; nombre_porcelets_reel?: number; statut?: string }>): Promise<any> {
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
      `UPDATE gestations SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  async findEnCours(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      "SELECT * FROM gestations WHERE projet_id = $1 AND statut = 'en_cours' ORDER BY date_mise_bas_prevue ASC",
      [projetId],
    );
    return result.rows;
  }

  async findByDateMiseBas(projetId: string, dateDebut: string, dateFin: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM gestations WHERE projet_id = $1 AND date_mise_bas_prevue >= $2 AND date_mise_bas_prevue <= $3 ORDER BY date_mise_bas_prevue ASC',
      [projetId, dateDebut, dateFin],
    );
    return result.rows;
  }

  async remove(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM gestations WHERE id = $1', [id]);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

