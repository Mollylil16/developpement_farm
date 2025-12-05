/**
 * Service pour la recherche de vétérinaires
 */

import { getDatabase } from './database';
import { VeterinarianRepository } from '../database/repositories';
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
    const db = await getDatabase();
    const vetRepo = new VeterinarianRepository(db);

    // Récupérer tous les vétérinaires vérifiés
    const allVets = await vetRepo.findVerified();

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
export async function searchVeterinariansWithLocation(
  radiusKm: number = 50
): Promise<{ veterinarians: Veterinarian[]; userLocation: { latitude: number; longitude: number } | null }> {
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

