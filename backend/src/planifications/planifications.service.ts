import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreatePlanificationDto {
  projet_id: string;
  type: 'saillie' | 'vaccination' | 'sevrage' | 'nettoyage' | 'alimentation' | 'veterinaire' | 'autre';
  titre: string;
  description?: string;
  date_prevue: string;
  date_echeance?: string;
  rappel?: string;
  statut?: 'a_faire' | 'en_cours' | 'terminee' | 'annulee';
  recurrence?: 'aucune' | 'quotidienne' | 'hebdomadaire' | 'mensuelle';
  lien_gestation_id?: string;
  lien_sevrage_id?: string;
  notes?: string;
}

@Injectable()
export class PlanificationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreatePlanificationDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO planifications (
        id, projet_id, type, titre, description, date_prevue, date_echeance,
        rappel, statut, recurrence, lien_gestation_id, lien_sevrage_id, notes,
        date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id, dto.projet_id, dto.type, dto.titre, dto.description || null,
        dto.date_prevue, dto.date_echeance || null, dto.rappel || null,
        dto.statut || 'a_faire', dto.recurrence || 'aucune',
        dto.lien_gestation_id || null, dto.lien_sevrage_id || null,
        dto.notes || null, now, now,
      ],
    );

    return result.rows[0];
  }

  async findByProjet(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM planifications WHERE projet_id = $1 ORDER BY date_prevue ASC',
      [projetId],
    );
    return result.rows;
  }

  async findOne(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM planifications WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async update(id: string, updates: Partial<CreatePlanificationDto>): Promise<any> {
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
      `UPDATE planifications SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  async findAVenir(projetId: string, jours: number = 7): Promise<any[]> {
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() + jours);
    const now = new Date().toISOString().split('T')[0];

    const result = await this.databaseService.query(
      `SELECT * FROM planifications 
       WHERE projet_id = $1 
       AND date_prevue >= $2 
       AND date_prevue <= $3
       AND statut != 'terminee'
       ORDER BY date_prevue ASC`,
      [projetId, now, dateLimite.toISOString().split('T')[0]],
    );
    return result.rows;
  }

  async findByStatut(projetId: string, statut: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM planifications WHERE projet_id = $1 AND statut = $2 ORDER BY date_prevue ASC',
      [projetId, statut],
    );
    return result.rows;
  }

  async findByDateRange(projetId: string, dateDebut: string, dateFin: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM planifications WHERE projet_id = $1 AND date_prevue >= $2 AND date_prevue <= $3 ORDER BY date_prevue ASC',
      [projetId, dateDebut, dateFin],
    );
    return result.rows;
  }

  async remove(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM planifications WHERE id = $1', [id]);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

