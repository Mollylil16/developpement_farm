/**
 * Sélecteurs Redux pour le module Collaboration
 */

import { RootState } from '../store';
import { Collaborateur } from '../../types';

/**
 * Sélectionner tous les collaborateurs
 */
export const selectAllCollaborateurs = (state: RootState): Collaborateur[] => {
  return state.collaboration.collaborateurs || [];
};

/**
 * Sélectionner le collaborateur actuel
 */
export const selectCollaborateurActuel = (state: RootState): Collaborateur | null => {
  return state.collaboration.collaborateurActuel;
};

/**
 * Sélectionner les invitations en attente
 */
export const selectInvitationsEnAttente = (state: RootState): Collaborateur[] => {
  return state.collaboration.invitationsEnAttente || [];
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
  return state.collaboration.error;
};

/**
 * Sélectionner les collaborateurs par rôle
 */
export const selectCollaborateursByRole = (state: RootState, role: string): Collaborateur[] => {
  return (state.collaboration.collaborateurs || []).filter((c) => c.role === role);
};

/**
 * Sélectionner les collaborateurs actifs
 */
export const selectCollaborateursActifs = (state: RootState): Collaborateur[] => {
  return (state.collaboration.collaborateurs || []).filter((c) => c.statut === 'actif');
};

/**
 * Sélectionner le vétérinaire du projet (s'il existe)
 */
export const selectVeterinaire = (state: RootState): Collaborateur | undefined => {
  return (state.collaboration.collaborateurs || []).find(
    (c) => c.role === 'veterinaire' && c.statut === 'actif'
  );
};

