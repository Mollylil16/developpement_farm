import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateStockAlimentDto {
  projet_id: string;
  nom: string;
  categorie?: string;
  quantite_actuelle: number;
  unite: string;
  seuil_alerte?: number;
  notes?: string;
}

export interface CreateStockMouvementDto {
  projet_id: string;
  aliment_id: string;
  type: 'entree' | 'sortie' | 'ajustement';
  quantite: number;
  unite: string;
  date: string;
  origine?: string;
  commentaire?: string;
  cree_par?: string;
}

@Injectable()
export class StocksService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ========== STOCKS ALIMENTS ==========

  async createStock(dto: CreateStockAlimentDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO stocks_aliments (
        id, projet_id, nom, categorie, quantite_actuelle, unite,
        seuil_alerte, alerte_active, notes, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        id, dto.projet_id, dto.nom, dto.categorie || null,
        dto.quantite_actuelle, dto.unite, dto.seuil_alerte || null,
        false, dto.notes || null, now, now,
      ],
    );

    return result.rows[0];
  }

  async findStocksByProjet(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM stocks_aliments WHERE projet_id = $1 ORDER BY nom ASC',
      [projetId],
    );
    return result.rows;
  }

  async findStockById(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM stocks_aliments WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async updateStock(id: string, updates: Partial<CreateStockAlimentDto>): Promise<any> {
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
      return this.findStockById(id);
    }

    updateFields.push(`derniere_modification = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(id);

    const result = await this.databaseService.query(
      `UPDATE stocks_aliments SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  async removeStock(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM stocks_aliments WHERE id = $1', [id]);
  }

  // ========== STOCKS MOUVEMENTS ==========

  async createMouvement(dto: CreateStockMouvementDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO stocks_mouvements (
        id, projet_id, aliment_id, type, quantite, unite, date,
        origine, commentaire, cree_par, date_creation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        id, dto.projet_id, dto.aliment_id, dto.type, dto.quantite,
        dto.unite, dto.date, dto.origine || null, dto.commentaire || null,
        dto.cree_par || null, now,
      ],
    );

    // Mettre à jour la quantité du stock
    if (dto.type === 'entree') {
      await this.databaseService.query(
        'UPDATE stocks_aliments SET quantite_actuelle = quantite_actuelle + $1, date_derniere_entree = $2 WHERE id = $3',
        [dto.quantite, dto.date, dto.aliment_id],
      );
    } else if (dto.type === 'sortie') {
      await this.databaseService.query(
        'UPDATE stocks_aliments SET quantite_actuelle = quantite_actuelle - $1, date_derniere_sortie = $2 WHERE id = $3',
        [dto.quantite, dto.date, dto.aliment_id],
      );
    } else if (dto.type === 'ajustement') {
      await this.databaseService.query(
        'UPDATE stocks_aliments SET quantite_actuelle = $1 WHERE id = $2',
        [dto.quantite, dto.aliment_id],
      );
    }

    return result.rows[0];
  }

  async findMouvementsByProjet(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM stocks_mouvements WHERE projet_id = $1 ORDER BY date DESC',
      [projetId],
    );
    return result.rows;
  }

  async findMouvementsByAliment(alimentId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM stocks_mouvements WHERE aliment_id = $1 ORDER BY date DESC',
      [alimentId],
    );
    return result.rows;
  }

  async findMouvementById(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM stocks_mouvements WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async findStocksEnAlerte(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      `SELECT * FROM stocks_aliments 
       WHERE projet_id = $1 
       AND alerte_active = true
       ORDER BY nom ASC`,
      [projetId],
    );
    return result.rows;
  }

  async findMouvementsRecents(projetId: string, limit: number = 20): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM stocks_mouvements WHERE projet_id = $1 ORDER BY date DESC LIMIT $2',
      [projetId, limit],
    );
    return result.rows;
  }

  async removeMouvement(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM stocks_mouvements WHERE id = $1', [id]);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

