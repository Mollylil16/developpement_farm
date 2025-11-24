/**
 * Sélecteurs pour le slice reproduction
 * Dénormalise les données normalisées pour les composants
 */

import { createSelector } from '@reduxjs/toolkit';
import { denormalize } from 'normalizr';
import { RootState } from '../store';
import { gestationsSchema, sevragesSchema } from '../normalization/schemas';
import { Gestation, Sevrage } from '../../types';

// Sélecteur de base pour l'état reproduction
const selectReproductionState = (state: RootState) => state.reproduction;

// ✅ CORRECTION CRITIQUE: Mémoïser basé sur les IDs pour éviter les re-renders
// Sélecteur intermédiaire pour les IDs
const selectGestationsIds = createSelector(
  [selectReproductionState],
  (reproductionState) => reproductionState.ids.gestations // ❌ PAS de || [] qui crée de nouveaux arrays !
);

// Sélecteur intermédiaire pour les entities
const selectGestationsEntities = createSelector(
  [selectReproductionState],
  (reproductionState) => reproductionState.entities.gestations // ❌ PAS de || {} qui crée de nouveaux objets !
);

// Sélecteur final qui dénormalise seulement si IDs ou entities changent
export const selectAllGestations = createSelector(
  [selectGestationsIds, selectGestationsEntities],
  (gestationsIds, gestationsEntities): Gestation[] => {
    if (!gestationsIds || !gestationsEntities) return []; // ✅ Vérifier null/undefined
    if (gestationsIds.length === 0) return [];
    const result = denormalize(gestationsIds, gestationsSchema, { gestations: gestationsEntities });
    return Array.isArray(result) ? result : [];
  }
);

export const selectGestationById = createSelector(
  [selectReproductionState, (_: RootState, gestationId: string) => gestationId],
  (reproductionState, gestationId): Gestation | undefined => {
    const { entities } = reproductionState;
    if (!entities.gestations || !gestationId) return undefined;
    const normalized = denormalize([gestationId], gestationsSchema, {
      gestations: entities.gestations,
    });
    return Array.isArray(normalized) ? normalized[0] : undefined;
  }
);

// ✅ CORRECTION CRITIQUE: Même fix pour sevrages
// Sélecteur intermédiaire pour les IDs
const selectSevragesIds = createSelector(
  [selectReproductionState],
  (reproductionState) => reproductionState.ids.sevrages // ❌ PAS de || []
);

// Sélecteur intermédiaire pour les entities
const selectSevragesEntities = createSelector(
  [selectReproductionState],
  (reproductionState) => reproductionState.entities.sevrages // ❌ PAS de || {}
);

// Sélecteur final qui dénormalise seulement si IDs ou entities changent
export const selectAllSevrages = createSelector(
  [selectSevragesIds, selectSevragesEntities],
  (sevragesIds, sevragesEntities): Sevrage[] => {
    if (!sevragesIds || !sevragesEntities) return []; // ✅ Vérifier null/undefined
    if (sevragesIds.length === 0) return [];
    const result = denormalize(sevragesIds, sevragesSchema, { sevrages: sevragesEntities });
    return Array.isArray(result) ? result : [];
  }
);

export const selectSevrageById = createSelector(
  [selectReproductionState, (_: RootState, sevrageId: string) => sevrageId],
  (reproductionState, sevrageId): Sevrage | undefined => {
    const { entities } = reproductionState;
    if (!entities.sevrages || !sevrageId) return undefined;
    const normalized = denormalize([sevrageId], sevragesSchema, { sevrages: entities.sevrages });
    return Array.isArray(normalized) ? normalized[0] : undefined;
  }
);

// Sélecteur pour les sevrages par gestation
export const selectSevragesByGestationId = createSelector(
  [selectReproductionState, (_: RootState, gestationId: string) => gestationId],
  (reproductionState, gestationId): Sevrage[] => {
    const { entities, sevragesParGestation } = reproductionState;
    if (!sevragesParGestation || !gestationId) return [];
    const sevrageIds = sevragesParGestation[gestationId] || [];
    if (sevrageIds.length === 0) return [];
    const result = denormalize(sevrageIds, sevragesSchema, { sevrages: entities.sevrages });
    return Array.isArray(result) ? result : [];
  }
);

// Sélecteurs pour le loading et l'erreur
export const selectReproductionLoading = createSelector(
  [selectReproductionState],
  (reproductionState) => reproductionState.loading
);

export const selectReproductionError = createSelector(
  [selectReproductionState],
  (reproductionState) => reproductionState.error
);
