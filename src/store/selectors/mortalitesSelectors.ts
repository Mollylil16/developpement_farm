/**
 * Sélecteurs pour le slice mortalites
 * Dénormalise les données normalisées pour les composants
 */

import { createSelector } from '@reduxjs/toolkit';
import { denormalize } from 'normalizr';
import { RootState } from '../store';
import { mortalitesSchema } from '../normalization/schemas';
import { Mortalite } from '../../types';

// Sélecteur de base pour l'état mortalites
const selectMortalitesState = (state: RootState) => state.mortalites;

// Sélecteurs intermédiaires pour éviter les nouvelles références
const selectMortalitesIds = createSelector(
  [selectMortalitesState],
  (mortalitesState) => mortalitesState.ids.mortalites
);

const selectMortalitesEntities = createSelector(
  [selectMortalitesState],
  (mortalitesState) => mortalitesState.entities.mortalites
);

// Sélecteurs pour les mortalités
export const selectAllMortalites = createSelector(
  [selectMortalitesIds, selectMortalitesEntities],
  (mortalitesIds, mortalitesEntities): Mortalite[] => {
    if (!mortalitesIds || !mortalitesEntities) return [];
    if (mortalitesIds.length === 0) return [];
    const result = denormalize(mortalitesIds, mortalitesSchema, {
      mortalites: mortalitesEntities,
    });
    return Array.isArray(result) ? result : [];
  }
);

export const selectMortaliteById = createSelector(
  [selectMortalitesState, (_: RootState, mortaliteId: string) => mortaliteId],
  (mortalitesState, mortaliteId): Mortalite | undefined => {
    const { entities } = mortalitesState;
    if (!entities.mortalites || !mortaliteId) return undefined;
    const normalized = denormalize([mortaliteId], mortalitesSchema, {
      mortalites: entities.mortalites,
    });
    return Array.isArray(normalized) ? normalized[0] : undefined;
  }
);

// Sélecteur pour les statistiques
export const selectStatistiquesMortalite = createSelector(
  [selectMortalitesState],
  (mortalitesState) => mortalitesState.statistiques
);

// Sélecteur pour le nombre total de mortalités
export const selectNombreTotalMortalites = createSelector(
  [selectStatistiquesMortalite],
  (statistiques) => {
    const total = statistiques?.total_morts || 0;
    console.log('🔍 [selectNombreTotalMortalites] Statistiques:', {
      statistiques,
      total_morts: statistiques?.total_morts,
      retour: total
    });
    return total;
  }
);

// Sélecteurs pour le loading et l'erreur
export const selectMortalitesLoading = createSelector(
  [selectMortalitesState],
  (mortalitesState) => mortalitesState.loading
);

export const selectMortalitesError = createSelector(
  [selectMortalitesState],
  (mortalitesState) => mortalitesState.error
);
