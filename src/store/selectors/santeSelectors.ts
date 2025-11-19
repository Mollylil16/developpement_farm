/**
 * Module Santé - Redux Selectors
 * Sélecteurs optimisés pour accéder aux données du module Santé
 */

import { createSelector } from '@reduxjs/toolkit';
import { denormalize, schema } from 'normalizr';
import type { RootState } from '../store';
import type {
  CalendrierVaccination,
  Vaccination,
  Maladie,
  Traitement,
  VisiteVeterinaire,
  RappelVaccination,
} from '../../types/sante';

// ============================================
// SCHÉMAS NORMALIZR
// ============================================

const calendrierVaccinationSchema = new schema.Entity('calendrier_vaccinations');
const vaccinationSchema = new schema.Entity('vaccinations');
const maladieSchema = new schema.Entity('maladies');
const traitementSchema = new schema.Entity('traitements');
const visiteVeterinaireSchema = new schema.Entity('visites_veterinaires');
const rappelVaccinationSchema = new schema.Entity('rappels_vaccinations');

// ============================================
// SELECTORS DE BASE
// ============================================

const selectSanteState = (state: RootState) => state.sante;

export const selectSanteLoading = (state: RootState) => state.sante.loading;
export const selectSanteError = (state: RootState) => state.sante.error;
export const selectSanteStatistics = (state: RootState) => state.sante.statistics;
export const selectSanteAlertes = (state: RootState) => state.sante.alertes;

// ============================================
// CALENDRIER VACCINATIONS
// ============================================

const selectCalendrierVaccinationsIds = createSelector(
  [selectSanteState],
  (sante) => sante.ids.calendrier_vaccinations
);

const selectCalendrierVaccinationsEntities = createSelector(
  [selectSanteState],
  (sante) => sante.entities.calendrier_vaccinations
);

export const selectAllCalendrierVaccinations = createSelector(
  [selectCalendrierVaccinationsIds, selectCalendrierVaccinationsEntities],
  (ids, entities): CalendrierVaccination[] => {
    if (!ids || !entities) return [];
    try {
      const result = denormalize(ids, [calendrierVaccinationSchema], { calendrier_vaccinations: entities });
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.warn('Erreur lors de la dénormalisation des calendriers de vaccination:', error);
      return [];
    }
  }
);

export const selectCalendrierVaccinationById = (id: string) =>
  createSelector(
    [selectCalendrierVaccinationsEntities],
    (entities): CalendrierVaccination | undefined => entities[id]
  );

export const selectCalendrierVaccinationsByCategorie = (categorie: string) =>
  createSelector(
    [selectAllCalendrierVaccinations],
    (calendriers): CalendrierVaccination[] =>
      calendriers.filter((c) => c.categorie === categorie || c.categorie === 'tous')
  );

// ============================================
// VACCINATIONS
// ============================================

const selectVaccinationsIds = createSelector(
  [selectSanteState],
  (sante) => sante.ids.vaccinations
);

const selectVaccinationsEntities = createSelector(
  [selectSanteState],
  (sante) => sante.entities.vaccinations
);

export const selectAllVaccinations = createSelector(
  [selectVaccinationsIds, selectVaccinationsEntities],
  (ids, entities): Vaccination[] => {
    if (!ids || !entities) return [];
    try {
      const result = denormalize(ids, [vaccinationSchema], { vaccinations: entities });
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.warn('Erreur lors de la dénormalisation des vaccinations:', error);
      return [];
    }
  }
);

export const selectVaccinationById = (id: string) =>
  createSelector(
    [selectVaccinationsEntities],
    (entities): Vaccination | undefined => entities[id]
  );

export const selectVaccinationsByAnimal = (animalId: string) =>
  createSelector(
    [selectAllVaccinations],
    (vaccinations): Vaccination[] =>
      vaccinations.filter((v) => v.animal_id === animalId)
  );

export const selectVaccinationsByStatut = (statut: 'planifie' | 'effectue' | 'en_retard' | 'annule') =>
  createSelector(
    [selectAllVaccinations],
    (vaccinations): Vaccination[] =>
      vaccinations.filter((v) => v.statut === statut)
  );

export const selectVaccinationsEnRetard = createSelector(
  [selectAllVaccinations],
  (vaccinations): Vaccination[] => {
    const now = new Date();
    return vaccinations.filter(
      (v) => v.statut === 'planifie' && new Date(v.date_vaccination) < now
    );
  }
);

