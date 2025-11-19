/**
 * Sélecteurs pour le slice finance
 * Dénormalise les données normalisées pour les composants
 */

import { createSelector } from '@reduxjs/toolkit';
import { denormalize } from 'normalizr';
import { RootState } from '../store';
import { chargesFixesSchema, depensesPonctuellesSchema, revenusSchema } from '../normalization/schemas';
import { ChargeFixe, DepensePonctuelle, Revenu } from '../../types';

// Sélecteur de base pour l'état finance
const selectFinanceState = (state: RootState) => state.finance;

// Sélecteurs pour les charges fixes
export const selectAllChargesFixes = createSelector(
  [selectFinanceState],
  (financeState): ChargeFixe[] => {
    const { entities, ids } = financeState;
    const chargesFixesIds = ids.chargesFixes || [];
    const result = denormalize(chargesFixesIds, chargesFixesSchema, { chargesFixes: entities.chargesFixes });
    return Array.isArray(result) ? result : [];
  }
);

export const selectChargeFixeById = createSelector(
  [selectFinanceState, (_: RootState, chargeId: string) => chargeId],
  (financeState, chargeId): ChargeFixe | undefined => {
    const { entities } = financeState;
    if (!entities.chargesFixes || !chargeId) return undefined;
    const normalized = denormalize([chargeId], chargesFixesSchema, { chargesFixes: entities.chargesFixes });
    return Array.isArray(normalized) ? normalized[0] : undefined;
  }
);

// Sélecteurs pour les dépenses ponctuelles
export const selectAllDepensesPonctuelles = createSelector(
  [selectFinanceState],
  (financeState): DepensePonctuelle[] => {
    const { entities, ids } = financeState;
    const depensesPonctuellesIds = ids.depensesPonctuelles || [];
    const result = denormalize(depensesPonctuellesIds, depensesPonctuellesSchema, { depensesPonctuelles: entities.depensesPonctuelles });
    return Array.isArray(result) ? result : [];
  }
);

export const selectDepensePonctuelleById = createSelector(
  [selectFinanceState, (_: RootState, depenseId: string) => depenseId],
  (financeState, depenseId): DepensePonctuelle | undefined => {
    const { entities } = financeState;
    if (!entities.depensesPonctuelles || !depenseId) return undefined;
    const normalized = denormalize([depenseId], depensesPonctuellesSchema, { depensesPonctuelles: entities.depensesPonctuelles });
    return Array.isArray(normalized) ? normalized[0] : undefined;
  }
);

// Sélecteurs pour les revenus
export const selectAllRevenus = createSelector(
  [selectFinanceState],
  (financeState): Revenu[] => {
    const { entities, ids } = financeState;
    const revenusIds = ids.revenus || [];
    const result = denormalize(revenusIds, revenusSchema, { revenus: entities.revenus });
    return Array.isArray(result) ? result : [];
  }
);

export const selectRevenuById = createSelector(
  [selectFinanceState, (_: RootState, revenuId: string) => revenuId],
  (financeState, revenuId): Revenu | undefined => {
    const { entities } = financeState;
    if (!entities.revenus || !revenuId) return undefined;
    const normalized = denormalize([revenuId], revenusSchema, { revenus: entities.revenus });
    return Array.isArray(normalized) ? normalized[0] : undefined;
  }
);

// Sélecteurs pour le loading et l'erreur
export const selectFinanceLoading = createSelector(
  [selectFinanceState],
  (financeState) => financeState.loading
);

export const selectFinanceError = createSelector(
  [selectFinanceState],
  (financeState) => financeState.error
);

