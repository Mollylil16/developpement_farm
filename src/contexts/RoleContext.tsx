/**
 * Contexte pour gérer les rôles utilisateur
 * Extension non-destructive de l'architecture existante
 */

import React, { createContext, useContext, useMemo, useCallback, useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import type { User } from '../types/auth';
import type { RoleType } from '../types/roles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateUser } from '../store/slices/authSlice';

const AUTH_STORAGE_KEY = '@fermier_pro:auth';

interface RoleContextType {
  currentUser: User | null;
  activeRole: RoleType;
  availableRoles: RoleType[];
  switchRole: (role: RoleType) => Promise<void>;
  hasRole: (role: RoleType) => boolean;
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
  const userFromRedux = useAppSelector((state) => state.auth.user);
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
  const availableRoles = useMemo((): RoleType[] => {
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
      isProducer,
      isBuyer,
      isVeterinarian,
      isTechnician,
    }),
    [
      userFromRedux,
      activeRole,
      availableRoles,
      switchRole,
      hasRole,
      isProducer,
      isBuyer,
      isVeterinarian,
      isTechnician,
    ]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
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
      isProducer: true,
      isBuyer: false,
      isVeterinarian: false,
      isTechnician: false,
    };
  }
  return context;
};
