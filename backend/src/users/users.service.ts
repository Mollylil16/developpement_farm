import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class UsersService {
  constructor(private databaseService: DatabaseService) {}

  /**
   * Génère un ID comme le frontend : user_${Date.now()}_${random}
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Normalise l'email (trim + lowercase)
   */
  private normalizeEmail(email?: string): string | null {
    return email ? email.trim().toLowerCase() : null;
  }

  /**
   * Normalise le téléphone (trim + supprime espaces)
   */
  private normalizeTelephone(telephone?: string): string | null {
    return telephone ? telephone.trim().replace(/\s+/g, '') : null;
  }

  async create(createUserDto: any) {
    // Vérifier qu'au moins email ou téléphone est fourni
    if (!createUserDto.email && !createUserDto.telephone) {
      throw new Error('Email ou numéro de téléphone requis');
    }

    const normalizedEmail = this.normalizeEmail(createUserDto.email);
    const normalizedTelephone = this.normalizeTelephone(createUserDto.telephone);

    // Vérifier si l'email existe déjà (si fourni)
    // NOTE: Cette vérification est déjà faite dans auth.service.register, mais on la garde pour sécurité
    if (normalizedEmail) {
      console.log('[UsersService] create: vérification email', normalizedEmail);
      const existingEmail = await this.findByEmail(normalizedEmail);
      console.log('[UsersService] create: utilisateur existant?', existingEmail ? 'OUI' : 'NON');
      if (existingEmail) {
        console.log('[UsersService] create: email déjà utilisé, utilisateur:', existingEmail.id);
        throw new Error('Un compte existe déjà avec cet email');
      }
    }

    // Vérifier si le téléphone existe déjà (si fourni)
    if (normalizedTelephone) {
      const existingPhone = await this.findByTelephone(normalizedTelephone);
      if (existingPhone) {
        throw new Error('Un compte existe déjà avec ce numéro de téléphone');
      }
    }

    const id = this.generateUserId();
    const now = new Date().toISOString();
    const provider = createUserDto.provider || (normalizedTelephone ? 'telephone' : 'email');

    const result = await this.databaseService.query(
      `INSERT INTO users (
        id, email, telephone, nom, prenom, password_hash, 
        provider, provider_id, photo, date_creation, derniere_connexion, is_active,
        roles, active_role, is_onboarded, onboarding_completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        id,
        normalizedEmail,
        normalizedTelephone,
        createUserDto.nom,
        createUserDto.prenom,
        createUserDto.password_hash || null,
        provider,
        createUserDto.provider_id || null,
        createUserDto.photo || null,
        now,
        now,
        true,
        createUserDto.roles ? JSON.stringify(createUserDto.roles) : null,
        createUserDto.activeRole || null,
        createUserDto.isOnboarded ? true : false,
        createUserDto.onboardingCompletedAt || null,
      ]
    );
    return this.mapRowToUser(result.rows[0]);
  }

  async findOne(id: string) {
    const result = await this.databaseService.query(
      'SELECT * FROM users WHERE id = $1 AND is_active = true',
      [id]
    );
    return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
  }

  async findByEmail(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) {
      console.log('[UsersService] findByEmail: email vide ou invalide');
      return null;
    }

    console.log('[UsersService] findByEmail: recherche de', normalizedEmail);
    const result = await this.databaseService.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [normalizedEmail]
    );
    
    console.log('[UsersService] findByEmail: résultat', result.rows.length, 'utilisateur(s) trouvé(s)');
    return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
  }

  async findByTelephone(telephone: string) {
    const normalizedTelephone = this.normalizeTelephone(telephone);
    if (!normalizedTelephone) return null;

    const result = await this.databaseService.query(
      'SELECT * FROM users WHERE telephone = $1 AND is_active = true',
      [normalizedTelephone]
    );
    return result.rows[0] ? this.mapRowToUser(result.rows[0]) : null;
  }

  async findByIdentifier(identifier: string) {
    const normalized = identifier.trim();
    const isEmail = normalized.includes('@');

    if (isEmail) {
      return this.findByEmail(normalized.toLowerCase());
    } else {
      const cleanPhone = normalized.replace(/\s+/g, '');
      return this.findByTelephone(cleanPhone);
    }
  }

  async updateLastConnection(id: string): Promise<void> {
    await this.databaseService.query('UPDATE users SET derniere_connexion = $1 WHERE id = $2', [
      new Date().toISOString(),
      id,
    ]);
  }

  async findAll() {
    const result = await this.databaseService.query(
      'SELECT * FROM users WHERE is_active = true ORDER BY date_creation DESC'
    );
    return result.rows.map((row) => this.mapRowToUser(row));
  }

  async update(id: string, updateUserDto: any) {
    const existingUser = await this.findOne(id);
    if (!existingUser) {
      throw new Error('Utilisateur introuvable');
    }

    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateUserDto.nom !== undefined) {
      fields.push(`nom = $${paramIndex}`);
      values.push(updateUserDto.nom);
      paramIndex++;
    }
    if (updateUserDto.prenom !== undefined) {
      fields.push(`prenom = $${paramIndex}`);
      values.push(updateUserDto.prenom);
      paramIndex++;
    }
    if (updateUserDto.email !== undefined) {
      fields.push(`email = $${paramIndex}`);
      values.push(this.normalizeEmail(updateUserDto.email));
      paramIndex++;
    }
    if (updateUserDto.telephone !== undefined) {
      fields.push(`telephone = $${paramIndex}`);
      values.push(this.normalizeTelephone(updateUserDto.telephone));
      paramIndex++;
    }
    if (updateUserDto.photo !== undefined) {
      fields.push(`photo = $${paramIndex}`);
      values.push(updateUserDto.photo);
      paramIndex++;
    }
    if (updateUserDto.roles !== undefined) {
      fields.push(`roles = $${paramIndex}`);
      values.push(JSON.stringify(updateUserDto.roles));
      paramIndex++;
    }
    if (updateUserDto.activeRole !== undefined) {
      fields.push(`active_role = $${paramIndex}`);
      values.push(updateUserDto.activeRole);
      paramIndex++;
    }
    if (updateUserDto.isOnboarded !== undefined) {
      fields.push(`is_onboarded = $${paramIndex}`);
      values.push(updateUserDto.isOnboarded);
      paramIndex++;
    }
    if (updateUserDto.onboardingCompletedAt !== undefined) {
      fields.push(`onboarding_completed_at = $${paramIndex}`);
      values.push(updateUserDto.onboardingCompletedAt);
      paramIndex++;
    }

    if (fields.length === 0) {
      return existingUser;
    }

    values.push(id);
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await this.databaseService.query(query, values);
    return this.mapRowToUser(result.rows[0]);
  }

  async remove(id: string) {
    await this.databaseService.query('DELETE FROM users WHERE id = $1', [id]);
    return { id };
  }

  /**
   * Mapper une ligne de la base de données vers un objet User (comme le frontend)
   */
  private mapRowToUser(row: any): any {
    // Parser saved_farms depuis JSON
    let savedFarms: string[] = [];
    if (row.saved_farms) {
      try {
        savedFarms = JSON.parse(row.saved_farms);
      } catch (e) {
        savedFarms = [];
      }
    }

    // Parser roles depuis JSON
    let roles: any = undefined;
    if (row.roles) {
      try {
        roles = typeof row.roles === 'string' ? JSON.parse(row.roles) : row.roles;
      } catch (e) {
        roles = undefined;
      }
    }

    return {
      id: row.id,
      email: row.email || undefined,
      telephone: row.telephone || undefined,
      nom: row.nom,
      prenom: row.prenom,
      provider: row.provider || 'email',
      photo: row.photo || undefined,
      saved_farms: savedFarms.length > 0 ? savedFarms : undefined,
      date_creation: row.date_creation,
      derniere_connexion: row.derniere_connexion || row.date_creation,
      roles: roles,
      activeRole: row.active_role || undefined,
      isOnboarded: row.is_onboarded === true || row.is_onboarded === 1,
      onboardingCompletedAt: row.onboarding_completed_at || undefined,
      is_active: row.is_active === true || row.is_active === 1, // Important pour le guard JWT
    };
  }
}
