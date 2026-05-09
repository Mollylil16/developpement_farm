/**
 * Contexte pour gérer les rôles utilisateur
 * Extension non-destructive de l'architecture existante
 */

import React, { createContext, useContext, useMemo, useCallback, useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { User, RoleType } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateUser, signOut } from '../store/slices/authSlice';
import { getDatabase } from '../services/database';
import { UserRepository } from '../database/repositories/UserRepository';
import { UserDataService } from '../services/UserDataService';

const AUTH_STORAGE_KEY = '@fermier_pro:auth';

interface RoleContextType {
  currentUser: User | null;
  activeRole: RoleType;
  availableRoles: RoleType[];
  switchRole: (role: RoleType) => Promise<void>;
  hasRole: (role: RoleType) => boolean;
  logoutRole: () => Promise<void>;
  deleteProfile: (role: RoleType) => Promise<void>;
  isProducer: boolean;
  isBuyer: boolean;
  isVeterinarian: boolean;
  isTechnician: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

/**
 * Provider pour gérer les rôles utilisateur
 */
export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const userFromRedux = useAppSelector((state) => (state as any).auth.user);
  const [activeRole, setActiveRole] = useState<RoleType>('producer');

  // Charger le rôle actif depuis l'utilisateur
  useEffect(() => {
    if (userFromRedux) {
      // Si l'utilisateur a un activeRole défini, l'utiliser
      if (userFromRedux.activeRole) {
        setActiveRole(userFromRedux.activeRole);
      } else {
        // Sinon, déterminer le rôle par défaut
        const defaultRole = determineDefaultRole(userFromRedux);
        setActiveRole(defaultRole);
      }
    }
  }, [userFromRedux]);

  /**
   * Détermine le rôle par défaut pour un utilisateur
   */
  const determineDefaultRole = useCallback((user: User): RoleType => {
    // Si l'utilisateur a des rôles définis, prendre le premier disponible
    if (user.roles) {
      if (user.roles.producer) return 'producer';
      if (user.roles.buyer) return 'buyer';
      if (user.roles.veterinarian) return 'veterinarian';
      if (user.roles.technician) return 'technician';
    }
    
    // Par défaut, tous les utilisateurs existants sont producteurs
    return 'producer';
  }, []);

  /**
   * Rôles disponibles pour l'utilisateur actuel
   */
  const availableRoles = useMemo(() => {
    if (!userFromRedux?.roles) {
      // Si pas de rôles définis, considérer comme producteur (compatibilité)
      return ['producer'];
    }

    const roles: RoleType[] = [];
    if (userFromRedux.roles.producer) roles.push('producer');
    if (userFromRedux.roles.buyer) roles.push('buyer');
    if (userFromRedux.roles.veterinarian) roles.push('veterinarian');
    if (userFromRedux.roles.technician) roles.push('technician');

    // Si aucun rôle, retourner producteur par défaut
    return roles.length > 0 ? roles : ['producer'];
  }, [userFromRedux]);

  /**
   * Vérifie si l'utilisateur a un rôle spécifique
   */
  const hasRole = useCallback(
    (role: RoleType): boolean => {
      return availableRoles.includes(role);
    },
    [availableRoles]
  );

  /**
   * Change le rôle actif de l'utilisateur
   */
  const switchRole = useCallback(
    async (role: RoleType) => {
      if (!hasRole(role)) {
        throw new Error(`Vous n'avez pas le rôle ${role}`);
      }

      if (!userFromRedux) {
        throw new Error('Aucun utilisateur connecté');
      }

      // Mettre à jour le rôle actif
      setActiveRole(role);

      // Mettre à jour l'utilisateur dans Redux
      const updatedUser: User = {
        ...userFromRedux,
        activeRole: role,
      };

      dispatch(updateUser(updatedUser));

      // Persister dans AsyncStorage
      try {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du rôle:', error);
      }

      // TODO: Persister dans la base de données SQLite
      // await updateUserActiveRole(userFromRedux.id, role);
    },
    [hasRole, userFromRedux, dispatch]
  );

  /**
   * Déconnecte uniquement le profil actuel (retourne à l'écran de sélection de profil)
   * Les données du profil sont préservées pour permettre une reconnexion ultérieure
   * 
   * 🔧 CORRECTION: Ne supprime pas les données, juste déconnecte la session actuelle
   * L'utilisateur sera redirigé vers l'écran de sélection de profil où il pourra
   * choisir un autre profil ou se reconnecter avec le même compte
   */
  const logoutRole = useCallback(async () => {
    if (!userFromRedux) {
      throw new Error('Aucun utilisateur connecté');
    }

    // Ne pas supprimer les données de la base de données, juste déconnecter la session
    // L'utilisateur sera redirigé vers l'écran de sélection de profil
    // Les données restent dans la base de données pour permettre une reconnexion
    
    // Utiliser signOut() qui réinitialise l'état d'authentification
    // Cela déclenchera la redirection vers l'écran de sélection de profil via AppNavigator
    await dispatch(signOut()).unwrap();
  }, [userFromRedux, dispatch]);

