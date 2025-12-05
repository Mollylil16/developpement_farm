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

// Sélecteurs intermédiaires pour éviter les nouvelles références
const selectAnimauxIds = createSelector(
  [selectProductionState],
  (productionState) => productionState.ids.animaux
);

const selectAnimauxEntities = createSelector(
  [selectProductionState],
  (productionState) => productionState.entities.animaux
);

// Sélecteur pour obtenir tous les animaux (dénormalisés)
export const selectAllAnimaux = createSelector(
  [selectAnimauxIds, selectAnimauxEntities],
  (animauxIds, animauxEntities): ProductionAnimal[] => {
    if (!animauxIds || !animauxEntities) return [];
    if (animauxIds.length === 0) return [];
    const result = denormalize(animauxIds, animauxSchema, { animaux: animauxEntities });
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

// Sélecteurs intermédiaires pour les pesées
const selectPeseesIds = createSelector(
  [selectProductionState],
  (productionState) => productionState.ids.pesees
);

const selectPeseesEntities = createSelector(
  [selectProductionState],
  (productionState) => productionState.entities.pesees
);

const selectPeseesParAnimalIds = createSelector(
  [selectProductionState],
  (productionState) => productionState.peseesParAnimal
);

const selectPeseesRecentsIds = createSelector(
  [selectProductionState],
  (productionState) => productionState.peseesRecents
);

// Sélecteur pour obtenir toutes les pesées (dénormalisées)
export const selectAllPesees = createSelector(
  [selectPeseesIds, selectPeseesEntities],
  (peseesIds, peseesEntities): ProductionPesee[] => {
    if (!peseesIds || !peseesEntities) return [];
    if (peseesIds.length === 0) return [];
    const result = denormalize(peseesIds, peseesSchema, { pesees: peseesEntities });
    return Array.isArray(result) ? result : [];
  }
);

// Sélecteur pour obtenir les pesées d'un animal (dénormalisées)
export const selectPeseesByAnimalId = createSelector(
  [selectPeseesParAnimalIds, selectPeseesEntities, (_: RootState, animalId: string) => animalId],
  (peseesParAnimal, peseesEntities, animalId): ProductionPesee[] => {
    if (!peseesParAnimal || !peseesEntities) return [];
    const peseeIds = peseesParAnimal[animalId];
    if (!peseeIds || peseeIds.length === 0) return [];
    const result = denormalize(peseeIds, peseesSchema, { pesees: peseesEntities });
    return Array.isArray(result) ? result : [];
  }
);

// Sélecteur pour obtenir les pesées récentes (dénormalisées)
export const selectPeseesRecents = createSelector(
  [selectPeseesRecentsIds, selectPeseesEntities],
  (peseesRecentsIds, peseesEntities): ProductionPesee[] => {
    if (!peseesRecentsIds || !peseesEntities) return [];
    if (peseesRecentsIds.length === 0) return [];
    const result = denormalize(peseesRecentsIds, peseesSchema, { pesees: peseesEntities });
    return Array.isArray(result) ? result : [];
  }
);

// Sélecteur pour obtenir peseesParAnimal (compatible avec l'ancien format)
// Utiliser une comparaison personnalisée pour éviter les recalculs inutiles
// Le sélecteur retourne toujours une nouvelle référence, mais c'est normal car c'est un objet complexe
// Les composants doivent utiliser useMemo pour mémoriser les résultats dérivés

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

// Sélecteur pour obtenir uniquement les animaux actifs
export const selectAnimauxActifs = createSelector(
  [selectAllAnimaux],
  (animaux): ProductionAnimal[] => {
    return animaux.filter((animal) => animal.statut?.toLowerCase() === 'actif');
  }
);