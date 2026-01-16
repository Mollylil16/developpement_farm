/**
 * Slice Redux pour la gestion des collaborations
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getErrorMessage } from '../../types/common';
import type {
  Collaborateur,
  CreateCollaborateurInput,
  UpdateCollaborateurInput,
} from '../../types/collaboration';
import { DEFAULT_PERMISSIONS } from '../../types/collaboration';
import apiClient from '../../services/api/apiClient';

interface CollaborationState {
  collaborateurs: Collaborateur[];
  collaborateurActuel: Collaborateur | null; // Collaborateur actuel pour le projet actif
  invitationsEnAttente: Collaborateur[]; // Invitations en attente pour l'utilisateur connecté
  loading: boolean;
  error: string | null;
}

const initialState: CollaborationState = {
  collaborateurs: [],
  collaborateurActuel: null,
  invitationsEnAttente: [],
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

      const collaborateur = await apiClient.post<Collaborateur>('/collaborations', {
        ...input,
        statut: input.statut || 'en_attente',
        permissions,
      });

      // TODO: La synchronisation avec vetProfile.clients sera gérée côté backend si nécessaire
      return collaborateur;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const loadCollaborateurs = createAsyncThunk(
  'collaboration/loadCollaborateurs',
  async (projetId: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<{ data: Collaborateur[]; pagination: any } | Collaborateur[]>('/collaborations', {
        params: { projet_id: projetId },
      });
      // Gérer la nouvelle structure avec pagination ou l'ancienne structure directe
      const collaborateurs = Array.isArray(response) ? response : response.data || [];
      return collaborateurs;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const loadCollaborateursParProjet = createAsyncThunk(
  'collaboration/loadCollaborateursParProjet',
  async (projetId: string, { rejectWithValue }) => {
    try {
      if (!projetId) {
        return [];
      }
      const response = await apiClient.get<{ data: Collaborateur[]; pagination: any } | Collaborateur[]>('/collaborations', {
        params: { projet_id: projetId },
      });
      // Gérer la nouvelle structure avec pagination ou l'ancienne structure directe
      const collaborateurs = Array.isArray(response) ? response : response.data || [];
      return collaborateurs;
    } catch (error: unknown) {
      // Si le projet n'existe pas (404), retourner un tableau vide sans logger d'erreur
      const errorMessage = getErrorMessage(error);
      const is404 = errorMessage?.includes('introuvable') || 
                    errorMessage?.includes('Not Found') || 
                    errorMessage?.includes('404') ||
                    (error as any)?.response?.status === 404 ||
                    (error as any)?.status === 404;
      
      if (is404) {
        // Projet introuvable : retourner un tableau vide silencieusement
        return [];
      }
      
      // Pour les autres erreurs, logger et rejeter
      console.warn('[CollaborationSlice] Erreur lors du chargement des collaborateurs:', errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

export const updateCollaborateur = createAsyncThunk(
  'collaboration/updateCollaborateur',
  async (
    { id, updates }: { id: string; updates: UpdateCollaborateurInput },
    { rejectWithValue }
  ) => {
    try {
      const collaborateur = await apiClient.patch<Collaborateur>(`/collaborations/${id}`, updates);
      // TODO: La synchronisation avec vetProfile.clients sera gérée côté backend si nécessaire
      return collaborateur;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const deleteCollaborateur = createAsyncThunk(
  'collaboration/deleteCollaborateur',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/collaborations/${id}`);
      return id;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const accepterInvitation = createAsyncThunk(
  'collaboration/accepterInvitation',
  async (id: string, { rejectWithValue }) => {
    try {
      if (!id) {
        throw new Error("L'ID de l'invitation est manquant");
      }

      const collaborateur = await apiClient.patch<Collaborateur>(`/collaborations/${id}/accepter`, {});
      return collaborateur;
    } catch (error: unknown) {
      console.error(`Erreur lors de l'acceptation de l'invitation ${id}:`, error);
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Charger le collaborateur actuel pour le projet actif et l'utilisateur connecté
 */
export const loadCollaborateurActuel = createAsyncThunk(
  'collaboration/loadCollaborateurActuel',
  async ({ userId, projetId }: { userId: string; projetId: string }, { rejectWithValue }) => {
    try {
      const collaborateur = await apiClient.get<Collaborateur | null>('/collaborations/actuel', {
        params: { projet_id: projetId },
      });
      return collaborateur;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Charger les invitations en attente pour un utilisateur
 * Utilise user_id si disponible, sinon email OU telephone
 */
export const loadInvitationsEnAttente = createAsyncThunk(
  'collaboration/loadInvitationsEnAttente',
  async (
    { userId, email, telephone }: { userId?: string; email?: string; telephone?: string },
    { rejectWithValue }
  ) => {
    try {
      if (!userId && !email && !telephone) {
        return [];
      }

      const params: Record<string, string> = {};
      if (email) params.email = email;
      if (telephone) params.telephone = telephone;

      const invitations = await apiClient.get<Collaborateur[]>('/collaborations/invitations', {
        params,
      });
      return invitations;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

/**
 * Rejeter une invitation
 */
export const rejeterInvitation = createAsyncThunk(
  'collaboration/rejeterInvitation',
  async (id: string, { rejectWithValue }) => {
    try {
      if (!id) {
        throw new Error("L'ID de l'invitation est manquant");
      }

      await apiClient.patch(`/collaborations/${id}/rejeter`, {});
      return id;
    } catch (error: unknown) {
      console.error(`Erreur lors du rejet de l'invitation ${id}:`, error);
      return rejectWithValue(getErrorMessage(error));
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
    clearCollaborateurActuel: (state) => {
      state.collaborateurActuel = null;
    },
    clearInvitationsEnAttente: (state) => {
      state.invitationsEnAttente = [];
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
        const index = state.collaborateurs.findIndex(
          (c: Collaborateur) => c.id === action.payload.id
        );
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
        state.collaborateurs = state.collaborateurs.filter(
          (c: Collaborateur) => c.id !== action.payload
        );
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
        const index = state.collaborateurs.findIndex(
          (c: Collaborateur) => c.id === action.payload.id
        );
        if (index !== -1) {
          state.collaborateurs[index] = action.payload;
        }
        // Retirer de la liste des invitations en attente
        state.invitationsEnAttente = state.invitationsEnAttente.filter(
          (inv) => inv.id !== action.payload.id
        );
      })
      .addCase(accepterInvitation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // loadCollaborateurActuel
      .addCase(loadCollaborateurActuel.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadCollaborateurActuel.fulfilled, (state, action) => {
        state.loading = false;
        state.collaborateurActuel = action.payload;
      })
      .addCase(loadCollaborateurActuel.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.collaborateurActuel = null;
      })
      // loadInvitationsEnAttente
      .addCase(loadInvitationsEnAttente.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadInvitationsEnAttente.fulfilled, (state, action) => {
        state.loading = false;
        state.invitationsEnAttente = action.payload;
      })
      .addCase(loadInvitationsEnAttente.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // rejeterInvitation
      .addCase(rejeterInvitation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(rejeterInvitation.fulfilled, (state, action) => {
        state.loading = false;
        state.invitationsEnAttente = state.invitationsEnAttente.filter(
          (inv) => inv.id !== action.payload
        );
      })
      .addCase(rejeterInvitation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCollaborateurActuel, clearInvitationsEnAttente } =
  collaborationSlice.actions;
export default collaborationSlice.reducer;
