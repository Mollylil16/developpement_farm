/**
 * Slice Redux pour la gestion des collaborations
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Collaborateur, CreateCollaborateurInput, UpdateCollaborateurInput, DEFAULT_PERMISSIONS } from '../../types';
import { databaseService } from '../../services/database';

interface CollaborationState {
  collaborateurs: Collaborateur[];
  loading: boolean;
  error: string | null;
}

const initialState: CollaborationState = {
  collaborateurs: [],
  loading: false,
  error: null,
};

// Thunks pour Collaborations
export const createCollaborateur = createAsyncThunk(
  'collaboration/createCollaborateur',
  async (input: CreateCollaborateurInput, { rejectWithValue }) => {
    try {
      const permissions = input.permissions 
        ? { ...DEFAULT_PERMISSIONS[input.role], ...input.permissions }
        : DEFAULT_PERMISSIONS[input.role];
      const collaborateur = await databaseService.createCollaborateur({
        ...input,
        statut: input.statut || 'en_attente',
        permissions,
        date_invitation: new Date().toISOString(),
      });
      return collaborateur;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la création du collaborateur');
    }
  }
);

export const loadCollaborateurs = createAsyncThunk(
  'collaboration/loadCollaborateurs',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const collaborateurs = await databaseService.getAllCollaborateurs(projetId);
      return collaborateurs;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des collaborateurs');
    }
  }
);

export const loadCollaborateursParProjet = createAsyncThunk(
  'collaboration/loadCollaborateursParProjet',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const collaborateurs = await databaseService.getCollaborateursParProjet(projetId);
      return collaborateurs;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des collaborateurs');
    }
  }
);

export const updateCollaborateur = createAsyncThunk(
  'collaboration/updateCollaborateur',
  async ({ id, updates }: { id: string; updates: UpdateCollaborateurInput }, { rejectWithValue }) => {
    try {
      const collaborateur = await databaseService.updateCollaborateur(id, updates);
      return collaborateur;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la mise à jour du collaborateur');
    }
  }
);

export const deleteCollaborateur = createAsyncThunk(
  'collaboration/deleteCollaborateur',
  async (id: string, { rejectWithValue }) => {
    try {
      await databaseService.deleteCollaborateur(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de la suppression du collaborateur');
    }
  }
);

export const accepterInvitation = createAsyncThunk(
  'collaboration/accepterInvitation',
  async (id: string, { rejectWithValue }) => {
    try {
      const collaborateur = await databaseService.updateCollaborateur(id, {
        statut: 'actif',
        date_acceptation: new Date().toISOString(),
      });
      return collaborateur;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors de l\'acceptation de l\'invitation');
    }
  }
);

const collaborationSlice = createSlice({
  name: 'collaboration',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // createCollaborateur
      .addCase(createCollaborateur.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCollaborateur.fulfilled, (state, action) => {
        state.loading = false;
        state.collaborateurs.unshift(action.payload);
      })
      .addCase(createCollaborateur.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadCollaborateurs
      .addCase(loadCollaborateurs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadCollaborateurs.fulfilled, (state, action) => {
        state.loading = false;
        state.collaborateurs = action.payload;
      })
      .addCase(loadCollaborateurs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadCollaborateursParProjet
      .addCase(loadCollaborateursParProjet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadCollaborateursParProjet.fulfilled, (state, action) => {
        state.loading = false;
        state.collaborateurs = action.payload;
      })
      .addCase(loadCollaborateursParProjet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // updateCollaborateur
      .addCase(updateCollaborateur.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCollaborateur.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.collaborateurs.findIndex((c: Collaborateur) => c.id === action.payload.id);
        if (index !== -1) {
          state.collaborateurs[index] = action.payload;
        }
      })
      .addCase(updateCollaborateur.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // deleteCollaborateur
      .addCase(deleteCollaborateur.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCollaborateur.fulfilled, (state, action) => {
        state.loading = false;
        state.collaborateurs = state.collaborateurs.filter((c: Collaborateur) => c.id !== action.payload);
      })
      .addCase(deleteCollaborateur.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // accepterInvitation
      .addCase(accepterInvitation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(accepterInvitation.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.collaborateurs.findIndex((c: Collaborateur) => c.id === action.payload.id);
        if (index !== -1) {
          state.collaborateurs[index] = action.payload;
        }
      })
      .addCase(accepterInvitation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = collaborationSlice.actions;
export default collaborationSlice.reducer;

