/**
 * Sélecteurs pour le slice production
 * Dénormalise les données normalisées pour les composants
 */

import { createSelector } from '@reduxjs/toolkit';
import { denormalize } from 'normalizr';
import { RootState } from '../store';
import { animauxSchema, peseesSchema, animalSchema, peseeSchema } from '../normalization/schemas';
import { ProductionAnimal, ProductionPesee } from '../../types';

// Sélecteur de base pour l'état production
const selectProductionState = (state: RootState) => state.production;

// Sélecteur pour obtenir tous les animaux (dénormalisés)
export const selectAllAnimaux = createSelector(
  [selectProductionState],
  (productionState): ProductionAnimal[] => {
    const { entities, ids } = productionState;
    const animauxIds = ids.animaux || [];
    const result = denormalize(animauxIds, animauxSchema, { animaux: entities.animaux });
    return Array.isArray(result) ? result : [];
  }
);

// Sélecteur pour obtenir un animal par ID
export const selectAnimalById = createSelector(
  [selectProductionState, (_: RootState, animalId: string) => animalId],
  (productionState, animalId): ProductionAnimal | undefined => {
    const { entities } = productionState;
    if (!entities.animaux || !animalId) return undefined;
    const normalized = denormalize([animalId], animauxSchema, { animaux: entities.animaux });
    return Array.isArray(normalized) ? normalized[0] : undefined;
  }
);

// Sélecteur pour obtenir toutes les pesées (dénormalisées)
export const selectAllPesees = createSelector(
  [selectProductionState],
  (productionState): ProductionPesee[] => {
    const { entities, ids } = productionState;
    const peseesIds = ids.pesees || [];
    const result = denormalize(peseesIds, peseesSchema, { pesees: entities.pesees });
    return Array.isArray(result) ? result : [];
  }
);

// Sélecteur pour obtenir les pesées d'un animal (dénormalisées)
export const selectPeseesByAnimalId = createSelector(
  [selectProductionState, (_: RootState, animalId: string) => animalId],
  (productionState, animalId): ProductionPesee[] => {
    const { entities, peseesParAnimal } = productionState;
    const peseeIds = peseesParAnimal?.[animalId] || [];
    if (peseeIds.length === 0) return [];
    const result = denormalize(peseeIds, peseesSchema, { pesees: entities.pesees });
    return Array.isArray(result) ? result : [];
  }
);

// Sélecteur pour obtenir les pesées récentes (dénormalisées)
export const selectPeseesRecents = createSelector(
  [selectProductionState],
  (productionState): ProductionPesee[] => {
    const { entities, peseesRecents } = productionState;
    const peseesRecentsIds = peseesRecents || [];
    if (peseesRecentsIds.length === 0) return [];
    const result = denormalize(peseesRecentsIds, peseesSchema, { pesees: entities.pesees });
    return Array.isArray(result) ? result : [];
  }
);

// Sélecteur pour obtenir peseesParAnimal (compatible avec l'ancien format)
// Utiliser une comparaison personnalisée pour éviter les recalculs inutiles
const selectPeseesParAnimalIds = createSelector(
  [selectProductionState],
  (productionState) => productionState.peseesParAnimal
);

const selectPeseesEntities = createSelector(
  [selectProductionState],
  (productionState) => productionState.entities.pesees
);

export const selectPeseesParAnimal = createSelector(
  [selectPeseesParAnimalIds, selectPeseesEntities],
  (peseesParAnimal, peseesEntities): Record<string, ProductionPesee[]> => {
    const result: Record<string, ProductionPesee[]> = {};
    
    if (!peseesParAnimal) return result;
    
    Object.keys(peseesParAnimal).forEach((animalId) => {
      const peseeIds = peseesParAnimal[animalId];
      if (peseeIds && Array.isArray(peseeIds) && peseeIds.length > 0) {
        const denormalized = denormalize(peseeIds, peseesSchema, { pesees: peseesEntities });
        result[animalId] = Array.isArray(denormalized) ? denormalized : [];
      } else {
        result[animalId] = [];
      }
    });
    
    return result;
  }
);

// Sélecteur pour obtenir le loading state
export const selectProductionLoading = createSelector(
  [selectProductionState],
  (productionState) => productionState.loading
);

// Sélecteur pour obtenir l'erreur
export const selectProductionError = createSelector(
  [selectProductionState],
  (productionState) => productionState.error
);

