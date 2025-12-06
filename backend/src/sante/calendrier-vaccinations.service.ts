import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateCalendrierVaccinationDto {
  projet_id: string;
  vaccin: 'rouget' | 'parvovirose' | 'mal_rouge' | 'circovirus' | 'mycoplasme' | 'grippe' | 'autre';
  nom_vaccin?: string;
  categorie: 'porcelet' | 'truie' | 'verrat' | 'porc_croissance' | 'tous';
  age_jours?: number;
  date_planifiee?: string;
  frequence_jours?: number;
  obligatoire?: boolean;
  notes?: string;
}

@Injectable()
export class CalendrierVaccinationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateCalendrierVaccinationDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO calendrier_vaccinations (
        id, projet_id, vaccin, nom_vaccin, categorie, age_jours,
        date_planifiee, frequence_jours, obligatoire, notes, date_creation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        id, dto.projet_id, dto.vaccin, dto.nom_vaccin || null,
        dto.categorie, dto.age_jours || null, dto.date_planifiee || null,
        dto.frequence_jours || null, dto.obligatoire || false,
        dto.notes || null, now,
      ],
    );

    return result.rows[0];
  }

  async findByProjet(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM calendrier_vaccinations WHERE projet_id = $1 ORDER BY categorie, age_jours',
      [projetId],
    );
    return result.rows;
  }

  async findOne(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM calendrier_vaccinations WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async update(id: string, updates: Partial<CreateCalendrierVaccinationDto>): Promise<any> {
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
      `UPDATE calendrier_vaccinations SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  async remove(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM calendrier_vaccinations WHERE id = $1', [id]);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