  /**
   * Supprime un profil spécifique et toutes ses données associées
   * ⚠️ ATTENTION: Cette opération est irréversible
   */
  const deleteProfile = useCallback(
    async (role: RoleType) => {
      if (!userFromRedux) {
        throw new Error('Aucun utilisateur connecté');
      }

      if (!hasRole(role)) {
        throw new Error(`Vous n'avez pas le rôle ${role}`);
      }

      // Si c'est le seul profil, on ne peut pas le supprimer
      if (availableRoles.length === 1) {
        throw new Error('Impossible de supprimer le dernier profil. Vous devez avoir au moins un profil.');
      }

      try {
        const db = await getDatabase();
        const userRepo = new UserRepository();

        // Supprimer les données associées au rôle
        if (role === 'producer') {
          // Supprimer tous les projets et données associées du producteur
          await UserDataService.clearUserData(userFromRedux.id);
        }
        // Pour les autres rôles (buyer, veterinarian, technician), 
        // on pourrait ajouter une logique spécifique ici si nécessaire
        // (ex: supprimer les commandes, consultations, etc.)

        // Mettre à jour l'utilisateur : supprimer le rôle
        const updatedRoles = { ...userFromRedux.roles };
        delete updatedRoles[role];

        // Si le rôle supprimé était le rôle actif, basculer vers un autre rôle disponible
        let newActiveRole = activeRole;
        if (activeRole === role) {
          const remainingRoles = availableRoles.filter((r) => r !== role);
          if (remainingRoles.length > 0) {
            newActiveRole = remainingRoles[0] as any;
          }
        }

        // Mettre à jour dans la base de données
        // 🔧 CORRECTION: userRepo.update() attend (id, updates) et non un objet User complet
        await userRepo.update(userFromRedux.id, {
          roles: updatedRoles,
          activeRole: newActiveRole !== role ? newActiveRole : undefined,
        });

        // Récupérer l'utilisateur mis à jour depuis la base de données
        const updatedUser = await userRepo.findById(userFromRedux.id);
        if (!updatedUser) {
          throw new Error('Impossible de récupérer l\'utilisateur mis à jour');
        }

        // Mettre à jour dans Redux
        dispatch(updateUser(updatedUser));

        // Mettre à jour dans AsyncStorage
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));

        // Mettre à jour le rôle actif local
        if (newActiveRole !== role) {
          setActiveRole(newActiveRole);
        }
      } catch (error) {
        console.error('Erreur lors de la suppression du profil:', error);
        throw error;
      }
    },
    [userFromRedux, hasRole, availableRoles, activeRole, dispatch]
  );

  // Valeurs calculées pour faciliter l'utilisation
  const isProducer = activeRole === 'producer';
  const isBuyer = activeRole === 'buyer';
  const isVeterinarian = activeRole === 'veterinarian';
  const isTechnician = activeRole === 'technician';

  // Mémoriser la valeur du contexte pour éviter les re-renders
  const value = useMemo(
    () => ({
      currentUser: userFromRedux,
      activeRole,
      availableRoles,
      switchRole,
      hasRole,
      logoutRole,
      deleteProfile,
      isProducer,
      isBuyer,
      isVeterinarian,
      isTechnician,
    }),
    [userFromRedux, activeRole, availableRoles, switchRole, hasRole, logoutRole, deleteProfile, isProducer, isBuyer, isVeterinarian, isTechnician]
  );

  return <RoleContext.Provider value={value as any}>{children}</RoleContext.Provider>;
};

/**
 * Hook pour utiliser le contexte des rôles
 * Retourne des valeurs par défaut si le contexte n'est pas disponible (pour éviter les erreurs lors du lazy loading)
 */
export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (!context) {
    // Au lieu de lancer une erreur, retourner des valeurs par défaut
    // Cela peut arriver lors du lazy loading avant que le provider ne soit monté
    // En mode production, ne pas logger pour améliorer les performances
    if (__DEV__) {
      console.warn('useRole appelé en dehors de RoleProvider, utilisation des valeurs par défaut');
    }
    return {
      currentUser: null,
      activeRole: 'producer',
      availableRoles: ['producer'],
      switchRole: async () => {
        throw new Error('RoleProvider non disponible');
      },
      hasRole: () => false,
      logoutRole: async () => {
        throw new Error('RoleProvider non disponible');
      },
      deleteProfile: async () => {
        throw new Error('RoleProvider non disponible');
      },
      isProducer: true,
      isBuyer: false,
      isVeterinarian: false,
      isTechnician: false,
    };
  }
  return context;
};

