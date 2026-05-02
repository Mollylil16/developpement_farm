/**
 * Repository pour la table veterinarians
 */

import { BaseRepository } from './BaseRepository';
import {
  Veterinarian,
  CreateVeterinarianInput,
  UpdateVeterinarianInput,
} from '../../types/veterinarian';

export class VeterinarianRepository extends BaseRepository<Veterinarian> {
  constructor() {
    super('veterinarians', '/veterinarians');
  }

  /**
   * Récupérer tous les vétérinaires
   */
  async findAll(): Promise<Veterinarian[]> {
    return this.query<Veterinarian>(this.apiBasePath, {
      order_by: 'created_at',
      order_direction: 'DESC',
    });
  }

  /**
   * Récupérer un vétérinaire par ID
   */
  async findById(id: string): Promise<Veterinarian | null> {
    return this.queryOne<Veterinarian>(`${this.apiBasePath}/${id}`);
  }

  /**
   * Récupérer un vétérinaire par user_id
   */
  async findByUserId(userId: string): Promise<Veterinarian | null> {
    return this.queryOne<Veterinarian>(this.apiBasePath, { user_id: userId });
  }

  /**
   * Récupérer tous les vétérinaires vérifiés
   */
  async findVerified(): Promise<Veterinarian[]> {
    return this.query<Veterinarian>(this.apiBasePath, {
      verified: true,
      order_by: 'rating',
      order_direction: 'DESC',
    });
  }

  /**
   * Créer un vétérinaire
   */
  async create(input: CreateVeterinarianInput): Promise<Veterinarian> {
    const vetData = {
      user_id: input.userId || null,
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      city: input.city || null,
      latitude: input.latitude,
      longitude: input.longitude,
      specialties: input.specialties || [],
      rating: input.rating || 0,
      reviews_count: input.reviewsCount || 0,
      verified: input.verified || false,
    };

    return this.executePost<Veterinarian>(this.apiBasePath, vetData);
  }

  /**
   * Mettre à jour un vétérinaire
   */
  async update(id: string, input: UpdateVeterinarianInput): Promise<Veterinarian> {
    const updateData: Record<string, unknown> = {};

    if (input.firstName !== undefined) updateData.first_name = input.firstName;
    if (input.lastName !== undefined) updateData.last_name = input.lastName;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.city !== undefined) updateData.city = input.city;
    if (input.latitude !== undefined) updateData.latitude = input.latitude;
    if (input.longitude !== undefined) updateData.longitude = input.longitude;
    if (input.specialties !== undefined) updateData.specialties = input.specialties;
    if (input.rating !== undefined) updateData.rating = input.rating;
    if (input.reviewsCount !== undefined) updateData.reviews_count = input.reviewsCount;
    if (input.verified !== undefined) updateData.verified = input.verified;

    if (Object.keys(updateData).length === 0) {
      return this.findById(id) as Promise<Veterinarian>;
    }

    return this.executePatch<Veterinarian>(`${this.apiBasePath}/${id}`, updateData);
  }

  /**
   * Supprimer un vétérinaire
   */
  async delete(id: string): Promise<void> {
    await this.deleteById(id);
  }
}
