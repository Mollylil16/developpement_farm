/**
 * Hook personnalisé pour gérer les permissions du collaborateur actuel
 */

import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { Collaborateur } from '../types';

export type PermissionType =
  | 'reproduction'
  | 'nutrition'
  | 'finance'
  | 'rapports'
  | 'planification'
  | 'mortalites'
  | 'sante';

interface UsePermissionsReturn {
  // Le collaborateur actuel (null si l'utilisateur est propriétaire)
  collaborateurActuel: Collaborateur | null;

  // Vérifier si l'utilisateur est propriétaire du projet
  isProprietaire: boolean;

  // Vérifier si l'utilisateur est collaborateur
  isCollaborateur: boolean;

  // Vérifier une permission spécifique
  hasPermission: (permission: PermissionType) => boolean;

  // Vérifier plusieurs permissions (toutes doivent être vraies)
  hasAllPermissions: (permissions: PermissionType[]) => boolean;

  // Vérifier au moins une permission (au moins une doit être vraie)
  hasAnyPermission: (permissions: PermissionType[]) => boolean;

  // Obtenir toutes les permissions
  permissions: Collaborateur['permissions'] | null;

  // Rôle du collaborateur (si collaborateur)
  role: Collaborateur['role'] | null;
}

/**
 * Hook pour gérer les permissions du collaborateur actuel
 *
 * @example
 * const { hasPermission, isProprietaire } = usePermissions();
 *
 * if (hasPermission('finance')) {
 *   // Afficher le module Finance
 * }
 */
export function usePermissions(): UsePermissionsReturn {
  const { user } = useAppSelector((state) => state.auth);
  const { projetActif } = useAppSelector((state) => state.projet);
  const { collaborateurActuel } = useAppSelector((state) => state.collaboration);

  const result = useMemo(() => {
    // Si pas de projet actif, pas de permissions
    if (!projetActif || !user) {
      return {
        collaborateurActuel: null,
        isProprietaire: false,
        isCollaborateur: false,
        hasPermission: () => false,
        hasAllPermissions: () => false,
        hasAnyPermission: () => false,
        permissions: null,
        role: null,
      };
    }

    // Vérifier si l'utilisateur est propriétaire du projet
    const isProprietaire = projetActif.proprietaire_id === user.id;

    // Si propriétaire, toutes les permissions sont accordées
    if (isProprietaire) {
      return {
        collaborateurActuel: null,
        isProprietaire: true,
        isCollaborateur: false,
        hasPermission: () => true, // Propriétaire a toutes les permissions
        hasAllPermissions: () => true,
        hasAnyPermission: () => true,
        permissions: {
          reproduction: true,
          nutrition: true,
          finance: true,
          rapports: true,
          planification: true,
          mortalites: true,
          sante: true,
        },
        role: null,
      };
    }

    // Si collaborateur, utiliser ses permissions
    if (collaborateurActuel && collaborateurActuel.statut === 'actif') {
      const permissions = collaborateurActuel.permissions;

      return {
        collaborateurActuel,
        isProprietaire: false,
        isCollaborateur: true,
        hasPermission: (permission: PermissionType) => {
          return permissions[permission] === true;
        },
        hasAllPermissions: (perms: PermissionType[]) => {
          return perms.every((p) => permissions[p] === true);
        },
        hasAnyPermission: (perms: PermissionType[]) => {
          return perms.some((p) => permissions[p] === true);
        },
        permissions,
        role: collaborateurActuel.role,
      };
    }

    // Si ni propriétaire ni collaborateur actif, pas de permissions
    return {
      collaborateurActuel: null,
      isProprietaire: false,
      isCollaborateur: false,
      hasPermission: () => false,
      hasAllPermissions: () => false,
      hasAnyPermission: () => false,
      permissions: null,
      role: null,
    };
  }, [
    user?.id,
    projetActif?.id,
    collaborateurActuel?.id,
    collaborateurActuel?.statut,
    collaborateurActuel?.role,
    // Ajouter les permissions pour qu'elles se mettent à jour quand le rôle change
    collaborateurActuel?.permissions?.reproduction,
    collaborateurActuel?.permissions?.nutrition,
    collaborateurActuel?.permissions?.finance,
    collaborateurActuel?.permissions?.rapports,
    collaborateurActuel?.permissions?.planification,
    collaborateurActuel?.permissions?.mortalites,
  ]); // ✅ Utiliser des propriétés primitives au lieu de l'objet complet pour éviter les boucles infinies

  return result;
}
