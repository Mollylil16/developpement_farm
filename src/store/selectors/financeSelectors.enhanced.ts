/**
 * Sélecteurs améliorés pour le slice finance
 * Ajoute des sélecteurs calculés optimisés avec createSelector
 */

import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { ChargeFixe, DepensePonctuelle, Revenu } from '../../types';
import * as baseSelectors from './financeSelectors';

/**
 * Sélecteur pour obtenir les charges fixes actives
 */
export const selectChargesFixesActives = createSelector(
  [baseSelectors.selectAllChargesFixes],
  (charges): ChargeFixe[] => {
    return charges.filter((charge) => charge.statut === 'actif');
  }
);

/**
 * Sélecteur pour obtenir les dépenses d'une période
 */
export const selectDepensesByPeriod = createSelector(
  [
    baseSelectors.selectAllDepensesPonctuelles,
    (_: RootState, dateDebut: string) => dateDebut,
    (_: RootState, _dateDebut: string, dateFin: string) => dateFin,
  ],
  (depenses, dateDebut, dateFin): DepensePonctuelle[] => {
    const debut = new Date(dateDebut).getTime();
    const fin = new Date(dateFin).getTime();
    return depenses.filter((depense) => {
      const dateDepense = new Date(depense.date).getTime();
      return dateDepense >= debut && dateDepense <= fin;
    });
  }
);

/**
 * Sélecteur pour obtenir les revenus d'une période
 */
export const selectRevenusByPeriod = createSelector(
  [
    baseSelectors.selectAllRevenus,
    (_: RootState, dateDebut: string) => dateDebut,
    (_: RootState, _dateDebut: string, dateFin: string) => dateFin,
  ],
  (revenus, dateDebut, dateFin): Revenu[] => {
    const debut = new Date(dateDebut).getTime();
    const fin = new Date(dateFin).getTime();
    return revenus.filter((revenu) => {
      const dateRevenu = new Date(revenu.date).getTime();
      return dateRevenu >= debut && dateRevenu <= fin;
    });
  }
);

/**
 * Sélecteur pour calculer le total des dépenses
 */
export const selectTotalDepenses = createSelector(
  [baseSelectors.selectAllDepensesPonctuelles],
  (depenses): number => {
    return depenses.reduce((total, depense) => total + (depense.montant || 0), 0);
  }
);

/**
 * Sélecteur pour calculer le total des revenus
 */
export const selectTotalRevenus = createSelector(
  [baseSelectors.selectAllRevenus],
  (revenus): number => {
    return revenus.reduce((total, revenu) => total + (revenu.montant || 0), 0);
  }
);

/**
 * Sélecteur pour calculer le total des charges fixes annuelles
 */
export const selectTotalChargesFixesAnnuelles = createSelector(
  [selectChargesFixesActives],
  (charges): number => {
    return charges.reduce((total, charge) => {
      let montantAnnuel = 0;
      switch (charge.frequence) {
        case 'mensuel':
          montantAnnuel = charge.montant * 12;
          break;
        case 'trimestriel':
          montantAnnuel = charge.montant * 4;
          break;
        case 'annuel':
          montantAnnuel = charge.montant;
          break;
      }
      return total + montantAnnuel;
    }, 0);
  }
);

/**
 * Sélecteur pour calculer le solde financier (revenus - dépenses)
 */
export const selectSoldeFinancier = createSelector(
  [selectTotalRevenus, selectTotalDepenses],
  (totalRevenus, totalDepenses): number => {
    return totalRevenus - totalDepenses;
  }
);

/**
 * Sélecteur pour calculer le solde financier d'une période
 */
export const selectSoldeFinancierByPeriod = createSelector(
  [selectRevenusByPeriod, selectDepensesByPeriod],
  (revenus, depenses): number => {
    const totalRevenus = revenus.reduce((sum, r) => sum + (r.montant || 0), 0);
    const totalDepenses = depenses.reduce((sum, d) => sum + (d.montant || 0), 0);
    return totalRevenus - totalDepenses;
  }
);

/**
 * Sélecteur pour obtenir les dépenses par catégorie
 */
export const selectDepensesByCategorie = createSelector(
  [baseSelectors.selectAllDepensesPonctuelles],
  (depenses) => {
    const parCategorie: Record<string, { count: number; total: number }> = {};

    depenses.forEach((depense) => {
      const categorie = depense.categorie || 'autre';
      if (!parCategorie[categorie]) {
        parCategorie[categorie] = { count: 0, total: 0 };
      }
      parCategorie[categorie].count++;
      parCategorie[categorie].total += depense.montant || 0;
    });

    return parCategorie;
  }
);

/**
 * Sélecteur pour obtenir les revenus par catégorie
 */
export const selectRevenusByCategorie = createSelector(
  [baseSelectors.selectAllRevenus],
  (revenus) => {
    const parCategorie: Record<string, { count: number; total: number }> = {};

    revenus.forEach((revenu) => {
      const categorie = revenu.categorie || 'autre';
      if (!parCategorie[categorie]) {
        parCategorie[categorie] = { count: 0, total: 0 };
      }
      parCategorie[categorie].count++;
      parCategorie[categorie].total += revenu.montant || 0;
    });

    return parCategorie;
  }
);
