/**
 * Sélecteurs améliorés pour le slice sante
 * Ajoute des sélecteurs calculés optimisés avec createSelector
 */

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Vaccination, Maladie } from '../../types';
import * as baseSelectors from './santeSelectors';

/**
 * Sélecteur pour obtenir les vaccinations en retard avec calcul de jours de retard
 */
export const selectVaccinationsEnRetardAvecDetails = createSelector(
  [baseSelectors.selectVaccinationsEnRetard],
  (vaccinations): Array<Vaccination & { joursRetard: number }> => {
    const maintenant = new Date();
    return vaccinations.map((vaccination) => {
      const dateVaccination = new Date(vaccination.date_vaccination);
      const joursRetard = Math.floor((maintenant.getTime() - dateVaccination.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...vaccination,
        joursRetard,
      };
    });
  }
);

/**
 * Sélecteur pour obtenir les maladies critiques nécessitant une intervention urgente
 */
export const selectMaladiesCritiquesUrgentes = createSelector(
  [baseSelectors.selectMaladiesCritiques],
  (maladies): Maladie[] => {
    return maladies.filter(
      (maladie) =>
        maladie.gravite === 'critique' &&
        (!maladie.gueri || maladie.gueri === 0) &&
        (!maladie.date_fin || maladie.date_fin === null)
    );
  }
);

/**
 * Sélecteur pour obtenir les maladies contagieuses en cours
 */
export const selectMaladiesContagieusesEnCours = createSelector(
  [baseSelectors.selectMaladiesEnCours],
  (maladies): Maladie[] => {
    return maladies.filter((maladie) => maladie.contagieux === 1 || maladie.contagieux === true);
  }
);

/**
 * Sélecteur pour calculer les statistiques sanitaires
 */
export const selectStatistiquesSanitaires = createSelector(
  [
    baseSelectors.selectAllVaccinations,
    baseSelectors.selectAllMaladies,
    baseSelectors.selectVaccinationsEnRetard,
    baseSelectors.selectMaladiesEnCours,
  ],
  (vaccinations, maladies, vaccinationsEnRetard, maladiesEnCours) => {
    return {
      totalVaccinations: vaccinations.length,
      vaccinationsEffectuees: vaccinations.filter((v) => v.statut === 'effectue').length,
      vaccinationsEnRetard: vaccinationsEnRetard.length,
      totalMaladies: maladies.length,
      maladiesEnCours: maladiesEnCours.length,
      maladiesGueries: maladies.filter((m) => m.gueri === 1 || m.gueri === true).length,
      maladiesCritiques: maladies.filter((m) => m.gravite === 'critique').length,
      tauxGuerison:
        maladies.length > 0
          ? (maladies.filter((m) => m.gueri === 1 || m.gueri === true).length / maladies.length) * 100
          : 0,
    };
  }
);

/**
 * Sélecteur pour obtenir les vaccinations nécessitant un rappel
 */
export const selectVaccinationsRappelNecessaire = createSelector(
  [baseSelectors.selectAllVaccinations],
  (vaccinations): Vaccination[] => {
    const maintenant = new Date();
    return vaccinations.filter((vaccination) => {
      if (!vaccination.date_rappel) return false;
      const dateRappel = new Date(vaccination.date_rappel);
      return maintenant >= dateRappel && vaccination.statut === 'effectue';
    });
  }
);

