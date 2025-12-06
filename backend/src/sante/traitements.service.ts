import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateTraitementDto {
  projet_id: string;
  maladie_id?: string;
  animal_id?: string;
  lot_id?: string;
  type: string;
  nom_medicament: string;
  voie_administration: 'orale' | 'injectable' | 'topique' | 'alimentaire';
  dosage: string;
  frequence: string;
  date_debut: string;
  date_fin?: string;
  duree_jours?: number;
  temps_attente_jours?: number;
  veterinaire?: string;
  cout?: number;
  termine?: boolean;
  efficace?: number;
  effets_secondaires?: string;
  notes?: string;
}

@Injectable()
export class TraitementsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateTraitementDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO traitements (
        id, projet_id, maladie_id, animal_id, lot_id, type, nom_medicament,
        voie_administration, dosage, frequence, date_debut, date_fin,
        duree_jours, temps_attente_jours, veterinaire, cout, termine,
        efficace, effets_secondaires, notes, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *`,
      [
        id, dto.projet_id, dto.maladie_id || null, dto.animal_id || null,
        dto.lot_id || null, dto.type, dto.nom_medicament, dto.voie_administration,
        dto.dosage, dto.frequence, dto.date_debut, dto.date_fin || null,
        dto.duree_jours || null, dto.temps_attente_jours || null,
        dto.veterinaire || null, dto.cout || null, dto.termine || false,
        dto.efficace || null, dto.effets_secondaires || null,
        dto.notes || null, now, now,
      ],
    );

    return result.rows[0];
  }

  async findByProjet(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM traitements WHERE projet_id = $1 ORDER BY date_debut DESC',
      [projetId],
    );
    return result.rows;
  }

  async findOne(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM traitements WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async update(id: string, updates: Partial<CreateTraitementDto>): Promise<any> {
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
      `UPDATE traitements SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  async findByMaladie(maladieId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM traitements WHERE maladie_id = $1 ORDER BY date_debut DESC',
      [maladieId],
    );
    return result.rows;
  }

  async findByAnimal(animalId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM traitements WHERE animal_id = $1 ORDER BY date_debut DESC',
      [animalId],
    );
    return result.rows;
  }

  async findEnCours(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM traitements WHERE projet_id = $1 AND termine = false ORDER BY date_debut DESC',
      [projetId],
    );
    return result.rows;
  }

  async remove(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM traitements WHERE id = $1', [id]);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

