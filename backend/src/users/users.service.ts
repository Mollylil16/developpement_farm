import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface CreateUserDto {
  email?: string;
  telephone?: string;
  nom: string;
  prenom: string;
  password_hash?: string;
  provider?: 'email' | 'google' | 'apple' | 'telephone';
  provider_id?: string;
  photo?: string;
}

export interface UpdateUserDto {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  photo?: string;
  is_active?: boolean;
}

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Créer un nouvel utilisateur
   */
  async create(createUserDto: CreateUserDto): Promise<any> {
    const id = this.generateUUID();
    const now = new Date().toISOString();

    const result = await this.databaseService.query(
      `INSERT INTO users (
        id, email, telephone, nom, prenom, password_hash, 
        provider, provider_id, photo, date_creation, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        id,
        createUserDto.email || null,
        createUserDto.telephone || null,
        createUserDto.nom,
        createUserDto.prenom,
        createUserDto.password_hash || null,
        createUserDto.provider || 'email',
        createUserDto.provider_id || null,
        createUserDto.photo || null,
        now,
        true,
      ],
    );

    return result.rows[0];
  }

  /**
   * Obtenir un utilisateur par ID
   */
  async findOne(id: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM users WHERE id = $1',
      [id],
    );

    return result.rows[0] || null;
  }

  /**
   * Obtenir un utilisateur par email
   */
  async findByEmail(email: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM users WHERE email = $1',
      [email],
    );

    return result.rows[0] || null;
  }

  /**
   * Obtenir un utilisateur par téléphone
   */
  async findByTelephone(telephone: string): Promise<any | null> {
    const result = await this.databaseService.query(
      'SELECT * FROM users WHERE telephone = $1',
      [telephone],
    );

    return result.rows[0] || null;
  }

  /**
   * Obtenir un utilisateur par email ou téléphone
   */
  async findByIdentifier(identifier: string): Promise<any | null> {
    // Essayer d'abord par email
    const byEmail = await this.findByEmail(identifier);
    if (byEmail) return byEmail;

    // Puis par téléphone
    const byTelephone = await this.findByTelephone(identifier);
    if (byTelephone) return byTelephone;

    return null;
  }

  /**
   * Obtenir tous les utilisateurs
   */
  async findAll(): Promise<any[]> {
    const result = await this.databaseService.query(
      'SELECT * FROM users ORDER BY date_creation DESC',
    );

    return result.rows;
  }

  /**
   * Mettre à jour un utilisateur
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<any> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateUserDto.nom !== undefined) {
      updates.push(`nom = $${paramIndex++}`);
      values.push(updateUserDto.nom);
    }
    if (updateUserDto.prenom !== undefined) {
      updates.push(`prenom = $${paramIndex++}`);
      values.push(updateUserDto.prenom);
    }
    if (updateUserDto.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(updateUserDto.email);
    }
    if (updateUserDto.telephone !== undefined) {
      updates.push(`telephone = $${paramIndex++}`);
      values.push(updateUserDto.telephone);
    }
    if (updateUserDto.photo !== undefined) {
      updates.push(`photo = $${paramIndex++}`);
      values.push(updateUserDto.photo);
    }
    if (updateUserDto.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(updateUserDto.is_active);
    }

    if (updates.length === 0) {
      return this.findOne(id);
    }

    updates.push(`derniere_connexion = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(id);

    const result = await this.databaseService.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  /**
   * Supprimer un utilisateur
   */
  async remove(id: string): Promise<void> {
    await this.databaseService.query('DELETE FROM users WHERE id = $1', [id]);
  }

  /**
   * Générer un UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

