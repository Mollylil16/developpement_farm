import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateProjetDto {
  nom: string;
  description?: string;
  localisation: string;
  nombre_truies: number;
  nombre_verrats: number;
  nombre_porcelets: number;
  poids_moyen_actuel: number;
  age_moyen_actuel: number;
  notes?: string;
  statut?: 'actif' | 'archive' | 'suspendu';
  proprietaire_id: string;
}

export interface UpdateProjetDto {
  nom?: string;
  description?: string;
  localisation?: string;
  nombre_truies?: number;
  nombre_verrats?: number;
  nombre_porcelets?: number;
  poids_moyen_actuel?: number;
  age_moyen_actuel?: number;
  notes?: string;
  statut?: 'actif' | 'archive' | 'suspendu';
}

@Injectable()
export class ProjetsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createProjetDto: CreateProjetDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO projets (
        id, nom, description, localisation, nombre_truies, nombre_verrats,
        nombre_porcelets, poids_moyen_actuel, age_moyen_actuel, notes,
        statut, proprietaire_id, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        id,
        createProjetDto.nom,
        createProjetDto.description || null,
        createProjetDto.localisation,
        createProjetDto.nombre_truies,
        createProjetDto.nombre_verrats,
        createProjetDto.nombre_porcelets,
        createProjetDto.poids_moyen_actuel,
        createProjetDto.age_moyen_actuel,
        createProjetDto.notes || null,
        createProjetDto.statut || 'actif',
        createProjetDto.proprietaire_id,
        now,
        now,
      ],
    );

    return result.rows[0];
  }

  async findAll(): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM projets ORDER BY date_creation DESC',
    );
    return result.rows;
  }

  async findByProprietaire(proprietaireId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM projets WHERE proprietaire_id = $1 ORDER BY date_creation DESC',
      [proprietaireId],
    );
    return result.rows;
  }

  async findOne(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM projets WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async update(id: string, updateProjetDto: UpdateProjetDto): Promise<any> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updateProjetDto).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return this.findOne(id);
    }

    updates.push(`derniere_modification = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(id);

    const result = await this.databaseService.query(
      `UPDATE projets SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  async findActifByUser(userId: string): Promise<any | null> {
    const result = await this.databaseService.query(
      "SELECT * FROM projets WHERE proprietaire_id = $1 AND statut = 'actif' ORDER BY date_creation DESC LIMIT 1",
      [userId],
    );
    return result.rows[0] || null;
  }

  async remove(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM projets WHERE id = $1', [id]);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

