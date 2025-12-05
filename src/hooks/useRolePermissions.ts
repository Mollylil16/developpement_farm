/**
 * Hook pour gérer les permissions par rôle
 * Extension non-destructive de l'architecture existante
 */

import { useRole } from '../contexts/RoleContext';
import { RoleType } from '../types';

/**
 * Permissions disponibles dans l'application
 */
export interface RolePermissions {
  // Cheptel
  canViewHerd: boolean;
  canEditHerd: boolean;
  canAddAnimals: boolean;
  
  // Finances
  canViewFinances: boolean;
  canEditFinances: boolean;
  
  // Marketplace
  canAccessMarketplace: boolean;
  canSellOnMarketplace: boolean;
  canBuyOnMarketplace: boolean;
  
  // Santé
  canViewHealthRecords: boolean;
  canEditHealthRecords: boolean;
  
  // Rapports
  canGenerateReports: boolean;
}

/**
 * Permissions par rôle
 */
const permissionsByRole: Record<RoleType, RolePermissions> = {
  producer: {
    canViewHerd: true,
    canEditHerd: true,
    canAddAnimals: true,
    canViewFinances: true,
    canEditFinances: true,
    canAccessMarketplace: true,
    canSellOnMarketplace: true,
    canBuyOnMarketplace: true, // Peut acheter SAUF ses propres annonces
    canViewHealthRecords: true,
    canEditHealthRecords: true,
    canGenerateReports: true,
  },

  buyer: {
    canViewHerd: false,
    canEditHerd: false,
    canAddAnimals: false,
    canViewFinances: false,
    canEditFinances: false,
    canAccessMarketplace: true,
    canSellOnMarketplace: false,
    canBuyOnMarketplace: true,
    canViewHealthRecords: false,
    canEditHealthRecords: false,
    canGenerateReports: false,
  },

  veterinarian: {
    canViewHerd: true, // Uniquement ses clients
    canEditHerd: false,
    canAddAnimals: false,
    canViewFinances: false,
    canEditFinances: false,
    canAccessMarketplace: false, // Pas d'accès au marketplace
    canSellOnMarketplace: false,
    canBuyOnMarketplace: false,
    canViewHealthRecords: true,
    canEditHealthRecords: true, // Diagnostics, traitements
    canGenerateReports: true, // Rapports sanitaires (selon permissions collaboration)
  },

  technician: {
    canViewHerd: true, // Selon permissions données
    canEditHerd: true, // Selon permissions données
    canAddAnimals: true, // Selon permissions données
    canViewFinances: false, // Généralement non
    canEditFinances: false,
    canAccessMarketplace: false,
    canSellOnMarketplace: false,
    canBuyOnMarketplace: false,
    canViewHealthRecords: true,
    canEditHealthRecords: true, // Enregistrer traitements
    canGenerateReports: true,
  },
};

/**
 * Hook pour obtenir les permissions de l'utilisateur actuel basées sur son rôle
 */
export const useRolePermissions = (): RolePermissions => {
  const { activeRole } = useRole();

  // S'assurer que activeRole est valide, sinon utiliser 'producer' par défaut
  const validRole = activeRole && permissionsByRole[activeRole] ? activeRole : 'producer';
  return permissionsByRole[validRole];
};

