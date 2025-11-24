/**
 * Sélecteurs pour le slice finance
 * Dénormalise les données normalisées pour les composants
 */

import { createSelector } from '@reduxjs/toolkit';
import { denormalize } from 'normalizr';
import { RootState } from '../store';
import {
  chargesFixesSchema,
  depensesPonctuellesSchema,
  revenusSchema,
} from '../normalization/schemas';
import { ChargeFixe, DepensePonctuelle, Revenu } from '../../types';

// Sélecteur de base pour l'état finance
const selectFinanceState = (state: RootState) => state.finance;

// Sélecteurs intermédiaires pour éviter les nouvelles références
const selectChargesFixesIds = createSelector(
  [selectFinanceState],
  (financeState) => financeState.ids.chargesFixes
);

const selectChargesFixesEntities = createSelector(
  [selectFinanceState],
  (financeState) => financeState.entities.chargesFixes
);

// Sélecteurs pour les charges fixes
export const selectAllChargesFixes = createSelector(
  [selectChargesFixesIds, selectChargesFixesEntities],
  (chargesFixesIds, chargesFixesEntities): ChargeFixe[] => {
    if (!chargesFixesIds || !chargesFixesEntities) return [];
    if (chargesFixesIds.length === 0) return [];
    const result = denormalize(chargesFixesIds, chargesFixesSchema, {
      chargesFixes: chargesFixesEntities,
    });
    return Array.isArray(result) ? result : [];
  }
);

export const selectChargeFixeById = createSelector(
  [selectFinanceState, (_: RootState, chargeId: string) => chargeId],
  (financeState, chargeId): ChargeFixe | undefined => {
    const { entities } = financeState;
    if (!entities.chargesFixes || !chargeId) return undefined;
    const normalized = denormalize([chargeId], chargesFixesSchema, {
      chargesFixes: entities.chargesFixes,
    });
    return Array.isArray(normalized) ? normalized[0] : undefined;
  }
);

// Sélecteurs intermédiaires pour les dépenses ponctuelles
const selectDepensesPonctuellesIds = createSelector(
  [selectFinanceState],
  (financeState) => financeState.ids.depensesPonctuelles
);

const selectDepensesPonctuellesEntities = createSelector(
  [selectFinanceState],
  (financeState) => financeState.entities.depensesPonctuelles
);

// Sélecteurs pour les dépenses ponctuelles
export const selectAllDepensesPonctuelles = createSelector(
  [selectDepensesPonctuellesIds, selectDepensesPonctuellesEntities],
  (depensesPonctuellesIds, depensesPonctuellesEntities): DepensePonctuelle[] => {
    if (!depensesPonctuellesIds || !depensesPonctuellesEntities) return [];
    if (depensesPonctuellesIds.length === 0) return [];
    const result = denormalize(depensesPonctuellesIds, depensesPonctuellesSchema, {
      depensesPonctuelles: depensesPonctuellesEntities,
    });
    return Array.isArray(result) ? result : [];
  }
);

export const selectDepensePonctuelleById = createSelector(
  [selectFinanceState, (_: RootState, depenseId: string) => depenseId],
  (financeState, depenseId): DepensePonctuelle | undefined => {
    const { entities } = financeState;
    if (!entities.depensesPonctuelles || !depenseId) return undefined;
    const normalized = denormalize([depenseId], depensesPonctuellesSchema, {
      depensesPonctuelles: entities.depensesPonctuelles,
    });
    return Array.isArray(normalized) ? normalized[0] : undefined;
  }
);

// Sélecteurs intermédiaires pour les revenus
const selectRevenusIds = createSelector(
  [selectFinanceState],
  (financeState) => financeState.ids.revenus
);

const selectRevenusEntities = createSelector(
  [selectFinanceState],
  (financeState) => financeState.entities.revenus
);

// Sélecteurs pour les revenus
export const selectAllRevenus = createSelector(
  [selectRevenusIds, selectRevenusEntities],
  (revenusIds, revenusEntities): Revenu[] => {
    if (!revenusIds || !revenusEntities) return [];
    if (revenusIds.length === 0) return [];
    const result = denormalize(revenusIds, revenusSchema, { revenus: revenusEntities });
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
