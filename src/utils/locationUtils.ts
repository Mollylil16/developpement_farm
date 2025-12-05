/**
 * Utilitaires pour la géolocalisation et le calcul de distances
 */

import * as Location from 'expo-location';
import { Alert } from 'react-native';

/**
 * Obtenir la position actuelle de l'utilisateur
 */
export async function getUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // Demander permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission refusée',
        'Activez la localisation pour trouver des vétérinaires près de vous'
      );
      return null;
    }

    // Obtenir position
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Erreur géolocalisation:', error);
    Alert.alert('Erreur', 'Impossible d\'obtenir votre localisation');
    return null;
  }
}

/**
 * Convertir des degrés en radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculer la distance entre deux points géographiques (formule Haversine)
 * @param lat1 Latitude du premier point
 * @param lon1 Longitude du premier point
 * @param lat2 Latitude du deuxième point
 * @param lon2 Longitude du deuxième point
 * @returns Distance en kilomètres (arrondie)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance); // Distance en km (arrondie)
}

