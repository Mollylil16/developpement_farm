/**
 * Types pour la gestion des vétérinaires
 */

export interface Veterinarian {
  id: string;
  userId?: string; // Lien avec table users
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  specialties: string[]; // JSON array
  rating: number;
  reviewsCount: number;
  verified: boolean;
  createdAt: number;
  distance?: number; // Calculée dynamiquement
}

export interface CreateVeterinarianInput {
  userId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  specialties: string[];
  rating?: number;
  reviewsCount?: number;
  verified?: boolean;
}

export interface UpdateVeterinarianInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  specialties?: string[];
  rating?: number;
  reviewsCount?: number;
  verified?: boolean;
}

