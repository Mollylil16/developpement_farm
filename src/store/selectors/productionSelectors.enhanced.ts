/**
 * Sélecteurs améliorés pour le slice production
 * Ajoute des sélecteurs calculés optimisés avec createSelector
 * 
 * Ces sélecteurs sont memoized pour éviter les recalculs inutiles
 */

import { createSelector } from '@reduxjs/toolkit';
import { normalize } from 'normalizr';
import { RootState } from '../store';
import { animauxSchema } from '../normalization/schemas';
import { ProductionAnimal, ProductionPesee } from '../../types';
import * as baseSelectors from './productionSelectors';

/**
 * Sélecteur pour obtenir les animaux normalisés (sans dénormalisation)
 * Utile pour les calculs de performance
 */
export const selectAnimauxNormalized = createSelector(
  [baseSelectors.selectAllAnimaux],
  (animaux) => {
    // Retourne les données normalisées pour éviter la dénormalisation multiple
    return normalize(animaux, animauxSchema);
  }
);

/**
 * Sélecteur pour obtenir les animaux reproducteurs actifs
 */
export const selectAnimauxReproducteursActifs = createSelector(
  [baseSelectors.selectAllAnimaux],
  (animaux): ProductionAnimal[] => {
    return animaux.filter(
      (animal) =>
        animal.reproducteur === 1 &&
        animal.actif === 1 &&
        animal.statut?.toLowerCase() === 'actif'
    );
  }
);

/**
 * Sélecteur pour obtenir les animaux par statut
 */
export const selectAnimauxByStatut = createSelector(
  [baseSelectors.selectAllAnimaux, (_: RootState, statut: string) => statut],
  (animaux, statut): ProductionAnimal[] => {
    return animaux.filter((animal) => animal.statut?.toLowerCase() === statut.toLowerCase());
  }
);

/**
 * Sélecteur pour obtenir les animaux par sexe
 */
export const selectAnimauxBySexe = createSelector(
  [baseSelectors.selectAllAnimaux, (_: RootState, sexe: string) => sexe],
  (animaux, sexe): ProductionAnimal[] => {
    return animaux.filter((animal) => animal.sexe?.toLowerCase() === sexe.toLowerCase());
  }
);

/**
 * Sélecteur pour obtenir les statistiques des animaux
 */
export const selectAnimauxStatistics = createSelector(
  [baseSelectors.selectAllAnimaux],
  (animaux) => {
    const stats = {
      total: animaux.length,
      actifs: 0,
      inactifs: 0,
      reproducteurs: 0,
      males: 0,
      femelles: 0,
      parStatut: {} as Record<string, number>,
      parSexe: {} as Record<string, number>,
    };

    animaux.forEach((animal) => {
      if (animal.actif === 1) {
        stats.actifs++;
      } else {
        stats.inactifs++;
      }

      if (animal.reproducteur === 1) {
        stats.reproducteurs++;
      }

      if (animal.sexe) {
        stats.parSexe[animal.sexe] = (stats.parSexe[animal.sexe] || 0) + 1;
        if (animal.sexe.toLowerCase() === 'male') {
          stats.males++;
        } else if (animal.sexe.toLowerCase() === 'femelle') {
          stats.femelles++;
        }
      }

      if (animal.statut) {
        stats.parStatut[animal.statut] = (stats.parStatut[animal.statut] || 0) + 1;
      }
    });

    return stats;
  }
);

/**
 * Sélecteur pour obtenir les pesées triées par date (plus récentes en premier)
 */
export const selectPeseesSortedByDate = createSelector(
  [baseSelectors.selectAllPesees],
  (pesees): ProductionPesee[] => {
    return [...pesees].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Plus récent en premier
    });
  }
);

/**
 * Sélecteur pour obtenir les pesées d'une période
 */
export const selectPeseesByPeriod = createSelector(
  [
    baseSelectors.selectAllPesees,
    (_: RootState, dateDebut: string) => dateDebut,
    (_: RootState, _dateDebut: string, dateFin: string) => dateFin,
  ],
  (pesees, dateDebut, dateFin): ProductionPesee[] => {
    const debut = new Date(dateDebut).getTime();
    const fin = new Date(dateFin).getTime();
    return pesees.filter((pesee) => {
      const datePesee = new Date(pesee.date).getTime();
      return datePesee >= debut && datePesee <= fin;
    });
  }
);

/**
 * Sélecteur pour obtenir la dernière pesée d'un animal
 */
export const selectDernierePeseeByAnimalId = createSelector(
  [baseSelectors.selectPeseesByAnimalId],
  (pesees): ProductionPesee | undefined => {
    if (pesees.length === 0) return undefined;
    return [...pesees].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Plus récent en premier
    })[0];
  }
);

/**
 * Sélecteur pour obtenir les animaux avec leur dernière pesée
 * Optimisé pour éviter les recalculs multiples
 */
export const selectAnimauxWithDernierePesee = createSelector(
  [baseSelectors.selectAllAnimaux, baseSelectors.selectPeseesParAnimal],
  (animaux, peseesParAnimal) => {
    return animaux.map((animal) => {
      const pesees = peseesParAnimal[animal.id] || [];
      const dernierePesee = pesees.length > 0
        ? [...pesees].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA;
          })[0]
        : undefined;

      return {
        animal,
        dernierePesee,
      };
    });
  }
);

