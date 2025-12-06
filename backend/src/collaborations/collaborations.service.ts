import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateCollaborationDto {
  projet_id: string;
  user_id?: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role: 'proprietaire' | 'gestionnaire' | 'veterinaire' | 'ouvrier' | 'observateur';
  statut?: 'actif' | 'inactif' | 'en_attente';
  permission_reproduction?: boolean;
  permission_nutrition?: boolean;
  permission_finance?: boolean;
  permission_rapports?: boolean;
  permission_planification?: boolean;
  permission_mortalites?: boolean;
  permission_sante?: boolean;
  date_invitation: string;
  date_acceptation?: string;
  notes?: string;
}

@Injectable()
export class CollaborationsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(dto: CreateCollaborationDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO collaborations (
        id, projet_id, user_id, nom, prenom, email, telephone, role, statut,
        permission_reproduction, permission_nutrition, permission_finance,
        permission_rapports, permission_planification, permission_mortalites,
        permission_sante, date_invitation, date_acceptation, notes,
        date_creation, derniere_modification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`,
      [
        id, dto.projet_id, dto.user_id || null, dto.nom, dto.prenom,
        dto.email, dto.telephone || null, dto.role, dto.statut || 'en_attente',
        dto.permission_reproduction || false, dto.permission_nutrition || false,
        dto.permission_finance || false, dto.permission_rapports || false,
        dto.permission_planification || false, dto.permission_mortalites || false,
        dto.permission_sante || false, dto.date_invitation,
        dto.date_acceptation || null, dto.notes || null, now, now,
      ],
    );

    return result.rows[0];
  }

  async findByProjet(projetId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM collaborations WHERE projet_id = $1 ORDER BY date_creation DESC',
      [projetId],
    );
    return result.rows;
  }

  async findOne(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM collaborations WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  async update(id: string, updates: Partial<CreateCollaborationDto>): Promise<any> {
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
      `UPDATE collaborations SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  async findByStatut(projetId: string, statut: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM collaborations WHERE projet_id = $1 AND statut = $2 ORDER BY date_creation DESC',
      [projetId, statut],
    );
    return result.rows;
  }

  async findByRole(projetId: string, role: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM collaborations WHERE projet_id = $1 AND role = $2 ORDER BY date_creation DESC',
      [projetId, role],
    );
    return result.rows;
  }

  async findByUserId(userId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM collaborations WHERE user_id = $1 ORDER BY date_creation DESC',
      [userId],
    );
    return result.rows;
  }

  async findInvitationsEnAttente(userId: string): Promise<any[]> {
    const result = await this.databaseService.query(
      "SELECT * FROM collaborations WHERE user_id = $1 AND statut = 'en_attente' ORDER BY date_invitation DESC",
      [userId],
    );
    return result.rows;
  }

  async remove(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM collaborations WHERE id = $1', [id]);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

