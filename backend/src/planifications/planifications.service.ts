import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreatePlanificationDto } from './dto/create-planification.dto';
import { UpdatePlanificationDto } from './dto/update-planification.dto';

@Injectable()
export class PlanificationsService {
  constructor(private databaseService: DatabaseService) {}

  /**
   * Génère un ID comme le frontend : planification_${Date.now()}_${random}
   */
  private generatePlanificationId(): string {
    return `planification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Vérifie que le projet appartient à l'utilisateur OU qu'il est collaborateur actif
   */
  private async checkProjetOwnership(projetId: string, userId: string): Promise<void> {
    const result = await this.databaseService.query(
      'SELECT proprietaire_id FROM projets WHERE id = $1',
      [projetId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Projet introuvable');
    }
    const rawProprietaireId = result.rows[0].proprietaire_id;
    const proprietaireId = String(rawProprietaireId || '').trim();
    const normalizedUserId = String(userId || '').trim();
    
    // ✅ Si l'utilisateur est propriétaire, c'est OK
    if (proprietaireId === normalizedUserId) {
      return;
    }
    
    // ✅ Sinon, vérifier s'il est collaborateur actif avec permission 'planification'
    const collabResult = await this.databaseService.query(
      `SELECT id, permission_planification FROM collaborations 
       WHERE projet_id = $1 
       AND (user_id = $2 OR profile_id LIKE $3)
       AND statut = 'actif'`,
      [projetId, normalizedUserId, `%${normalizedUserId}%`]
    );
    
    if (collabResult.rows.length > 0) {
      // Vérifier si la permission planification est accordée
      if (collabResult.rows[0].permission_planification === true) {
        return;
      }
    }
    
    throw new ForbiddenException('Ce projet ne vous appartient pas');
  }

  /**
   * Mappe une ligne de base de données vers un objet Planification
   */
  private mapRowToPlanification(row: any): any {
    return {
      id: row.id,
      projet_id: row.projet_id,
      type: row.type,
      titre: row.titre,
      description: row.description || undefined,
      date_prevue: row.date_prevue,
      date_echeance: row.date_echeance || undefined,
      rappel: row.rappel || undefined,
      statut: row.statut,
      recurrence: row.recurrence || 'aucune',
      lien_gestation_id: row.lien_gestation_id || undefined,
      lien_sevrage_id: row.lien_sevrage_id || undefined,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification || row.date_creation,
    };
  }

  async create(createPlanificationDto: CreatePlanificationDto, userId: string) {
    await this.checkProjetOwnership(createPlanificationDto.projet_id, userId);

    const id = this.generatePlanificationId();
    const now = new Date().toISOString();
    const statut = 'a_faire'; // Par défaut
    const recurrence = createPlanificationDto.recurrence || 'aucune';

    const result = await this.databaseService.query(
      `INSERT INTO planifications (
        id, projet_id, type, titre, description, date_prevue, date_echeance,
        rappel, statut, recurrence, lien_gestation_id, lien_sevrage_id,
        notes, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id,
        createPlanificationDto.projet_id,
        createPlanificationDto.type,
        createPlanificationDto.titre,
        createPlanificationDto.description || null,
        createPlanificationDto.date_prevue,
        createPlanificationDto.date_echeance || null,
        createPlanificationDto.rappel || null,
        statut,
        recurrence,
        createPlanificationDto.lien_gestation_id || null,
        createPlanificationDto.lien_sevrage_id || null,
        createPlanificationDto.notes || null,
        now,
        now,
      ]
    );

