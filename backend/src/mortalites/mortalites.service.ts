import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateMortaliteDto } from './dto/create-mortalite.dto';
import { UpdateMortaliteDto } from './dto/update-mortalite.dto';

@Injectable()
export class MortalitesService {
  constructor(private databaseService: DatabaseService) {}

  /**
   * Génère un ID comme le frontend : mortalite_${Date.now()}_${random}
   */
  private generateMortaliteId(): string {
    return `mortalite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Vérifie que le projet appartient à l'utilisateur
   */
  private async checkProjetOwnership(projetId: string, userId: string): Promise<void> {
    const result = await this.databaseService.query(
      'SELECT proprietaire_id FROM projets WHERE id = $1',
      [projetId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Projet introuvable');
    }
    if (result.rows[0].proprietaire_id !== userId) {
      throw new ForbiddenException('Ce projet ne vous appartient pas');
    }
  }

  /**
   * Mappe une ligne de base de données vers un objet Mortalite
   */
  private mapRowToMortalite(row: any): any {
    return {
      id: row.id,
      projet_id: row.projet_id,
      nombre_porcs: row.nombre_porcs,
      date: row.date,
      cause: row.cause || undefined,
      categorie: row.categorie,
      animal_code: row.animal_code || undefined,
      poids_kg: row.poids_kg ? parseFloat(row.poids_kg) : undefined,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
    };
  }

  async create(createMortaliteDto: CreateMortaliteDto, userId: string) {
    await this.checkProjetOwnership(createMortaliteDto.projet_id, userId);

    const id = this.generateMortaliteId();
    const now = new Date().toISOString();

    // Si un animal_code est fourni, mettre à jour le statut de l'animal
    if (createMortaliteDto.animal_code) {
      await this.updateAnimalStatus(createMortaliteDto.animal_code, createMortaliteDto.projet_id);
    }

    const result = await this.databaseService.query(
      `INSERT INTO mortalites (
        id, projet_id, nombre_porcs, date, cause, categorie,
        animal_code, poids_kg, notes, date_creation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id,
        createMortaliteDto.projet_id,
        createMortaliteDto.nombre_porcs,
        createMortaliteDto.date,
        createMortaliteDto.cause || null,
        createMortaliteDto.categorie,
        createMortaliteDto.animal_code || null,
        createMortaliteDto.poids_kg || null,
        createMortaliteDto.notes || null,
        now,
      ]
    );

