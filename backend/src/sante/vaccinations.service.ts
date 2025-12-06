import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateVaccinationDto {
  projet_id: string;
  calendrier_id?: string;
  animal_id?: string;
  lot_id?: string;
  vaccin?: string;
  nom_vaccin?: string;
  date_vaccination: string;
  date_rappel?: string;
  numero_lot_vaccin?: string;
  veterinaire?: string;
  cout?: number;
  statut?: 'planifie' | 'effectue' | 'en_retard' | 'annule';
  effets_secondaires?: string;
  notes?: string;
  animal_ids?: string[];
  type_prophylaxie?: string;
  produit_administre?: string;
  photo_flacon?: string;
  dosage?: string;
  unite_dosage?: string;
  raison_traitement?: string;
  raison_autre?: string;
}

@Injectable()
export class VaccinationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateVaccinationDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();
    const animalIdsJson = dto.animal_ids ? JSON.stringify(dto.animal_ids) : null;

    const result = await this.databaseService.query(
      `INSERT INTO vaccinations (
        id, projet_id, calendrier_id, animal_id, lot_id, vaccin, nom_vaccin,
        date_vaccination, date_rappel, numero_lot_vaccin, veterinaire, cout,
        statut, effets_secondaires, notes, animal_ids, type_prophylaxie,
        produit_administre, photo_flacon, dosage, unite_dosage, raison_traitement,
        raison_autre, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *`,
      [
        id, dto.projet_id, dto.calendrier_id || null, dto.animal_id || null,
        dto.lot_id || null, dto.vaccin || null, dto.nom_vaccin || null,
        dto.date_vaccination, dto.date_rappel || null, dto.numero_lot_vaccin || null,
        dto.veterinaire || null, dto.cout || null, dto.statut || 'effectue',
        dto.effets_secondaires || null, dto.notes || null, animalIdsJson,
        dto.type_prophylaxie || 'vitamine', dto.produit_administre || null,
        dto.photo_flacon || null, dto.dosage || null, dto.unite_dosage || 'ml',
        dto.raison_traitement || 'suivi_normal', dto.raison_autre || null, now, now,
      ],
    );

    return result.rows[0];
  }

  async findByProjet(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM vaccinations WHERE projet_id = $1 ORDER BY date_vaccination DESC',
      [projetId],
    );
    return result.rows;
  }

  async findOne(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM vaccinations WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async update(id: string, updates: Partial<CreateVaccinationDto>): Promise<any> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'animal_ids') {
          updateFields.push(`animal_ids = $${paramIndex++}`);
          values.push(JSON.stringify(value));
        } else {
          updateFields.push(`${key} = $${paramIndex++}`);
          values.push(value);
        }
      }
    });

    if (updateFields.length === 0) {
      return this.findOne(id);
    }

    updateFields.push(`derniere_modification = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(id);

    const result = await this.databaseService.query(
      `UPDATE vaccinations SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  async findByAnimal(animalId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      `SELECT * FROM vaccinations 
       WHERE animal_id = $1 
       OR animal_ids LIKE $2
       ORDER BY date_vaccination DESC`,
      [animalId, `%${animalId}%`],
    );
    return result.rows;
  }

  async findEnRetard(projetId: string): Promise<any[]> {
    const now = new Date().toISOString().split('T')[0];
    const result = await this.databaseService.query(
      `SELECT * FROM vaccinations 
       WHERE projet_id = $1 
       AND statut = 'planifie' 
       AND date_vaccination < $2
       ORDER BY date_vaccination ASC`,
      [projetId, now],
    );
    return result.rows;
  }

  async findAVenir(projetId: string, joursAvance: number = 7): Promise<any[]> {
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() + joursAvance);
    const now = new Date().toISOString().split('T')[0];

    const result = await this.databaseService.query(
      `SELECT * FROM vaccinations 
       WHERE projet_id = $1 
       AND statut = 'planifie' 
       AND date_vaccination >= $2 
       AND date_vaccination <= $3
       ORDER BY date_vaccination ASC`,
      [projetId, now, dateLimite.toISOString().split('T')[0]],
    );
    return result.rows;
  }

  async remove(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM vaccinations WHERE id = $1', [id]);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