    return this.mapRowToPlanification(result.rows[0]);
  }

  async findAll(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM planifications WHERE projet_id = $1 ORDER BY date_prevue ASC`,
      [projetId]
    );
    return result.rows.map((row) => this.mapRowToPlanification(row));
  }

  async findAVenir(projetId: string, userId: string, jours: number = 7) {
    await this.checkProjetOwnership(projetId, userId);

    const maintenant = new Date();
    const dateLimite = new Date();
    dateLimite.setDate(maintenant.getDate() + jours);

    const result = await this.databaseService.query(
      `SELECT * FROM planifications 
       WHERE projet_id = $1 
       AND date_prevue >= $2 
       AND date_prevue <= $3
       AND (statut = 'a_faire' OR statut = 'en_cours')
       ORDER BY date_prevue ASC`,
      [projetId, maintenant.toISOString(), dateLimite.toISOString()]
    );
    return result.rows.map((row) => this.mapRowToPlanification(row));
  }

  async findEnRetard(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const maintenant = new Date();

    const result = await this.databaseService.query(
      `SELECT * FROM planifications 
       WHERE projet_id = $1 
       AND date_prevue < $2
       AND (statut = 'a_faire' OR statut = 'en_cours')
       ORDER BY date_prevue ASC`,
      [projetId, maintenant.toISOString()]
    );
    return result.rows.map((row) => this.mapRowToPlanification(row));
  }

  async findOne(id: string, userId: string) {
    const result = await this.databaseService.query(
      `SELECT p.* FROM planifications p
       JOIN projets pr ON p.projet_id = pr.id
       WHERE p.id = $1 AND pr.proprietaire_id = $2`,
      [id, userId]
    );
    return result.rows[0] ? this.mapRowToPlanification(result.rows[0]) : null;
  }

  async update(id: string, updatePlanificationDto: UpdatePlanificationDto, userId: string) {
    const existing = await this.findOne(id, userId);
    if (!existing) {
      throw new NotFoundException('Planification introuvable');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updatePlanificationDto.type !== undefined) {
      fields.push(`type = $${paramIndex}`);
      values.push(updatePlanificationDto.type);
      paramIndex++;
    }
    if (updatePlanificationDto.titre !== undefined) {
      fields.push(`titre = $${paramIndex}`);
      values.push(updatePlanificationDto.titre);
      paramIndex++;
    }
    if (updatePlanificationDto.description !== undefined) {
      fields.push(`description = $${paramIndex}`);
      values.push(updatePlanificationDto.description || null);
      paramIndex++;
    }
    if (updatePlanificationDto.date_prevue !== undefined) {
      fields.push(`date_prevue = $${paramIndex}`);
      values.push(updatePlanificationDto.date_prevue);
      paramIndex++;
    }
    if (updatePlanificationDto.date_echeance !== undefined) {
      fields.push(`date_echeance = $${paramIndex}`);
      values.push(updatePlanificationDto.date_echeance || null);
      paramIndex++;
    }
    if (updatePlanificationDto.rappel !== undefined) {
      fields.push(`rappel = $${paramIndex}`);
      values.push(updatePlanificationDto.rappel || null);
      paramIndex++;
    }
    if (updatePlanificationDto.statut !== undefined) {
      fields.push(`statut = $${paramIndex}`);
      values.push(updatePlanificationDto.statut);
      paramIndex++;
    }
    if (updatePlanificationDto.recurrence !== undefined) {
      fields.push(`recurrence = $${paramIndex}`);
      values.push(updatePlanificationDto.recurrence || 'aucune');
      paramIndex++;
    }
    if (updatePlanificationDto.lien_gestation_id !== undefined) {
      fields.push(`lien_gestation_id = $${paramIndex}`);
      values.push(updatePlanificationDto.lien_gestation_id || null);
      paramIndex++;
    }
    if (updatePlanificationDto.lien_sevrage_id !== undefined) {
      fields.push(`lien_sevrage_id = $${paramIndex}`);
      values.push(updatePlanificationDto.lien_sevrage_id || null);
      paramIndex++;
    }
    if (updatePlanificationDto.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(updatePlanificationDto.notes || null);
      paramIndex++;
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`derniere_modification = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    values.push(id);
    const query = `UPDATE planifications SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    return this.mapRowToPlanification(result.rows[0]);
  }

  async delete(id: string, userId: string) {
    const existing = await this.findOne(id, userId);
    if (!existing) {
      throw new NotFoundException('Planification introuvable');
    }

    await this.databaseService.query('DELETE FROM planifications WHERE id = $1', [id]);
    return { id };
  }

  async createBatch(createPlanificationDtos: CreatePlanificationDto[], userId: string) {
    // Vérifier que tous les projets appartiennent à l'utilisateur
    for (const dto of createPlanificationDtos) {
      await this.checkProjetOwnership(dto.projet_id, userId);
    }

    const planifications = [];
    const now = new Date().toISOString();

    for (const dto of createPlanificationDtos) {
      const id = this.generatePlanificationId();
      const statut = 'a_faire';
      const recurrence = dto.recurrence || 'aucune';

      const result = await this.databaseService.query(
        `INSERT INTO planifications (
          id, projet_id, type, titre, description, date_prevue, date_echeance,
          rappel, statut, recurrence, lien_gestation_id, lien_sevrage_id,
          notes, date_creation, derniere_modification
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          id,
          dto.projet_id,
          dto.type,
          dto.titre,
          dto.description || null,
          dto.date_prevue,
          dto.date_echeance || null,
          dto.rappel || null,
          statut,
          recurrence,
          dto.lien_gestation_id || null,
          dto.lien_sevrage_id || null,
          dto.notes || null,
          now,
          now,
        ]
      );

      planifications.push(this.mapRowToPlanification(result.rows[0]));
    }

    return planifications;
  }
}