export const selectVaccinationsAVenir = createSelector(
  [selectAllVaccinations],
  (vaccinations): Vaccination[] => {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return vaccinations.filter(
      (v) =>
        v.statut === 'planifie' &&
        new Date(v.date_vaccination) >= now &&
        new Date(v.date_vaccination) <= in7Days
    );
  }
);

// ============================================
// MALADIES
// ============================================

const selectMaladiesIds = createSelector(
  [selectSanteState],
  (sante) => sante.ids.maladies
);

const selectMaladiesEntities = createSelector(
  [selectSanteState],
  (sante) => sante.entities.maladies
);

export const selectAllMaladies = createSelector(
  [selectMaladiesIds, selectMaladiesEntities],
  (ids, entities): Maladie[] => {
    if (!ids || !entities) return [];
    return denormalize(ids, [maladieSchema], { maladies: entities }) || [];
  }
);

export const selectMaladieById = (id: string) =>
  createSelector(
    [selectMaladiesEntities],
    (entities): Maladie | undefined => entities[id]
  );

export const selectMaladiesByAnimal = (animalId: string) =>
  createSelector(
    [selectAllMaladies],
    (maladies): Maladie[] =>
      maladies.filter((m) => m.animal_id === animalId)
  );

export const selectMaladiesEnCours = createSelector(
  [selectAllMaladies],
  (maladies): Maladie[] =>
    maladies.filter((m) => !m.gueri)
);

export const selectMaladiesByType = (type: string) =>
  createSelector(
    [selectAllMaladies],
    (maladies): Maladie[] =>
      maladies.filter((m) => m.type === type)
  );

export const selectMaladiesByGravite = (gravite: 'faible' | 'moderee' | 'grave' | 'critique') =>
  createSelector(
    [selectAllMaladies],
    (maladies): Maladie[] =>
      maladies.filter((m) => m.gravite === gravite)
  );

export const selectMaladiesCritiques = createSelector(
  [selectAllMaladies],
  (maladies): Maladie[] =>
    maladies.filter((m) => m.gravite === 'critique' && !m.gueri)
);

// ============================================
// TRAITEMENTS
// ============================================

const selectTraitementsIds = createSelector(
  [selectSanteState],
  (sante) => sante.ids.traitements
);

const selectTraitementsEntities = createSelector(
  [selectSanteState],
  (sante) => sante.entities.traitements
);

export const selectAllTraitements = createSelector(
  [selectTraitementsIds, selectTraitementsEntities],
  (ids, entities): Traitement[] => {
    if (!ids || !entities) return [];
    return denormalize(ids, [traitementSchema], { traitements: entities }) || [];
  }
);

export const selectTraitementById = (id: string) =>
  createSelector(
    [selectTraitementsEntities],
    (entities): Traitement | undefined => entities[id]
  );

export const selectTraitementsByAnimal = (animalId: string) =>
  createSelector(
    [selectAllTraitements],
    (traitements): Traitement[] =>
      traitements.filter((t) => t.animal_id === animalId)
  );

export const selectTraitementsByMaladie = (maladieId: string) =>
  createSelector(
    [selectAllTraitements],
    (traitements): Traitement[] =>
      traitements.filter((t) => t.maladie_id === maladieId)
  );

export const selectTraitementsEnCours = createSelector(
  [selectAllTraitements],
  (traitements): Traitement[] =>
    traitements.filter((t) => !t.termine)
);

export const selectTraitementsByType = (type: string) =>
  createSelector(
    [selectAllTraitements],
    (traitements): Traitement[] =>
      traitements.filter((t) => t.type === type)
  );

// ============================================
// VISITES VÉTÉRINAIRES
// ============================================

const selectVisitesVeterinairesIds = createSelector(
  [selectSanteState],
  (sante) => sante.ids.visites_veterinaires
);

const selectVisitesVeterinairesEntities = createSelector(
  [selectSanteState],
  (sante) => sante.entities.visites_veterinaires
);

export const selectAllVisitesVeterinaires = createSelector(
  [selectVisitesVeterinairesIds, selectVisitesVeterinairesEntities],
  (ids, entities): VisiteVeterinaire[] => {
    if (!ids || !entities) return [];
    return denormalize(ids, [visiteVeterinaireSchema], { visites_veterinaires: entities }) || [];
  }
);

