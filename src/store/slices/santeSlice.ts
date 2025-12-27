/**
 * Module Santé - Redux Slice
 * Gestion de l'état du module Santé (vaccinations, maladies, traitements, visites vétérinaires)
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { normalize, denormalize, schema } from 'normalizr';
import { getErrorMessage } from '../../types/common';
import apiClient from '../../services/api/apiClient';
import {
  CalendrierVaccination,
  Vaccination,
  Maladie,
  Traitement,
  VisiteVeterinaire,
  RappelVaccination,
  CreateCalendrierVaccinationInput,
  CreateVaccinationInput,
  CreateMaladieInput,
  CreateTraitementInput,
  CreateVisiteVeterinaireInput,
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
// ÉTAT INITIAL
// ============================================

interface SanteState {
  entities: {
    calendrier_vaccinations: { [key: string]: CalendrierVaccination };
    vaccinations: { [key: string]: Vaccination };
    maladies: { [key: string]: Maladie };
    traitements: { [key: string]: Traitement };
    visites_veterinaires: { [key: string]: VisiteVeterinaire };
    rappels_vaccinations: { [key: string]: RappelVaccination };
  };
  ids: {
    calendrier_vaccinations: string[];
    vaccinations: string[];
    maladies: string[];
    traitements: string[];
    visites_veterinaires: string[];
    rappels_vaccinations: string[];
  };
  statistics: {
    vaccinations: {
      total: number;
      effectuees: number;
      enAttente: number;
      enRetard: number;
      tauxCouverture: number;
      coutTotal: number;
    } | null;
    maladies: {
      total: number;
      enCours: number;
      gueries: number;
      parType: { [key: string]: number };
      parGravite: { [key: string]: number };
      tauxGuerison: number;
    } | null;
    traitements: {
      total: number;
      enCours: number;
      termines: number;
      coutTotal: number;
    } | null;
  };
  alertes: Array<{
    type: 'rappel_retard' | 'maladie_critique' | 'epidemie' | 'mortalite_elevee';
    gravite: 'critique' | 'elevee' | 'moyenne';
    message: string;
    date: string;
    data?: unknown;
  }>;
  loading: {
    calendrier: boolean;
    vaccinations: boolean;
    maladies: boolean;
    traitements: boolean;
    visites: boolean;
    rappels: boolean;
    statistics: boolean;
    alertes: boolean;
  };
  error: string | null;
}

const initialState: SanteState = {
  entities: {
    calendrier_vaccinations: {},
    vaccinations: {},
    maladies: {},
    traitements: {},
    visites_veterinaires: {},
    rappels_vaccinations: {},
  },
  ids: {
    calendrier_vaccinations: [],
    vaccinations: [],
    maladies: [],
    traitements: [],
    visites_veterinaires: [],
    rappels_vaccinations: [],
  },
  statistics: {
    vaccinations: null,
    maladies: null,
    traitements: null,
  },
  alertes: [],
  loading: {
    calendrier: false,
    vaccinations: false,
    maladies: false,
    traitements: false,
    visites: false,
    rappels: false,
    statistics: false,
    alertes: false,
  },
  error: null,
};

// ============================================
// ACTIONS ASYNCHRONES - CALENDRIER VACCINATIONS
// ============================================

export const loadCalendrierVaccinations = createAsyncThunk(
  'sante/loadCalendrierVaccinations',
  async (projetId: string) => {
    const calendriers = await apiClient.get<CalendrierVaccination[]>(
      '/sante/calendrier-vaccinations',
      {
        params: { projet_id: projetId },
      }
    );
    const normalized = normalize(calendriers, [calendrierVaccinationSchema]);
    return normalized;
  }
);

export const createCalendrierVaccination = createAsyncThunk(
  'sante/createCalendrierVaccination',
  async (input: CreateCalendrierVaccinationInput) => {
    const calendrier = await apiClient.post<CalendrierVaccination>(
      '/sante/calendrier-vaccinations',
      input
    );
    return calendrier;
  }
);

export const updateCalendrierVaccination = createAsyncThunk(
  'sante/updateCalendrierVaccination',
  async ({ id, updates }: { id: string; updates: Partial<CreateCalendrierVaccinationInput> }) => {
    const calendrier = await apiClient.patch<CalendrierVaccination>(
      `/sante/calendrier-vaccinations/${id}`,
      updates
    );
    return { id, updates: calendrier };
  }
);

export const deleteCalendrierVaccination = createAsyncThunk(
  'sante/deleteCalendrierVaccination',
  async (id: string) => {
    await apiClient.delete(`/sante/calendrier-vaccinations/${id}`);
    return id;
  }
);

export const initProtocolesVaccinationStandard = createAsyncThunk(
  'sante/initProtocolesVaccinationStandard',
  async (projetId: string) => {
    const calendriers = await apiClient.post<CalendrierVaccination[]>(
      '/sante/calendrier-vaccinations/init-standard',
      null,
      {
        params: { projet_id: projetId },
      }
    );
    const normalized = normalize(calendriers, [calendrierVaccinationSchema]);
    return normalized;
  }
);

// ============================================
// ACTIONS ASYNCHRONES - VACCINATIONS
// ============================================

export const loadVaccinations = createAsyncThunk(
  'sante/loadVaccinations',
  async (projetId: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'santeSlice.ts:203',message:'loadVaccinations entry',data:{projetId,projetIdType:typeof projetId,projetIdLength:projetId?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const vaccinations = await apiClient.get<Vaccination[]>('/sante/vaccinations', {
      params: { projet_id: projetId },
    });
    const normalized = normalize(vaccinations, [vaccinationSchema]);
    return normalized;
  }
);

export const createVaccination = createAsyncThunk(
  'sante/createVaccination',
  async (input: CreateVaccinationInput) => {
    const vaccination = await apiClient.post<Vaccination>('/sante/vaccinations', input);
    return vaccination;
  }
);

export const updateVaccination = createAsyncThunk(
  'sante/updateVaccination',
  async ({ id, updates }: { id: string; updates: Partial<Vaccination> }) => {
    const vaccination = await apiClient.patch<Vaccination>(`/sante/vaccinations/${id}`, updates);
    return { id, updates: vaccination };
  }
);

export const deleteVaccination = createAsyncThunk('sante/deleteVaccination', async (id: string) => {
  await apiClient.delete(`/sante/vaccinations/${id}`);
  return id;
});

export const loadVaccinationsEnRetard = createAsyncThunk(
  'sante/loadVaccinationsEnRetard',
  async (projetId: string) => {
    const vaccinations = await apiClient.get<Vaccination[]>('/sante/vaccinations/en-retard', {
      params: { projet_id: projetId },
    });
    const normalized = normalize(vaccinations, [vaccinationSchema]);
    return normalized;
  }
);

export const loadVaccinationsAVenir = createAsyncThunk(
  'sante/loadVaccinationsAVenir',
  async (projetId: string) => {
    const vaccinations = await apiClient.get<Vaccination[]>('/sante/vaccinations/a-venir', {
      params: { projet_id: projetId },
    });
    const normalized = normalize(vaccinations, [vaccinationSchema]);
    return normalized;
  }
);

// ============================================
// ACTIONS ASYNCHRONES - MALADIES
// ============================================

export const loadMaladies = createAsyncThunk('sante/loadMaladies', async (projetId: string) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'santeSlice.ts:264',message:'loadMaladies entry',data:{projetId,projetIdType:typeof projetId,projetIdLength:projetId?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  const maladies = await apiClient.get<Maladie[]>('/sante/maladies', {
    params: { projet_id: projetId },
  });
  const normalized = normalize(maladies, [maladieSchema]);
  return normalized;
});

export const createMaladie = createAsyncThunk(
  'sante/createMaladie',
  async (input: CreateMaladieInput) => {
    const maladie = await apiClient.post<Maladie>('/sante/maladies', input);
    return maladie;
  }
);

export const updateMaladie = createAsyncThunk(
  'sante/updateMaladie',
  async ({ id, updates }: { id: string; updates: Partial<CreateMaladieInput> }) => {
    const maladie = await apiClient.patch<Maladie>(`/sante/maladies/${id}`, updates);
    return { id, updates: maladie };
  }
);

export const deleteMaladie = createAsyncThunk('sante/deleteMaladie', async (id: string) => {
  await apiClient.delete(`/sante/maladies/${id}`);
  return id;
});

export const loadMaladiesEnCours = createAsyncThunk(
  'sante/loadMaladiesEnCours',
  async (projetId: string) => {
    const maladies = await apiClient.get<Maladie[]>('/sante/maladies/en-cours', {
      params: { projet_id: projetId },
    });
    const normalized = normalize(maladies, [maladieSchema]);
    return normalized;
  }
);

// ============================================
// ACTIONS ASYNCHRONES - TRAITEMENTS
// ============================================

export const loadTraitements = createAsyncThunk(
  'sante/loadTraitements',
  async (projetId: string) => {
    const traitements = await apiClient.get<Traitement[]>('/sante/traitements', {
      params: { projet_id: projetId },
    });
    const normalized = normalize(traitements, [traitementSchema]);
    return normalized;
  }
);

export const createTraitement = createAsyncThunk(
  'sante/createTraitement',
  async (input: CreateTraitementInput) => {
    const traitement = await apiClient.post<Traitement>('/sante/traitements', input);
    return traitement;
  }
);

export const updateTraitement = createAsyncThunk(
  'sante/updateTraitement',
  async ({ id, updates }: { id: string; updates: Partial<CreateTraitementInput> }) => {
    const traitement = await apiClient.patch<Traitement>(`/sante/traitements/${id}`, updates);
    return { id, updates: traitement };
  }
);

export const deleteTraitement = createAsyncThunk('sante/deleteTraitement', async (id: string) => {
  await apiClient.delete(`/sante/traitements/${id}`);
  return id;
});

export const loadTraitementsEnCours = createAsyncThunk(
  'sante/loadTraitementsEnCours',
  async (projetId: string) => {
    const traitements = await apiClient.get<Traitement[]>('/sante/traitements/en-cours', {
      params: { projet_id: projetId },
    });
    const normalized = normalize(traitements, [traitementSchema]);
    return normalized;
  }
);

// ============================================
// ACTIONS ASYNCHRONES - VISITES VÉTÉRINAIRES
// ============================================

export const loadVisitesVeterinaires = createAsyncThunk(
  'sante/loadVisitesVeterinaires',
  async (projetId: string) => {
    const visites = await apiClient.get<VisiteVeterinaire[]>('/sante/visites-veterinaires', {
      params: { projet_id: projetId },
    });
    const normalized = normalize(visites, [visiteVeterinaireSchema]);
    return normalized;
  }
);

export const createVisiteVeterinaire = createAsyncThunk(
  'sante/createVisiteVeterinaire',
  async (input: CreateVisiteVeterinaireInput) => {
    const visite = await apiClient.post<VisiteVeterinaire>('/sante/visites-veterinaires', input);
    return visite;
  }
);

export const updateVisiteVeterinaire = createAsyncThunk(
  'sante/updateVisiteVeterinaire',
  async ({ id, updates }: { id: string; updates: Partial<CreateVisiteVeterinaireInput> }) => {
    const visite = await apiClient.patch<VisiteVeterinaire>(
      `/sante/visites-veterinaires/${id}`,
      updates
    );
    return { id, updates: visite };
  }
);

export const deleteVisiteVeterinaire = createAsyncThunk(
  'sante/deleteVisiteVeterinaire',
  async (id: string) => {
    await apiClient.delete(`/sante/visites-veterinaires/${id}`);
    return id;
  }
);

// ============================================
// ACTIONS ASYNCHRONES - RAPPELS VACCINATIONS
// ============================================

export const loadRappelsVaccinations = createAsyncThunk(
  'sante/loadRappelsVaccinations',
  async (vaccinationId: string) => {
    const rappels = await apiClient.get<RappelVaccination[]>('/sante/rappels-vaccinations', {
      params: { vaccination_id: vaccinationId },
    });
    const normalized = normalize(rappels, [rappelVaccinationSchema]);
    return normalized;
  }
);

export const loadRappelsAVenir = createAsyncThunk(
  'sante/loadRappelsAVenir',
  async (projetId: string) => {
    const rappels = await apiClient.get<RappelVaccination[]>(
      '/sante/rappels-vaccinations/a-venir',
      {
        params: { projet_id: projetId },
      }
    );
    const normalized = normalize(rappels, [rappelVaccinationSchema]);
    return normalized;
  }
);

export const loadRappelsEnRetard = createAsyncThunk(
  'sante/loadRappelsEnRetard',
  async (projetId: string) => {
    const rappels = await apiClient.get<RappelVaccination[]>(
      '/sante/rappels-vaccinations/en-retard',
      {
        params: { projet_id: projetId },
      }
    );
    const normalized = normalize(rappels, [rappelVaccinationSchema]);
    return normalized;
  }
);

export const marquerRappelEnvoye = createAsyncThunk(
  'sante/marquerRappelEnvoye',
  async (id: string) => {
    await apiClient.patch(`/sante/rappels-vaccinations/${id}/marquer-envoye`);
    return id;
  }
);

// ============================================
// ACTIONS ASYNCHRONES - STATISTIQUES
// ============================================

export const loadStatistiquesVaccinations = createAsyncThunk<
  {
    total: number;
    effectuees: number;
    enAttente: number;
    enRetard: number;
    tauxCouverture: number;
    coutTotal: number;
  },
  string
>('sante/loadStatistiquesVaccinations', async (projetId: string) => {
  const stats = await apiClient.get<{
    total: number;
    effectuees: number;
    enAttente: number;
    enRetard: number;
    tauxCouverture: number;
    coutTotal: number;
  }>('/sante/stats/vaccinations', {
    params: { projet_id: projetId },
  });
  return stats;
});

export const loadStatistiquesMaladies = createAsyncThunk<
  {
    total: number;
    enCours: number;
    gueries: number;
    parType: { [key: string]: number };
    parGravite: { [key: string]: number };
    tauxGuerison: number;
  },
  string
>('sante/loadStatistiquesMaladies', async (projetId: string) => {
  const stats = await apiClient.get<{
    total: number;
    enCours: number;
    gueries: number;
    parType: { [key: string]: number };
    parGravite: { [key: string]: number };
    tauxGuerison: number;
  }>('/sante/stats/maladies', {
    params: { projet_id: projetId },
  });
  return stats;
});

export const loadStatistiquesTraitements = createAsyncThunk<
  {
    total: number;
    enCours: number;
    termines: number;
    coutTotal: number;
  },
  string
>('sante/loadStatistiquesTraitements', async (projetId: string) => {
  const stats = await apiClient.get<{
    total: number;
    enCours: number;
    termines: number;
    coutTotal: number;
  }>('/sante/stats/traitements', {
    params: { projet_id: projetId },
  });
  return stats;
});

// ============================================
// ACTIONS ASYNCHRONES - ALERTES
// ============================================

export const loadAlertesSanitaires = createAsyncThunk(
  'sante/loadAlertesSanitaires',
  async (projetId: string) => {
    const { SanteAlertesService } = await import('../../services/sante/SanteAlertesService');
    return await SanteAlertesService.getAlertesSanitaires(projetId);
  }
);

// ============================================
// SLICE
// ============================================

const santeSlice = createSlice({
  name: 'sante',
  initialState,
  reducers: {
    clearSanteError: (state) => {
      state.error = null;
    },
    clearAlertes: (state) => {
      state.alertes = [];
    },
  },
  extraReducers: (builder) => {
    // ============================================
    // CALENDRIER VACCINATIONS
    // ============================================
    builder
      .addCase(loadCalendrierVaccinations.pending, (state) => {
        state.loading.calendrier = true;
        state.error = null;
      })
      .addCase(loadCalendrierVaccinations.fulfilled, (state, action) => {
        state.loading.calendrier = false;
        if (action.payload.entities.calendrier_vaccinations) {
          state.entities.calendrier_vaccinations = action.payload.entities.calendrier_vaccinations;
        }
        if (action.payload.result) {
          state.ids.calendrier_vaccinations = action.payload.result as string[];
        }
      })
      .addCase(loadCalendrierVaccinations.rejected, (state, action) => {
        state.loading.calendrier = false;
        state.error = getErrorMessage(action.error) || 'Erreur lors du chargement du calendrier';
      })

      .addCase(createCalendrierVaccination.fulfilled, (state, action) => {
        const calendrier = action.payload;
        state.entities.calendrier_vaccinations[calendrier.id] = calendrier;
        if (!state.ids.calendrier_vaccinations.includes(calendrier.id)) {
          state.ids.calendrier_vaccinations.push(calendrier.id);
        }
      })

      .addCase(updateCalendrierVaccination.fulfilled, (state, action) => {
        const { id, updates } = action.payload;
        if (state.entities.calendrier_vaccinations[id]) {
          state.entities.calendrier_vaccinations[id] = updates;
        }
      })

      .addCase(deleteCalendrierVaccination.fulfilled, (state, action) => {
        const id = action.payload;
        delete state.entities.calendrier_vaccinations[id];
        state.ids.calendrier_vaccinations = state.ids.calendrier_vaccinations.filter(
          (cId) => cId !== id
        );
      })

      .addCase(initProtocolesVaccinationStandard.fulfilled, (state, action) => {
        if (action.payload.entities.calendrier_vaccinations) {
          state.entities.calendrier_vaccinations = action.payload.entities.calendrier_vaccinations;
        }
        if (action.payload.result) {
          state.ids.calendrier_vaccinations = action.payload.result as string[];
        }
      })

      // ============================================
      // VACCINATIONS
      // ============================================
      .addCase(loadVaccinations.pending, (state) => {
        state.loading.vaccinations = true;
        state.error = null;
      })
      .addCase(loadVaccinations.fulfilled, (state, action) => {
        state.loading.vaccinations = false;
        if (action.payload.entities.vaccinations) {
          state.entities.vaccinations = action.payload.entities.vaccinations;
        }
        if (action.payload.result) {
          state.ids.vaccinations = action.payload.result as string[];
        }
      })
      .addCase(loadVaccinations.rejected, (state, action) => {
        state.loading.vaccinations = false;
        state.error = getErrorMessage(action.error) || 'Erreur lors du chargement des vaccinations';
      })

      .addCase(createVaccination.fulfilled, (state, action) => {
        const vaccination = action.payload;
        state.entities.vaccinations[vaccination.id] = vaccination;
        if (!state.ids.vaccinations.includes(vaccination.id)) {
          state.ids.vaccinations.push(vaccination.id);
        }
      })

      .addCase(updateVaccination.fulfilled, (state, action) => {
        const { id, updates } = action.payload;
        if (state.entities.vaccinations[id]) {
          state.entities.vaccinations[id] = updates;
        }
      })

      .addCase(deleteVaccination.fulfilled, (state, action) => {
        const id = action.payload;
        delete state.entities.vaccinations[id];
        state.ids.vaccinations = state.ids.vaccinations.filter((vId) => vId !== id);
      })

      .addCase(loadVaccinationsEnRetard.fulfilled, (state, action) => {
        if (action.payload.entities.vaccinations) {
          // Merge avec les vaccinations existantes
          state.entities.vaccinations = {
            ...state.entities.vaccinations,
            ...action.payload.entities.vaccinations,
          };
        }
      })

      .addCase(loadVaccinationsAVenir.fulfilled, (state, action) => {
        if (action.payload.entities.vaccinations) {
          state.entities.vaccinations = {
            ...state.entities.vaccinations,
            ...action.payload.entities.vaccinations,
          };
        }
      })

      // ============================================
      // MALADIES
      // ============================================
      .addCase(loadMaladies.pending, (state) => {
        state.loading.maladies = true;
        state.error = null;
      })
      .addCase(loadMaladies.fulfilled, (state, action) => {
        state.loading.maladies = false;
        if (action.payload.entities.maladies) {
          state.entities.maladies = action.payload.entities.maladies;
        }
        if (action.payload.result) {
          state.ids.maladies = action.payload.result as string[];
        }
      })
      .addCase(loadMaladies.rejected, (state, action) => {
        state.loading.maladies = false;
        state.error = getErrorMessage(action.error) || 'Erreur lors du chargement des maladies';
      })

      .addCase(createMaladie.fulfilled, (state, action) => {
        const maladie = action.payload;
        state.entities.maladies[maladie.id] = maladie;
        if (!state.ids.maladies.includes(maladie.id)) {
          state.ids.maladies.push(maladie.id);
        }
      })

      .addCase(updateMaladie.fulfilled, (state, action) => {
        const { id, updates } = action.payload;
        if (state.entities.maladies[id]) {
          state.entities.maladies[id] = updates;
        }
      })

      .addCase(deleteMaladie.fulfilled, (state, action) => {
        const id = action.payload;
        delete state.entities.maladies[id];
        state.ids.maladies = state.ids.maladies.filter((mId) => mId !== id);
      })

      .addCase(loadMaladiesEnCours.fulfilled, (state, action) => {
        if (action.payload.entities.maladies) {
          state.entities.maladies = {
            ...state.entities.maladies,
            ...action.payload.entities.maladies,
          };
        }
      })

      // ============================================
      // TRAITEMENTS
      // ============================================
      .addCase(loadTraitements.pending, (state) => {
        state.loading.traitements = true;
        state.error = null;
      })
      .addCase(loadTraitements.fulfilled, (state, action) => {
        state.loading.traitements = false;
        if (action.payload.entities.traitements) {
          state.entities.traitements = action.payload.entities.traitements;
        }
        if (action.payload.result) {
          state.ids.traitements = action.payload.result as string[];
        }
      })
      .addCase(loadTraitements.rejected, (state, action) => {
        state.loading.traitements = false;
        state.error = getErrorMessage(action.error) || 'Erreur lors du chargement des traitements';
      })

      .addCase(createTraitement.fulfilled, (state, action) => {
        const traitement = action.payload;
        state.entities.traitements[traitement.id] = traitement;
        if (!state.ids.traitements.includes(traitement.id)) {
          state.ids.traitements.push(traitement.id);
        }
      })

      .addCase(updateTraitement.fulfilled, (state, action) => {
        const { id, updates } = action.payload;
        if (state.entities.traitements[id]) {
          state.entities.traitements[id] = updates;
        }
      })

      .addCase(deleteTraitement.fulfilled, (state, action) => {
        const id = action.payload;
        delete state.entities.traitements[id];
        state.ids.traitements = state.ids.traitements.filter((tId) => tId !== id);
      })

      .addCase(loadTraitementsEnCours.fulfilled, (state, action) => {
        if (action.payload.entities.traitements) {
          state.entities.traitements = {
            ...state.entities.traitements,
            ...action.payload.entities.traitements,
          };
        }
      })

      // ============================================
      // VISITES VÉTÉRINAIRES
      // ============================================
      .addCase(loadVisitesVeterinaires.pending, (state) => {
        state.loading.visites = true;
        state.error = null;
      })
      .addCase(loadVisitesVeterinaires.fulfilled, (state, action) => {
        state.loading.visites = false;
        if (action.payload.entities.visites_veterinaires) {
          state.entities.visites_veterinaires = action.payload.entities.visites_veterinaires;
        }
        if (action.payload.result) {
          state.ids.visites_veterinaires = action.payload.result as string[];
        }
      })
      .addCase(loadVisitesVeterinaires.rejected, (state, action) => {
        state.loading.visites = false;
        state.error = getErrorMessage(action.error) || 'Erreur lors du chargement des visites';
      })

      .addCase(createVisiteVeterinaire.fulfilled, (state, action) => {
        const visite = action.payload;
        state.entities.visites_veterinaires[visite.id] = visite;
        if (!state.ids.visites_veterinaires.includes(visite.id)) {
          state.ids.visites_veterinaires.push(visite.id);
        }
      })

      .addCase(updateVisiteVeterinaire.fulfilled, (state, action) => {
        const { id, updates } = action.payload;
        if (state.entities.visites_veterinaires[id]) {
          state.entities.visites_veterinaires[id] = updates;
        }
      })

      .addCase(deleteVisiteVeterinaire.fulfilled, (state, action) => {
        const id = action.payload;
        delete state.entities.visites_veterinaires[id];
        state.ids.visites_veterinaires = state.ids.visites_veterinaires.filter((vId) => vId !== id);
      })

      // ============================================
      // RAPPELS VACCINATIONS
      // ============================================
      .addCase(loadRappelsVaccinations.pending, (state) => {
        state.loading.rappels = true;
        state.error = null;
      })
      .addCase(loadRappelsVaccinations.fulfilled, (state, action) => {
        state.loading.rappels = false;
        if (action.payload.entities.rappels_vaccinations) {
          state.entities.rappels_vaccinations = action.payload.entities.rappels_vaccinations;
        }
        if (action.payload.result) {
          state.ids.rappels_vaccinations = action.payload.result as string[];
        }
      })
      .addCase(loadRappelsVaccinations.rejected, (state, action) => {
        state.loading.rappels = false;
        state.error = getErrorMessage(action.error) || 'Erreur lors du chargement des rappels';
      })

      .addCase(loadRappelsAVenir.fulfilled, (state, action) => {
        if (action.payload.entities.rappels_vaccinations) {
          state.entities.rappels_vaccinations = {
            ...state.entities.rappels_vaccinations,
            ...action.payload.entities.rappels_vaccinations,
          };
        }
      })

      .addCase(loadRappelsEnRetard.fulfilled, (state, action) => {
        if (action.payload.entities.rappels_vaccinations) {
          state.entities.rappels_vaccinations = {
            ...state.entities.rappels_vaccinations,
            ...action.payload.entities.rappels_vaccinations,
          };
        }
      })

      .addCase(marquerRappelEnvoye.fulfilled, (state, action) => {
        const id = action.payload;
        if (state.entities.rappels_vaccinations[id]) {
          state.entities.rappels_vaccinations[id] = {
            ...state.entities.rappels_vaccinations[id],
            envoi: true,
            date_envoi: new Date().toISOString(),
          };
        }
      })

      // ============================================
      // STATISTIQUES
      // ============================================
      .addCase(loadStatistiquesVaccinations.pending, (state) => {
        state.loading.statistics = true;
      })
      .addCase(loadStatistiquesVaccinations.fulfilled, (state, action) => {
        state.loading.statistics = false;
        state.statistics.vaccinations = action.payload;
      })
      .addCase(loadStatistiquesVaccinations.rejected, (state, action) => {
        state.loading.statistics = false;
        state.error = getErrorMessage(action.error) || 'Erreur lors du chargement des statistiques';
      })

      .addCase(loadStatistiquesMaladies.fulfilled, (state, action) => {
        state.statistics.maladies = action.payload;
      })

      .addCase(loadStatistiquesTraitements.fulfilled, (state, action) => {
        state.statistics.traitements = action.payload;
      })

      // ============================================
      // ALERTES
      // ============================================
      .addCase(loadAlertesSanitaires.pending, (state) => {
        state.loading.alertes = true;
      })
      .addCase(loadAlertesSanitaires.fulfilled, (state, action) => {
        state.loading.alertes = false;
        state.alertes = action.payload;
      })
      .addCase(loadAlertesSanitaires.rejected, (state, action) => {
        state.loading.alertes = false;
        state.error = getErrorMessage(action.error) || 'Erreur lors du chargement des alertes';
      });
  },
});

export const { clearSanteError, clearAlertes } = santeSlice.actions;
export default santeSlice.reducer;