    return this.mapRowToMortalite(result.rows[0]);
  }

  /**
   * Met à jour le statut d'un animal à 'mort' si son code correspond
   */
  private async updateAnimalStatus(animalCode: string, projetId: string): Promise<void> {
    try {
      await this.databaseService.query(
        `UPDATE production_animaux 
         SET statut = 'mort', actif = FALSE, derniere_modification = $1
         WHERE code = $2 AND projet_id = $3 AND statut != 'mort'`,
        [new Date().toISOString(), animalCode, projetId]
      );
    } catch (error) {
      // Ne pas faire échouer la création de mortalité si la mise à jour échoue
      console.warn("Erreur lors de la mise à jour du statut de l'animal:", error);
    }
  }

  async findAll(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM mortalites WHERE projet_id = $1 ORDER BY date DESC`,
      [projetId]
    );
    return result.rows.map((row) => this.mapRowToMortalite(row));
  }

  async findOne(id: string, userId: string) {
    const result = await this.databaseService.query(
      `SELECT m.* FROM mortalites m
       JOIN projets p ON m.projet_id = p.id
       WHERE m.id = $1 AND p.proprietaire_id = $2`,
      [id, userId]
    );
    return result.rows[0] ? this.mapRowToMortalite(result.rows[0]) : null;
  }

  async update(id: string, updateMortaliteDto: UpdateMortaliteDto, userId: string) {
    const existing = await this.findOne(id, userId);
    if (!existing) {
      throw new NotFoundException('Mortalité introuvable');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateMortaliteDto.nombre_porcs !== undefined) {
      fields.push(`nombre_porcs = $${paramIndex}`);
      values.push(updateMortaliteDto.nombre_porcs);
      paramIndex++;
    }
    if (updateMortaliteDto.date !== undefined) {
      fields.push(`date = $${paramIndex}`);
      values.push(updateMortaliteDto.date);
      paramIndex++;
    }
    if (updateMortaliteDto.cause !== undefined) {
      fields.push(`cause = $${paramIndex}`);
      values.push(updateMortaliteDto.cause || null);
      paramIndex++;
    }
    if (updateMortaliteDto.categorie !== undefined) {
      fields.push(`categorie = $${paramIndex}`);
      values.push(updateMortaliteDto.categorie);
      paramIndex++;
    }
    if (updateMortaliteDto.animal_code !== undefined) {
      fields.push(`animal_code = $${paramIndex}`);
      values.push(updateMortaliteDto.animal_code || null);
      paramIndex++;
    }
    if (updateMortaliteDto.poids_kg !== undefined) {
      fields.push(`poids_kg = $${paramIndex}`);
      values.push(updateMortaliteDto.poids_kg || null);
      paramIndex++;
    }
    if (updateMortaliteDto.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(updateMortaliteDto.notes || null);
      paramIndex++;
    }

    if (fields.length === 0) {
      return existing;
    }

    values.push(id);
    const query = `UPDATE mortalites SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    return this.mapRowToMortalite(result.rows[0]);
  }

  async delete(id: string, userId: string) {
    const existing = await this.findOne(id, userId);
    if (!existing) {
      throw new NotFoundException('Mortalité introuvable');
    }

    await this.databaseService.query('DELETE FROM mortalites WHERE id = $1', [id]);
    return { id };
  }

  async getStatistiques(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    // Récupérer le total des mortalités
    const totalResult = await this.databaseService.query(
      `SELECT SUM(nombre_porcs) as total FROM mortalites WHERE projet_id = $1`,
      [projetId]
    );
    const totalMorts = totalResult.rows[0]?.total ? parseInt(totalResult.rows[0].total, 10) : 0;

    // Récupérer le nombre total d'animaux du projet (pour calculer le taux)
    const animauxResult = await this.databaseService.query(
      `SELECT COUNT(*) as total FROM production_animaux WHERE projet_id = $1`,
      [projetId]
    );
    const totalAnimaux = animauxResult.rows[0]?.total
      ? parseInt(animauxResult.rows[0].total, 10)
      : 0;

    // Calculer le taux de mortalité
    const tauxMortalite = totalAnimaux > 0 ? (totalMorts / totalAnimaux) * 100 : 0;

    // Récupérer les mortalités par catégorie
    const categorieResult = await this.databaseService.query(
      `SELECT categorie, SUM(nombre_porcs) as total 
       FROM mortalites 
       WHERE projet_id = $1 
       GROUP BY categorie`,
      [projetId]
    );
    const mortalitesParCategorie = {
      porcelet: 0,
      truie: 0,
      verrat: 0,
      autre: 0,
    };
    categorieResult.rows.forEach((row) => {
      mortalitesParCategorie[row.categorie] = parseInt(row.total, 10);
    });

    // Récupérer les mortalités par mois (12 derniers mois)
    const moisResult = await this.databaseService.query(
      `SELECT 
         TO_CHAR(date, 'YYYY-MM') as mois,
         SUM(nombre_porcs) as nombre
       FROM mortalites 
       WHERE projet_id = $1 
         AND date >= NOW() - INTERVAL '12 months'
       GROUP BY TO_CHAR(date, 'YYYY-MM')
       ORDER BY mois ASC`,
      [projetId]
    );
    const mortalitesParMois = moisResult.rows.map((row) => ({
      mois: row.mois,
      nombre: parseInt(row.nombre, 10),
    }));

    return {
      total_morts: totalMorts,
      taux_mortalite: tauxMortalite,
      mortalites_par_categorie: mortalitesParCategorie,
      mortalites_par_mois: mortalitesParMois,
    };
  }
}