export const selectVisiteVeterinaireById = (id: string) =>
  createSelector(
    [selectVisitesVeterinairesEntities],
    (entities): VisiteVeterinaire | undefined => entities[id]
  );

export const selectVisitesVeterinairesByAnimal = (animalId: string) =>
  createSelector(
    [selectAllVisitesVeterinaires],
    (visites): VisiteVeterinaire[] =>
      visites.filter((v) => v.animaux_examines?.includes(animalId))
  );

export const selectProchainesVisitesVeterinaires = createSelector(
  [selectAllVisitesVeterinaires],
  (visites): VisiteVeterinaire[] => {
    const now = new Date();
    return visites.filter(
      (v) => v.prochaine_visite_prevue && new Date(v.prochaine_visite_prevue) >= now
    ).sort((a, b) =>
      new Date(a.prochaine_visite_prevue!).getTime() - new Date(b.prochaine_visite_prevue!).getTime()
    );
  }
);

// ============================================
// RAPPELS VACCINATIONS
// ============================================

const selectRappelsVaccinationsIds = createSelector(
  [selectSanteState],
  (sante) => sante.ids.rappels_vaccinations
);

const selectRappelsVaccinationsEntities = createSelector(
  [selectSanteState],
  (sante) => sante.entities.rappels_vaccinations
);

export const selectAllRappelsVaccinations = createSelector(
  [selectRappelsVaccinationsIds, selectRappelsVaccinationsEntities],
  (ids, entities): RappelVaccination[] => {
    if (!ids || !entities) return [];
    return denormalize(ids, [rappelVaccinationSchema], { rappels_vaccinations: entities }) || [];
  }
);

export const selectRappelVaccinationById = (id: string) =>
  createSelector(
    [selectRappelsVaccinationsEntities],
    (entities): RappelVaccination | undefined => entities[id]
  );

export const selectRappelsVaccinationsByVaccination = (vaccinationId: string) =>
  createSelector(
    [selectAllRappelsVaccinations],
    (rappels): RappelVaccination[] =>
      rappels.filter((r) => r.vaccination_id === vaccinationId)
  );

export const selectRappelsAVenir = createSelector(
  [selectAllRappelsVaccinations],
  (rappels): RappelVaccination[] => {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return rappels.filter(
      (r) =>
        !r.envoi &&
        new Date(r.date_rappel) >= now &&
        new Date(r.date_rappel) <= in7Days
    );
  }
);

export const selectRappelsEnRetard = createSelector(
  [selectAllRappelsVaccinations],
  (rappels): RappelVaccination[] => {
    const now = new Date();
    return rappels.filter(
      (r) => !r.envoi && new Date(r.date_rappel) < now
    );
  }
);

// ============================================
// SELECTORS COMBINÉS
// ============================================

export const selectHistoriqueMedicalAnimal = (animalId: string) =>
  createSelector(
    [
      selectVaccinationsByAnimal(animalId),
      selectMaladiesByAnimal(animalId),
      selectTraitementsByAnimal(animalId),
      selectVisitesVeterinairesByAnimal(animalId),
    ],
    (vaccinations, maladies, traitements, visites) => ({
      vaccinations,
      maladies,
      traitements,
      visites,
    })
  );

export const selectNombreAlertesCritiques = createSelector(
  [selectSanteAlertes],
  (alertes) => alertes.filter((a) => a.gravite === 'critique').length
);

export const selectNombreAlertesElevees = createSelector(
  [selectSanteAlertes],
  (alertes) => alertes.filter((a) => a.gravite === 'elevee').length
);

export const selectHasAlertesCritiques = createSelector(
  [selectNombreAlertesCritiques],
  (nombre) => nombre > 0
);

// ============================================
// SELECTORS DE COMPTAGE
// ============================================

export const selectNombreVaccinations = createSelector(
  [selectAllVaccinations],
  (vaccinations) => vaccinations.length
);

export const selectNombreMaladiesEnCours = createSelector(
  [selectMaladiesEnCours],
  (maladies) => maladies.length
);

export const selectNombreTraitementsEnCours = createSelector(
  [selectTraitementsEnCours],
  (traitements) => traitements.length
);

export const selectNombreRappelsEnRetard = createSelector(
  [selectRappelsEnRetard],
  (rappels) => rappels.length
);

export const selectNombreVaccinationsEnRetard = createSelector(
  [selectVaccinationsEnRetard],
  (vaccinations) => vaccinations.length
);

