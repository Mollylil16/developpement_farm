/**
 * Hook pour gérer les permissions d'action (créer, modifier, supprimer)
 */

import { usePermissions, PermissionType } from './usePermissions';

export type ActionType = 'create' | 'update' | 'delete';

interface UseActionPermissionsReturn {
  /**
   * Vérifie si l'utilisateur peut effectuer une action dans un module
   * @param module - Le module concerné
   * @param action - L'action à vérifier (create, update, delete)
   * @returns true si l'action est autorisée
   */
  canPerformAction: (module: PermissionType, action: ActionType) => boolean;

  /**
   * Vérifie si l'utilisateur peut créer dans un module
   */
  canCreate: (module: PermissionType) => boolean;

  /**
   * Vérifie si l'utilisateur peut modifier dans un module
   */
  canUpdate: (module: PermissionType) => boolean;

  /**
   * Vérifie si l'utilisateur peut supprimer dans un module
   */
  canDelete: (module: PermissionType) => boolean;
}

/**
 * Hook pour vérifier les permissions d'action
 *
 * Pour l'instant, si un utilisateur a accès à un module, il peut effectuer
 * toutes les actions (create, update, delete) dans ce module.
 *
 * @example
 * const { canCreate, canUpdate, canDelete } = useActionPermissions();
 *
 * if (canCreate('reproduction')) {
 *   // Afficher le bouton "Créer"
 * }
 */
export function useActionPermissions(): UseActionPermissionsReturn {
  const { hasPermission, isProprietaire } = usePermissions();

  const canPerformAction = (module: PermissionType, action: ActionType): boolean => {
    // Le propriétaire peut tout faire
    if (isProprietaire) {
      return true;
    }

    // Pour l'instant, si l'utilisateur a accès au module, il peut effectuer toutes les actions
    // Dans le futur, on pourra ajouter des permissions granulaires par action
    return hasPermission(module);
  };

  const canCreate = (module: PermissionType): boolean => {
    return canPerformAction(module, 'create');
  };

  const canUpdate = (module: PermissionType): boolean => {
    return canPerformAction(module, 'update');
  };

  const canDelete = (module: PermissionType): boolean => {
    return canPerformAction(module, 'delete');
  };

  return {
    canPerformAction,
    canCreate,
    canUpdate,
    canDelete,
  };
}
