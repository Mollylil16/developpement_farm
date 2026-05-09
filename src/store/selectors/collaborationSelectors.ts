/**
 * Sélecteurs Redux pour le module Collaboration
 */

import { RootState } from '../store';
import type { Collaborateur } from '../../types/collaboration';

/**
 * Sélectionner tous les collaborateurs
 */
export const selectAllCollaborateurs = (state: RootState): Collaborateur[] => {
  return (state.collaboration as any).collaborateurs || [];
};

/**
 * Sélectionner le collaborateur actuel
 */
export const selectCollaborateurActuel = (state: RootState): Collaborateur | null => {
  return (state.collaboration as any).collaborateurActuel;
};

/**
 * Sélectionner les invitations en attente
 */
export const selectInvitationsEnAttente = (state: RootState): Collaborateur[] => {
  return (state.collaboration as any).invitationsEnAttente || [];
};

/**
 * Sélectionner l'état de chargement
 */
export const selectCollaborationLoading = (state: RootState): boolean => {
  return state.collaboration.loading;
};

/**
 * Sélectionner l'erreur
 */
export const selectCollaborationError = (state: RootState): string | null => {
  return (state.collaboration as any).error ?? null;
};

/**
 * Sélectionner les collaborateurs par rôle
 */
export const selectCollaborateursByRole = (state: RootState, role: string): Collaborateur[] => {
  return ((state.collaboration as any).collaborateurs || []).filter((c: any) => c.role === role);
};

/**
 * Sélectionner les collaborateurs actifs
 */
export const selectCollaborateursActifs = (state: RootState): Collaborateur[] => {
  return ((state.collaboration as any).collaborateurs || []).filter((c: any) => c.statut === 'actif');
};

/**
 * Sélectionner le vétérinaire du projet (s'il existe)
 */
export const selectVeterinaire = (state: RootState): Collaborateur | undefined => {
  return ((state.collaboration as any).collaborateurs || []).find(
    (c: any) => c.role === 'veterinaire' && c.statut === 'actif'
  );
};
