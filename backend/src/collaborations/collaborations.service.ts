import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCollaborateurDto } from './dto/create-collaborateur.dto';
import { UpdateCollaborateurDto } from './dto/update-collaborateur.dto';

// Permissions par défaut selon le rôle
const DEFAULT_PERMISSIONS: Record<string, any> = {
  proprietaire: {
    reproduction: true,
    nutrition: true,
    finance: true,
    rapports: true,
    planification: true,
    mortalites: true,
    sante: true,
  },
  gestionnaire: {
    reproduction: true,
    nutrition: true,
    finance: true,
    rapports: true,
    planification: true,
    mortalites: true,
    sante: true,
  },
  veterinaire: {
    reproduction: true,
    nutrition: true,
    finance: false,
    rapports: true,
    planification: true,
    mortalites: true,
    sante: true,
  },
  ouvrier: {
    reproduction: true,
    nutrition: true,
    finance: false,
    rapports: false,
    planification: true,
    mortalites: true,
    sante: false,
  },
  observateur: {
    reproduction: false,
    nutrition: false,
    finance: false,
    rapports: true,
    planification: false,
    mortalites: false,
    sante: false,
  },
};

@Injectable()
export class CollaborationsService {
  constructor(private databaseService: DatabaseService) {}

  /**
   * Génère un ID comme le frontend : collaborateur_${Date.now()}_${random}
   */
  private generateCollaborateurId(): string {
    return `collaborateur_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Vérifie que le projet appartient à l'utilisateur
   */
  private async checkProjetOwnership(projetId: string, userId: string): Promise<void> {
    // #region agent log
    try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); const logDir = path.dirname(logPath); if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true }); fs.appendFileSync(logPath, JSON.stringify({location:'collaborations.service.ts:74',message:'checkProjetOwnership entry',data:{projetId,userId,projetIdType:typeof projetId,userIdType:typeof userId,projetIdLength:projetId?.length,userIdLength:userId?.length,projetIdJSON:JSON.stringify(projetId),userIdJSON:JSON.stringify(userId)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})+'\n'); } catch(e) {}
    // #endregion
    const result = await this.databaseService.query(
      'SELECT proprietaire_id FROM projets WHERE id = $1',
      [projetId]
    );
    if (result.rows.length === 0) {
      // #region agent log
      try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); fs.appendFileSync(logPath, JSON.stringify({location:'collaborations.service.ts:79',message:'checkProjetOwnership: projet introuvable',data:{projetId,userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'C'})+'\n'); } catch(e) {}
      // #endregion
      throw new NotFoundException('Projet introuvable');
    }
    const rawProprietaireId = result.rows[0].proprietaire_id;
    const proprietaireId = String(rawProprietaireId || '').trim();
    const normalizedUserId = String(userId || '').trim();
    // #region agent log
    try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); fs.appendFileSync(logPath, JSON.stringify({location:'collaborations.service.ts:82',message:'checkProjetOwnership: comparaison détaillée',data:{projetId,userId,rawProprietaireId,proprietaireId,normalizedUserId,proprietaireIdType:typeof proprietaireId,normalizedUserIdType:typeof normalizedUserId,areEqual:proprietaireId===normalizedUserId,proprietaireIdLength:proprietaireId?.length,normalizedUserIdLength:normalizedUserId?.length,proprietaireIdJSON:JSON.stringify(proprietaireId),normalizedUserIdJSON:JSON.stringify(normalizedUserId),proprietaireIdCharCodes:proprietaireId?.split('').map(c=>c.charCodeAt(0)),normalizedUserIdCharCodes:normalizedUserId?.split('').map(c=>c.charCodeAt(0))},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'B'})+'\n'); } catch(e) {}
    // #endregion
    if (proprietaireId !== normalizedUserId) {
      // #region agent log
      try { const fs = require('fs'); const path = require('path'); const logPath = (process.cwd().includes('backend') ? path.join(process.cwd(), '..', '.cursor', 'debug.log') : path.join(process.cwd(), '.cursor', 'debug.log')); fs.appendFileSync(logPath, JSON.stringify({location:'collaborations.service.ts:93',message:'checkProjetOwnership: accès refusé',data:{projetId,userId,proprietaireId,normalizedUserId,reason:'proprietaireId !== normalizedUserId',diffLength:Math.abs(proprietaireId.length-normalizedUserId.length)},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})+'\n'); } catch(e) {}
      // #endregion
      throw new ForbiddenException('Ce projet ne vous appartient pas');
    }
  }

  /**
   * Convertit l'objet permissions en colonnes séparées pour la base de données
   */
  private permissionsToColumns(permissions: any): any {
    const defaultPerms = permissions || {};
    return {
      permission_reproduction: defaultPerms.reproduction ?? false,
      permission_nutrition: defaultPerms.nutrition ?? false,
      permission_finance: defaultPerms.finance ?? false,
      permission_rapports: defaultPerms.rapports ?? false,
      permission_planification: defaultPerms.planification ?? false,
      permission_mortalites: defaultPerms.mortalites ?? false,
      permission_sante: defaultPerms.sante ?? false,
    };
  }

  /**
   * Convertit les colonnes de permissions en objet
   */
  private columnsToPermissions(row: any): any {
    return {
      reproduction: row.permission_reproduction || false,
      nutrition: row.permission_nutrition || false,
      finance: row.permission_finance || false,
      rapports: row.permission_rapports || false,
      planification: row.permission_planification || false,
      mortalites: row.permission_mortalites || false,
      sante: row.permission_sante || false,
    };
  }

  /**
   * Mappe une ligne de base de données vers un objet Collaborateur
   */
  private mapRowToCollaborateur(row: any): any {
    return {
      id: row.id,
      projet_id: row.projet_id,
      user_id: row.user_id || undefined,
      nom: row.nom,
      prenom: row.prenom,
      email: row.email,
      telephone: row.telephone || undefined,
      role: row.role,
      statut: row.statut,
      permissions: this.columnsToPermissions(row),
      date_invitation: row.date_invitation,
      date_acceptation: row.date_acceptation || undefined,
      notes: row.notes || undefined,
      date_creation: row.date_creation,
      derniere_modification: row.derniere_modification || row.date_creation,
    };
  }

  async create(createCollaborateurDto: CreateCollaborateurDto, userId: string) {
    await this.checkProjetOwnership(createCollaborateurDto.projet_id, userId);

    const id = this.generateCollaborateurId();
    const now = new Date().toISOString();
    const statut = createCollaborateurDto.statut || 'en_attente';

    // Fusionner les permissions par défaut avec celles fournies
    const defaultPerms = DEFAULT_PERMISSIONS[createCollaborateurDto.role] || {};
    const mergedPermissions = createCollaborateurDto.permissions
      ? { ...defaultPerms, ...createCollaborateurDto.permissions }
      : defaultPerms;

    const permColumns = this.permissionsToColumns(mergedPermissions);

    const result = await this.databaseService.query(
      `INSERT INTO collaborations (
        id, projet_id, user_id, nom, prenom, email, telephone, role, statut,
        permission_reproduction, permission_nutrition, permission_finance,
        permission_rapports, permission_planification, permission_mortalites,
        permission_sante, date_invitation, notes, date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        id,
        createCollaborateurDto.projet_id,
        createCollaborateurDto.user_id || null,
        createCollaborateurDto.nom,
        createCollaborateurDto.prenom,
        createCollaborateurDto.email,
        createCollaborateurDto.telephone || null,
        createCollaborateurDto.role,
        statut,
        permColumns.permission_reproduction,
        permColumns.permission_nutrition,
        permColumns.permission_finance,
        permColumns.permission_rapports,
        permColumns.permission_planification,
        permColumns.permission_mortalites,
        permColumns.permission_sante,
        now, // date_invitation
        createCollaborateurDto.notes || null,
        now,
        now,
      ]
    );

