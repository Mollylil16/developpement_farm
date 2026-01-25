/**
 * Service pour la recherche de vétérinaires
 */

import apiClient from './api/apiClient';
import { Veterinarian } from '../types/veterinarian';
import { getUserLocation, calculateDistance } from '../utils/locationUtils';

/**
 * Rechercher tous les vétérinaires validés (sans filtre de distance)
 */
export async function searchAllVeterinarians(): Promise<Veterinarian[]> {
  try {
    // ✅ Utiliser le nouvel endpoint dédié qui retourne uniquement les vétérinaires validés
    const veterinarians = await apiClient.get<any[]>('/users/veterinarians');
    
    const allVets: Veterinarian[] = veterinarians
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
          verified: vetRole?.verified || vetRole?.validationStatus === 'approved' || vetRole?.validationStatus === 'validated' || false,
          createdAt: Date.now(), // Timestamp actuel par défaut
        };
      });

    return allVets;
  } catch (error) {
    console.error('Erreur recherche vétérinaires:', error);
    return [];
  }
}

/**
 * Rechercher des vétérinaires dans un rayon donné
 */
export async function searchVeterinariansNearby(
  userLat: number,
  userLon: number,
  radiusKm: number = 50
): Promise<Veterinarian[]> {
  try {
    // ✅ Utiliser le nouvel endpoint dédié
    const allVets = await searchAllVeterinarians();

    // Filtrer par distance et ajouter la distance
    const nearbyVets = allVets
      .map((vet) => ({
        ...vet,
        distance: vet.latitude && vet.longitude 
          ? calculateDistance(userLat, userLon, vet.latitude, vet.longitude)
          : Infinity, // Si pas de coordonnées, mettre à Infinity pour les exclure du filtre
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
 * Si la géolocalisation échoue, retourne tous les vétérinaires validés
 */
export async function searchVeterinariansWithLocation(radiusKm: number = 50, allowAllIfNoLocation: boolean = true): Promise<{
  veterinarians: Veterinarian[];
  userLocation: { latitude: number; longitude: number } | null;
}> {
  const userLocation = await getUserLocation();

  if (!userLocation) {
    // ✅ Si pas de géolocalisation et allowAllIfNoLocation = true, retourner tous les vétérinaires
    if (allowAllIfNoLocation) {
      const allVets = await searchAllVeterinarians();
      return { veterinarians: allVets, userLocation: null };
    }
    return { veterinarians: [], userLocation: null };
  }

  const veterinarians = await searchVeterinariansNearby(
    userLocation.latitude,
    userLocation.longitude,
    radiusKm
  );

  return { veterinarians, userLocation };
}
