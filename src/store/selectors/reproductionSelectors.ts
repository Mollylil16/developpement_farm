/**
 * Sélecteurs pour le slice reproduction
 */

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import type { Gestation, Sevrage } from '../../types/reproduction';

// Sélecteur de base pour l'état reproduction
const selectReproductionState = (state: RootState) => state.reproduction;

export const selectAllGestations = createSelector(
  [selectReproductionState],
  (state): Gestation[] => state.gestations ?? []
);

export const selectGestationById = createSelector(
  [selectReproductionState, (_: RootState, gestationId: string) => gestationId],
  (state, gestationId): Gestation | undefined =>
    state.gestations.find((g) => g.id === gestationId)
);

export const selectAllSevrages = createSelector(
  [selectReproductionState],
  (state): Sevrage[] => state.sevrages ?? []
);

export const selectSevrageById = createSelector(
  [selectReproductionState, (_: RootState, sevrageId: string) => sevrageId],
  (state, sevrageId): Sevrage | undefined =>
    state.sevrages.find((s) => s.id === sevrageId)
);

export const selectSevragesByGestationId = createSelector(
  [selectReproductionState, (_: RootState, gestationId: string) => gestationId],
  (state, gestationId): Sevrage[] =>
    state.sevrages.filter((s) => s.gestation_id === gestationId)
);

export const selectReproductionLoading = createSelector(
  [selectReproductionState],
  (state) => state.loading
);

export const selectReproductionError = createSelector(
  [selectReproductionState],
  (state) => state.error
);
