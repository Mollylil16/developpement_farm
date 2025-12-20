/**
 * Service pour la recherche de vétérinaires
 */

import apiClient from './api/apiClient';
import { Veterinarian } from '../types/veterinarian';
import { getUserLocation, calculateDistance } from '../utils/locationUtils';

/**
 * Rechercher des vétérinaires dans un rayon donné
 */
export async function searchVeterinariansNearby(
  userLat: number,
  userLon: number,
  radiusKm: number = 50
): Promise<Veterinarian[]> {
  try {
    // Récupérer tous les utilisateurs avec rôle vétérinaire depuis l'API backend
    const allUsers = await apiClient.get<any[]>('/users');
    const allVets: Veterinarian[] = allUsers
      .filter((user) => {
        const vetRole = user.roles?.veterinarian;
        return vetRole && vetRole.isActive && vetRole.verified;
      })
      .map((user) => {
        const vetRole = user.roles?.veterinarian;
        return {
          id: user.id,
          userId: user.id,
          firstName: user.prenom || '',
          lastName: user.nom || '',
          email: user.email || '',
          phone: user.telephone || '',
          address: vetRole?.workLocation?.address || '',
          city: vetRole?.workLocation?.city || '',
          latitude: vetRole?.workLocation?.latitude || 0,
          longitude: vetRole?.workLocation?.longitude || 0,
          specialties: vetRole?.specializations || [],
          rating: 0, // Par défaut, à mettre à jour si disponible
          reviewsCount: 0, // Par défaut, à mettre à jour si disponible
          verified: vetRole?.verified || false,
          createdAt: Date.now(), // Timestamp actuel par défaut
        };
      });

    // Filtrer par distance et ajouter la distance
    const nearbyVets = allVets
      .map((vet) => ({
        ...vet,
        distance: calculateDistance(userLat, userLon, vet.latitude, vet.longitude),
      }))
      .filter((vet) => vet.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance); // Trier par distance croissante

    return nearbyVets;
  } catch (error) {
    console.error('Erreur recherche vétérinaires:', error);
    return [];
  }
}

/**
 * Rechercher des vétérinaires avec géolocalisation automatique
 */
export async function searchVeterinariansWithLocation(radiusKm: number = 50): Promise<{
  veterinarians: Veterinarian[];
  userLocation: { latitude: number; longitude: number } | null;
}> {
  const userLocation = await getUserLocation();

  if (!userLocation) {
    return { veterinarians: [], userLocation: null };
  }

  const veterinarians = await searchVeterinariansNearby(
    userLocation.latitude,
    userLocation.longitude,
    radiusKm
  );

  return { veterinarians, userLocation };
}
