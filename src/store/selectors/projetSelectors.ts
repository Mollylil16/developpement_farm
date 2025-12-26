/**
 * Sélecteurs pour le slice projet
 * Dénormalise les données normalisées pour les composants
 */

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import type { Projet } from '../../types/projet';

// Sélecteur de base pour l'état projet
const selectProjetState = (state: RootState) => state.projet;

// Sélecteur pour obtenir le projet actif
export const selectProjetActif = createSelector(
  [selectProjetState],
  (projetState): Projet | null => {
    return projetState.projetActif;
  }
);

// Sélecteur pour obtenir le loading state
export const selectProjetLoading = createSelector(
  [selectProjetState],
  (projetState) => projetState.loading
);

// Sélecteur pour obtenir l'erreur
export const selectProjetError = createSelector(
  [selectProjetState],
  (projetState) => projetState.error
);
