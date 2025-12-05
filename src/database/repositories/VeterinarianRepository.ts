/**
 * Repository pour la table veterinarians
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { Veterinarian, CreateVeterinarianInput, UpdateVeterinarianInput } from '../../types/veterinarian';

interface VeterinarianRow {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  specialties: string | null;
  rating: number;
  reviews_count: number;
  verified: number; // SQLite boolean (0 ou 1)
  created_at: number;
}

export class VeterinarianRepository extends BaseRepository<Veterinarian> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'veterinarians');
  }

  /**
   * Convertir une ligne de la DB en objet Veterinarian
   */
  private rowToVeterinarian(row: VeterinarianRow): Veterinarian {
    return {
      id: row.id,
      userId: row.user_id || undefined,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone || '',
      email: row.email || '',
      address: row.address || '',
      city: row.city || '',
      latitude: row.latitude,
      longitude: row.longitude,
      specialties: row.specialties ? JSON.parse(row.specialties) : [],
      rating: row.rating,
      reviewsCount: row.reviews_count,
      verified: row.verified === 1,
      createdAt: row.created_at,
    };
  }

  /**
   * Récupérer tous les vétérinaires
   */
  async findAll(): Promise<Veterinarian[]> {
    const rows = await this.query<VeterinarianRow>(
      'SELECT * FROM veterinarians ORDER BY created_at DESC'
    );
    return rows.map((row) => this.rowToVeterinarian(row));
  }

  /**
   * Récupérer un vétérinaire par ID
   */
  async findById(id: string): Promise<Veterinarian | null> {
    const row = await this.queryOne<VeterinarianRow>(
      'SELECT * FROM veterinarians WHERE id = ?',
      [id]
    );
    return row ? this.rowToVeterinarian(row) : null;
  }

  /**
   * Récupérer un vétérinaire par user_id
   */
  async findByUserId(userId: string): Promise<Veterinarian | null> {
    const row = await this.queryOne<VeterinarianRow>(
      'SELECT * FROM veterinarians WHERE user_id = ?',
      [userId]
    );
    return row ? this.rowToVeterinarian(row) : null;
  }

  /**
   * Récupérer tous les vétérinaires vérifiés
   */
  async findVerified(): Promise<Veterinarian[]> {
    const rows = await this.query<VeterinarianRow>(
      'SELECT * FROM veterinarians WHERE verified = 1 ORDER BY rating DESC, reviews_count DESC'
    );
    return rows.map((row) => this.rowToVeterinarian(row));
  }

  /**
   * Créer un vétérinaire
   */
  async create(input: CreateVeterinarianInput): Promise<Veterinarian> {
    const id = `vet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    await this.db.runAsync(
      `INSERT INTO veterinarians (
        id, user_id, first_name, last_name, phone, email, address, city,
        latitude, longitude, specialties, rating, reviews_count, verified, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.userId || null,
        input.firstName,
        input.lastName,
        input.phone || null,
        input.email || null,
        input.address || null,
        input.city || null,
        input.latitude,
        input.longitude,
        JSON.stringify(input.specialties || []),
        input.rating || 0,
        input.reviewsCount || 0,
        input.verified ? 1 : 0,
        now,
      ]
    );

    return this.findById(id) as Promise<Veterinarian>;
  }

  /**
   * Mettre à jour un vétérinaire
   */
  async update(id: string, input: UpdateVeterinarianInput): Promise<Veterinarian> {
    const updates: string[] = [];
    const params: unknown[] = [];

    if (input.firstName !== undefined) {
      updates.push('first_name = ?');
      params.push(input.firstName);
    }
    if (input.lastName !== undefined) {
      updates.push('last_name = ?');
      params.push(input.lastName);
    }
    if (input.phone !== undefined) {
      updates.push('phone = ?');
      params.push(input.phone);
    }
    if (input.email !== undefined) {
      updates.push('email = ?');
      params.push(input.email);
    }
    if (input.address !== undefined) {
      updates.push('address = ?');
      params.push(input.address);
    }
    if (input.city !== undefined) {
      updates.push('city = ?');
      params.push(input.city);
    }
    if (input.latitude !== undefined) {
      updates.push('latitude = ?');
      params.push(input.latitude);
    }
    if (input.longitude !== undefined) {
      updates.push('longitude = ?');
      params.push(input.longitude);
    }
    if (input.specialties !== undefined) {
      updates.push('specialties = ?');
      params.push(JSON.stringify(input.specialties));
    }
    if (input.rating !== undefined) {
      updates.push('rating = ?');
      params.push(input.rating);
    }
    if (input.reviewsCount !== undefined) {
      updates.push('reviews_count = ?');
      params.push(input.reviewsCount);
    }
    if (input.verified !== undefined) {
      updates.push('verified = ?');
      params.push(input.verified ? 1 : 0);
    }

    if (updates.length === 0) {
      return this.findById(id) as Promise<Veterinarian>;
    }

    params.push(id);
    await this.db.runAsync(
      `UPDATE veterinarians SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.findById(id) as Promise<Veterinarian>;
  }

  /**
   * Supprimer un vétérinaire
   */
  async delete(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM veterinarians WHERE id = ?', [id]);
  }
}

