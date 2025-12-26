/**
 * Hook custom pour gérer les données de profil utilisateur
 * Responsabilités:
 * - Charger la photo de profil depuis la base de données
 * - Gérer les initiales
 * - Gérer le prénom
 * - Recharger au focus de l'écran
 */

import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAppSelector } from '../store/hooks';
import apiClient from '../services/api/apiClient';
import { logger } from '../utils/logger';

interface UseProfilDataReturn {
  profilPhotoUri: string | null;
  profilInitiales: string;
  profilPrenom: string;
  loadProfilPhoto: () => Promise<void>;
}

export function useProfilData(): UseProfilDataReturn {
  const { user } = useAppSelector((state) => state.auth);
  const [profilPhotoUri, setProfilPhotoUri] = useState<string | null>(null);
  const [profilInitiales, setProfilInitiales] = useState<string>('');
  const [profilPrenom, setProfilPrenom] = useState<string>('');

  /**
   * Charge la photo et les infos de profil depuis la base de données (table users)
   */
  const loadProfilPhoto = useCallback(async () => {
    try {
      if (!user?.id) {
        // Pas d'utilisateur connecté, réinitialiser
        setProfilPhotoUri(null);
        setProfilPrenom('');
        setProfilInitiales('');
        return;
      }

      // Charger depuis l'API backend
      const apiUser = await apiClient.get<any>(`/users/${user.id}`);

      if (apiUser) {
        // Mettre à jour les états avec les données de l'API
        setProfilPhotoUri(apiUser.photo || null);
        setProfilPrenom(apiUser.prenom || '');

        // Générer les initiales (Prénom + Nom)
        if (apiUser.prenom && apiUser.nom) {
          const initiales = `${apiUser.prenom.charAt(0).toUpperCase()}${apiUser.nom.charAt(0).toUpperCase()}`;
          setProfilInitiales(initiales);
        } else {
          setProfilInitiales('');
        }
      } else {
        // Si l'utilisateur n'existe pas dans la DB, utiliser les données du state Redux
        if (user) {
          setProfilPhotoUri(user.photo || null);
          setProfilPrenom(user.prenom || '');
          if (user.prenom && user.nom) {
            const initiales = `${user.prenom.charAt(0).toUpperCase()}${user.nom.charAt(0).toUpperCase()}`;
            setProfilInitiales(initiales);
          } else {
            setProfilInitiales('');
          }
        }
      }
    } catch (error) {
      logger.error('Erreur chargement photo profil:', error);
      // En cas d'erreur, utiliser les données du state Redux comme fallback
      if (user) {
        setProfilPhotoUri(user.photo || null);
        setProfilPrenom(user.prenom || '');
        if (user.prenom && user.nom) {
          const initiales = `${user.prenom.charAt(0).toUpperCase()}${user.nom.charAt(0).toUpperCase()}`;
          setProfilInitiales(initiales);
        } else {
          setProfilInitiales('');
        }
      }
    }
  }, [user?.id]);

  /**
   * Recharger la photo à chaque fois que l'écran revient au focus
   */
  useFocusEffect(
    useCallback(() => {
      loadProfilPhoto();
    }, [loadProfilPhoto])
  );

  return {
    profilPhotoUri,
    profilInitiales,
    profilPrenom,
    loadProfilPhoto,
  };
}
