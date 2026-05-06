/**
 * Sélecteurs pour le slice finance
 */

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import type { ChargeFixe, DepensePonctuelle, Revenu } from '../../types/finance';

// Sélecteur de base pour l'état finance
const selectFinanceState = (state: RootState) => state.finance;

// Sélecteurs pour les charges fixes
export const selectAllChargesFixes = createSelector(
  [selectFinanceState],
  (state): ChargeFixe[] => state.chargesFixes ?? []
);

export const selectChargeFixeById = createSelector(
  [selectFinanceState, (_: RootState, chargeId: string) => chargeId],
  (state, chargeId): ChargeFixe | undefined =>
    state.chargesFixes.find((c) => c.id === chargeId)
);

// Sélecteurs pour les dépenses ponctuelles
export const selectAllDepensesPonctuelles = createSelector(
  [selectFinanceState],
  (state): DepensePonctuelle[] => state.depensesPonctuelles ?? []
);

/** Alias for backward compatibility */
export const selectDepensesPonctuelles = selectAllDepensesPonctuelles;

export const selectDepensePonctuelleById = createSelector(
  [selectFinanceState, (_: RootState, depenseId: string) => depenseId],
  (state, depenseId): DepensePonctuelle | undefined =>
    state.depensesPonctuelles.find((d) => d.id === depenseId)
);

// Sélecteurs pour les revenus
export const selectAllRevenus = createSelector(
  [selectFinanceState],
  (state): Revenu[] => state.revenus ?? []
);

export const selectRevenuById = createSelector(
  [selectFinanceState, (_: RootState, revenuId: string) => revenuId],
  (state, revenuId): Revenu | undefined =>
    state.revenus.find((r) => r.id === revenuId)
);

// Sélecteurs pour le loading et l'erreur
export const selectFinanceLoading = createSelector(
  [selectFinanceState],
  (state) => state.loading
);

export const selectFinanceError = createSelector(
  [selectFinanceState],
  (state) => state.error
);
