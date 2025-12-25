/**
 * Hook pour la géolocalisation
 * Gère la localisation de l'utilisateur et le calcul de distances
 */

import { useState, useEffect, useCallback } from 'react';
import * as ExpoLocation from 'expo-location';
import { logger } from '../utils/logger';
import type { Location } from '../types/marketplace';

export interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
}

/**
 * Calculer la distance entre deux points (formule de Haversine)
 * Retourne la distance en kilomètres
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Arrondir à 1 décimale
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Hook personnalisé pour la géolocalisation
 */
export function useGeolocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  /**
   * Demander la permission de localisation
   */
  const requestPermission = useCallback(async () => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      setPermissionGranted(status === 'granted');
      return status === 'granted';
    } catch (err: unknown) {
      setError('Erreur lors de la demande de permission');
      logger.error('Permission error:', err);
      return false;
    }
  }, []);

  /**
   * Obtenir la localisation actuelle
   */
  const getCurrentLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Vérifier la permission
      const { status } = await ExpoLocation.getForegroundPermissionsAsync();

      if (status !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setError('Permission de localisation refusée');
          return null;
        }
      }

      // Obtenir la position
      const position = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });

      const userLocation: UserLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      // Essayer de reverse geocode pour obtenir ville/région
      try {
        const addresses = await ExpoLocation.reverseGeocodeAsync({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        if (addresses && addresses.length > 0) {
          const address = addresses[0];
          userLocation.city = address.city || address.subregion || undefined;
          userLocation.region = address.region || undefined;
        }
      } catch (geocodeError) {
        // Ignorer les erreurs de geocoding, on a au moins les coordonnées
        logger.warn('Geocoding error:', geocodeError);
      }

      setLocation(userLocation);
      return userLocation;
    } catch (err: unknown) {
      setError("Impossible d'obtenir votre localisation");
      logger.error('Location error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [requestPermission]);

  /**
   * Calculer la distance depuis la position de l'utilisateur
   */
  const getDistanceFrom = useCallback(
    (targetLocation: Location | UserLocation): number | null => {
      if (!location) return null;

      return calculateDistance(
        location.latitude,
        location.longitude,
        targetLocation.latitude,
        targetLocation.longitude
      );
    },
    [location]
  );

  /**
   * Trier un tableau de locations par distance
   */
  const sortByDistance = useCallback(
    <T extends { location: Location }>(items: T[]): T[] => {
      if (!location) return items;

      return [...items].sort((a, b) => {
        const distA = getDistanceFrom(a.location) || Infinity;
        const distB = getDistanceFrom(b.location) || Infinity;
        return distA - distB;
      });
    },
    [location, getDistanceFrom]
  );

  // Demander la permission au montage
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  return {
    location,
    loading,
    error,
    permissionGranted,
    getCurrentLocation,
    getDistanceFrom,
    sortByDistance,
    calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) =>
      calculateDistance(lat1, lon1, lat2, lon2),
  };
}