    return this.mapRowToCollaborateur(result.rows[0]);
  }

  async findAll(projetId: string, userId: string) {
    await this.checkProjetOwnership(projetId, userId);

    const result = await this.databaseService.query(
      `SELECT * FROM collaborations WHERE projet_id = $1 ORDER BY date_creation DESC`,
      [projetId]
    );
    return result.rows.map((row) => this.mapRowToCollaborateur(row));
  }

  async findOne(id: string, userId: string) {
    const result = await this.databaseService.query(
      `SELECT c.* FROM collaborations c
       JOIN projets p ON c.projet_id = p.id
       WHERE c.id = $1 AND p.proprietaire_id = $2`,
      [id, userId]
    );
    return result.rows[0] ? this.mapRowToCollaborateur(result.rows[0]) : null;
  }

  async update(id: string, updateCollaborateurDto: UpdateCollaborateurDto, userId: string) {
    const existing = await this.findOne(id, userId);
    if (!existing) {
      throw new NotFoundException('Collaborateur introuvable');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateCollaborateurDto.user_id !== undefined) {
      fields.push(`user_id = $${paramIndex}`);
      values.push(updateCollaborateurDto.user_id || null);
      paramIndex++;
    }
    if (updateCollaborateurDto.nom !== undefined) {
      fields.push(`nom = $${paramIndex}`);
      values.push(updateCollaborateurDto.nom);
      paramIndex++;
    }
    if (updateCollaborateurDto.prenom !== undefined) {
      fields.push(`prenom = $${paramIndex}`);
      values.push(updateCollaborateurDto.prenom);
      paramIndex++;
    }
    if (updateCollaborateurDto.email !== undefined) {
      fields.push(`email = $${paramIndex}`);
      values.push(updateCollaborateurDto.email);
      paramIndex++;
    }
    if (updateCollaborateurDto.telephone !== undefined) {
      fields.push(`telephone = $${paramIndex}`);
      values.push(updateCollaborateurDto.telephone || null);
      paramIndex++;
    }
    if (updateCollaborateurDto.role !== undefined) {
      fields.push(`role = $${paramIndex}`);
      values.push(updateCollaborateurDto.role);
      paramIndex++;
    }
    if (updateCollaborateurDto.statut !== undefined) {
      fields.push(`statut = $${paramIndex}`);
      values.push(updateCollaborateurDto.statut);
      paramIndex++;
    }
    if (updateCollaborateurDto.permissions !== undefined) {
      const permColumns = this.permissionsToColumns(updateCollaborateurDto.permissions);
      fields.push(`permission_reproduction = $${paramIndex}`);
      values.push(permColumns.permission_reproduction);
      paramIndex++;
      fields.push(`permission_nutrition = $${paramIndex}`);
      values.push(permColumns.permission_nutrition);
      paramIndex++;
      fields.push(`permission_finance = $${paramIndex}`);
      values.push(permColumns.permission_finance);
      paramIndex++;
      fields.push(`permission_rapports = $${paramIndex}`);
      values.push(permColumns.permission_rapports);
      paramIndex++;
      fields.push(`permission_planification = $${paramIndex}`);
      values.push(permColumns.permission_planification);
      paramIndex++;
      fields.push(`permission_mortalites = $${paramIndex}`);
      values.push(permColumns.permission_mortalites);
      paramIndex++;
      fields.push(`permission_sante = $${paramIndex}`);
      values.push(permColumns.permission_sante);
      paramIndex++;
    }
    if (updateCollaborateurDto.date_acceptation !== undefined) {
      fields.push(`date_acceptation = $${paramIndex}`);
      values.push(updateCollaborateurDto.date_acceptation || null);
      paramIndex++;
    }
    if (updateCollaborateurDto.notes !== undefined) {
      fields.push(`notes = $${paramIndex}`);
      values.push(updateCollaborateurDto.notes || null);
      paramIndex++;
    }

    if (fields.length === 0) {
      return existing;
    }

    fields.push(`derniere_modification = $${paramIndex}`);
    values.push(new Date().toISOString());
    paramIndex++;

    values.push(id);
    const query = `UPDATE collaborations SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    return this.mapRowToCollaborateur(result.rows[0]);
  }

  async delete(id: string, userId: string) {
    const existing = await this.findOne(id, userId);
    if (!existing) {
      throw new NotFoundException('Collaborateur introuvable');
    }

    await this.databaseService.query('DELETE FROM collaborations WHERE id = $1', [id]);
    return { id };
  }

  async accepterInvitation(id: string, userId: string) {
    // Vérifier que l'invitation existe et appartient à l'utilisateur
    const result = await this.databaseService.query(
      `SELECT c.* FROM collaborations c
       WHERE c.id = $1 AND (c.user_id = $2 OR c.email = (SELECT email FROM users WHERE id = $2))`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Invitation introuvable');
    }

    const collaboration = result.rows[0];
    if (collaboration.statut !== 'en_attente') {
      throw new BadRequestException("Cette invitation n'est plus en attente");
    }

    const now = new Date().toISOString();
    const updateResult = await this.databaseService.query(
      `UPDATE collaborations 
       SET statut = 'actif', date_acceptation = $1, derniere_modification = $2,
           user_id = COALESCE(user_id, $3)
       WHERE id = $4
       RETURNING *`,
      [now, now, userId, id]
    );

    return this.mapRowToCollaborateur(updateResult.rows[0]);
  }

  async rejeterInvitation(id: string, userId: string) {
    // Vérifier que l'invitation existe et appartient à l'utilisateur
    const result = await this.databaseService.query(
      `SELECT c.* FROM collaborations c
       WHERE c.id = $1 AND (c.user_id = $2 OR c.email = (SELECT email FROM users WHERE id = $2))`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Invitation introuvable');
    }

    const now = new Date().toISOString();
    await this.databaseService.query(
      `UPDATE collaborations 
       SET statut = 'inactif', derniere_modification = $1
       WHERE id = $2`,
      [now, id]
    );

    return { id };
  }

  async findCollaborateurActuel(userId: string, projetId: string) {
    const result = await this.databaseService.query(
      `SELECT * FROM collaborations 
       WHERE user_id = $1 AND projet_id = $2 AND statut = 'actif'
       LIMIT 1`,
      [userId, projetId]
    );
    return result.rows[0] ? this.mapRowToCollaborateur(result.rows[0]) : null;
  }

  async findInvitationsEnAttente(userId?: string, email?: string) {
    if (!userId && !email) {
      return [];
    }

    let query = `SELECT * FROM collaborations WHERE statut = 'en_attente'`;
    const params: any[] = [];

    if (userId) {
      query += ` AND (user_id = $1 OR user_id IS NULL)`;
      params.push(userId);
    }

    if (email) {
      if (params.length > 0) {
        query += ` OR email = $${params.length + 1}`;
      } else {
        query += ` AND email = $1`;
      }
      params.push(email);
    }

    query += ` ORDER BY date_invitation DESC`;

    const result = await this.databaseService.query(query, params);

    // Si on trouve des invitations par email et qu'on a un userId, les lier
    if (userId && email && result.rows.length > 0) {
      for (const row of result.rows) {
        if (!row.user_id && row.email === email) {
          await this.databaseService.query(`UPDATE collaborations SET user_id = $1 WHERE id = $2`, [
            userId,
            row.id,
          ]);
        }
      }
      // Recharger après liaison
      const reloadResult = await this.databaseService.query(
        `SELECT * FROM collaborations 
         WHERE statut = 'en_attente' AND (user_id = $1 OR email = $2)
         ORDER BY date_invitation DESC`,
        [userId, email]
      );
      return reloadResult.rows.map((row) => this.mapRowToCollaborateur(row));
    }

    return result.rows.map((row) => this.mapRowToCollaborateur(row));
  }
}
