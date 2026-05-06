/**
 * Sélecteurs pour le slice mortalites
 */

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import type { Mortalite, StatistiquesMortalite } from '../../types/mortalites';

// Sélecteur de base pour l'état mortalites
const selectMortalitesState = (state: RootState) => state.mortalites;

export const selectAllMortalites = createSelector(
  [selectMortalitesState],
  (state): Mortalite[] => state.mortalites ?? []
);

export const selectMortaliteById = createSelector(
  [selectMortalitesState, (_: RootState, mortaliteId: string) => mortaliteId],
  (state, mortaliteId): Mortalite | undefined =>
    state.mortalites.find((m) => m.id === mortaliteId)
);

export const selectStatistiquesMortalite = createSelector(
  [selectMortalitesState],
  (state): StatistiquesMortalite | null => state.statistiques ?? null
);

export const selectNombreTotalMortalites = createSelector(
  [selectStatistiquesMortalite],
  (statistiques) => statistiques?.total_morts || 0
);

export const selectMortalitesLoading = createSelector(
  [selectMortalitesState],
  (state) => state.loading
);

export const selectMortalitesError = createSelector(
  [selectMortalitesState],
  (state) => state.error
);
