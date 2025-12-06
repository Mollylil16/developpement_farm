import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateVisiteVeterinaireDto {
  projet_id: string;
  date_visite: string;
  veterinaire?: string;
  motif: string;
  animaux_examines?: string;
  diagnostic?: string;
  prescriptions?: string;
  recommandations?: string;
  traitement?: string;
  cout?: number;
  prochaine_visite_prevue?: string;
  notes?: string;
}

@Injectable()
export class VisitesVeterinairesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateVisiteVeterinaireDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO visites_veterinaires (
        id, projet_id, date_visite, veterinaire, motif, animaux_examines,
        diagnostic, prescriptions, recommandations, traitement, cout,
        prochaine_visite_prevue, notes, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id, dto.projet_id, dto.date_visite, dto.veterinaire || null,
        dto.motif, dto.animaux_examines || null, dto.diagnostic || null,
        dto.prescriptions || null, dto.recommandations || null,
        dto.traitement || null, dto.cout || null,
        dto.prochaine_visite_prevue || null, dto.notes || null, now, now,
      ],
    );

    return result.rows[0];
  }

  async findByProjet(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM visites_veterinaires WHERE projet_id = $1 ORDER BY date_visite DESC',
      [projetId],
    );
    return result.rows;
  }

  async findOne(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM visites_veterinaires WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async update(id: string, updates: Partial<CreateVisiteVeterinaireDto>): Promise<any> {
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
      `UPDATE visites_veterinaires SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  async findProchaineVisite(projetId: string): Promise<any | null> {
    const now = new Date().toISOString().split('T')[0];
    const result = await this.databaseService.query(
      `SELECT * FROM visites_veterinaires 
       WHERE projet_id = $1 
       AND prochaine_visite_prevue >= $2
       ORDER BY prochaine_visite_prevue ASC
       LIMIT 1`,
      [projetId, now],
    );
    return result.rows[0] || null;
  }

  async remove(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM visites_veterinaires WHERE id = $1', [id]);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

