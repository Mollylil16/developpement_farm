import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateMaladieDto {
  projet_id: string;
  animal_id?: string;
  lot_id?: string;
  type: string;
  nom_maladie: string;
  gravite: 'faible' | 'moderee' | 'grave' | 'critique';
  date_debut: string;
  date_fin?: string;
  symptomes: string;
  diagnostic?: string;
  contagieux?: boolean;
  nombre_animaux_affectes?: number;
  nombre_deces?: number;
  veterinaire?: string;
  cout_traitement?: number;
  gueri?: boolean;
  notes?: string;
}

@Injectable()
export class MaladiesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateMaladieDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO maladies (
        id, projet_id, animal_id, lot_id, type, nom_maladie, gravite,
        date_debut, date_fin, symptomes, diagnostic, contagieux,
        nombre_animaux_affectes, nombre_deces, veterinaire, cout_traitement,
        gueri, notes, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        id, dto.projet_id, dto.animal_id || null, dto.lot_id || null,
        dto.type, dto.nom_maladie, dto.gravite, dto.date_debut,
        dto.date_fin || null, dto.symptomes, dto.diagnostic || null,
        dto.contagieux || false, dto.nombre_animaux_affectes || null,
        dto.nombre_deces || null, dto.veterinaire || null,
        dto.cout_traitement || null, dto.gueri || false,
        dto.notes || null, now, now,
      ],
    );

    return result.rows[0];
  }

  async findByProjet(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM maladies WHERE projet_id = $1 ORDER BY date_debut DESC',
      [projetId],
    );
    return result.rows;
  }

  async findOne(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM maladies WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async update(id: string, updates: Partial<CreateMaladieDto>): Promise<any> {
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
      `UPDATE maladies SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  async findByAnimal(animalId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM maladies WHERE animal_id = $1 ORDER BY date_debut DESC',
      [animalId],
    );
    return result.rows;
  }

  async findEnCours(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM maladies WHERE projet_id = $1 AND gueri = false ORDER BY date_debut DESC',
      [projetId],
    );
    return result.rows;
  }

  async remove(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM maladies WHERE id = $1', [id]);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

