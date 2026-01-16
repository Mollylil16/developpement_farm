/**
 * Hook custom pour gérer les données de profil utilisateur
 * Responsabilités:
 * - Charger la photo de profil depuis la base de données
 * - Gérer les initiales
 * - Gérer le prénom
 * - Recharger au focus de l'écran
 * - Synchroniser automatiquement avec les autres appareils
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import apiClient from '../services/api/apiClient';
import { logger } from '../utils/logger';
import { profileSyncService } from '../services/profileSyncService';
import { normalizePhotoUri } from '../utils/profilePhotoUtils';

interface UseProfilDataReturn {
  profilPhotoUri: string | null;
  profilInitiales: string;
  profilPrenom: string;
  loadProfilPhoto: () => Promise<void>;
}

export function useProfilData(): UseProfilDataReturn {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [profilPhotoUri, setProfilPhotoUri] = useState<string | null>(null);
  const [profilInitiales, setProfilInitiales] = useState<string>('');
  const [profilPrenom, setProfilPrenom] = useState<string>('');
  const syncStartedRef = useRef(false);

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
        // Mettre à jour les états avec les données de l'API (normaliser l'URI)
        setProfilPhotoUri(normalizePhotoUri(apiUser.photo || null));
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

  /**
   * Démarrer la synchronisation automatique du profil
   * La synchronisation vérifie périodiquement si la photo a changé
   */
  useEffect(() => {
    if (!user?.id || syncStartedRef.current) {
      return;
    }

    // Démarrer la synchronisation
    profileSyncService.start(
      user.id,
      dispatch,
      {
        checkInterval: 30000, // Vérifier toutes les 30 secondes
        onProfileChanged: (updatedUser) => {
          // Mettre à jour les états locaux quand un changement est détecté (normaliser l'URI)
          setProfilPhotoUri(normalizePhotoUri(updatedUser.photo || null));
          setProfilPrenom(updatedUser.prenom || '');
          if (updatedUser.prenom && updatedUser.nom) {
            const initiales = `${updatedUser.prenom.charAt(0).toUpperCase()}${updatedUser.nom.charAt(0).toUpperCase()}`;
            setProfilInitiales(initiales);
          } else {
            setProfilInitiales('');
          }
          logger.log('[useProfilData] Profil mis à jour via synchronisation');
        },
      }
    );

    syncStartedRef.current = true;

    // Nettoyer à la déconnexion ou changement d'utilisateur
    return () => {
      profileSyncService.stop();
      syncStartedRef.current = false;
    };
  }, [user?.id, dispatch]);

  /**
   * Mettre à jour les états locaux quand le user Redux change
   * (pour prendre en compte les mises à jour locales)
   */
  useEffect(() => {
    if (user) {
      // Normaliser l'URI pour éviter les problèmes de cache
      setProfilPhotoUri(normalizePhotoUri(user.photo || null));
      setProfilPrenom(user.prenom || '');
      if (user.prenom && user.nom) {
        const initiales = `${user.prenom.charAt(0).toUpperCase()}${user.nom.charAt(0).toUpperCase()}`;
        setProfilInitiales(initiales);
      } else {
        setProfilInitiales('');
      }
    }
  }, [user?.photo, user?.prenom, user?.nom]);

  return {
    profilPhotoUri,
    profilInitiales,
    profilPrenom,
    loadProfilPhoto,
  };
}
