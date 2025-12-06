import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateRappelVaccinationDto {
  vaccination_id: string;
  date_rappel: string;
  envoi?: boolean;
  date_envoi?: string;
}

@Injectable()
export class RappelsVaccinationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateRappelVaccinationDto): Promise<any> {
    const id = this.generateUUID();

    const result = await this.databaseService.query(
      `INSERT INTO rappels_vaccinations (
        id, vaccination_id, date_rappel, envoi, date_envoi
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        id, dto.vaccination_id, dto.date_rappel,
        dto.envoi || false, dto.date_envoi || null,
      ],
    );

    return result.rows[0];
  }

  async findByProjet(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      `SELECT r.* FROM rappels_vaccinations r
       INNER JOIN vaccinations v ON r.vaccination_id = v.id
       WHERE v.projet_id = $1
       ORDER BY r.date_rappel ASC`,
      [projetId],
    );
    return result.rows;
  }

  async findAVenir(projetId: string, joursAvance: number = 7): Promise<any[]> {
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() + joursAvance);
    const now = new Date().toISOString().split('T')[0];

    const result = await this.databaseService.query(
      `SELECT r.* FROM rappels_vaccinations r
       INNER JOIN vaccinations v ON r.vaccination_id = v.id
       WHERE v.projet_id = $1
       AND r.date_rappel >= $2
       AND r.date_rappel <= $3
       ORDER BY r.date_rappel ASC`,
      [projetId, now, dateLimite.toISOString().split('T')[0]],
    );
    return result.rows;
  }

  async findEnRetard(projetId: string): Promise<any[]> {
    const now = new Date().toISOString().split('T')[0];

    const result = await this.databaseService.query(
      `SELECT r.* FROM rappels_vaccinations r
       INNER JOIN vaccinations v ON r.vaccination_id = v.id
       WHERE v.projet_id = $1
       AND r.date_rappel < $2
       AND (r.envoi = false OR r.envoi IS NULL)
       ORDER BY r.date_rappel ASC`,
      [projetId, now],
    );
    return result.rows;
  }

  async findOne(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM rappels_vaccinations WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async update(id: string, updates: Partial<CreateRappelVaccinationDto>): Promise<any> {
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
      `UPDATE rappels_vaccinations SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  async remove(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM rappels_vaccinations WHERE id = $1', [id]);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

