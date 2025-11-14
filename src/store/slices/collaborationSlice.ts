/**
 * Slice Redux pour la gestion des collaborations
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Collaborateur, CreateCollaborateurInput, UpdateCollaborateurInput, DEFAULT_PERMISSIONS } from '../../types';
import { databaseService } from '../../services/database';

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

/**
 * Charger le collaborateur actuel pour le projet actif et l'utilisateur connecté
 */
export const loadCollaborateurActuel = createAsyncThunk(
  'collaboration/loadCollaborateurActuel',
  async ({ userId, projetId }: { userId: string; projetId: string }, { rejectWithValue }) => {
    try {
      // Chercher le collaborateur actif pour cet utilisateur et ce projet
      const collaborateurs = await databaseService.getCollaborateursActifsParUserId(userId);
      const collaborateur = collaborateurs.find((c) => c.projet_id === projetId && c.statut === 'actif');
      
      return collaborateur || null;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement du collaborateur actuel');
    }
  }
);

/**
 * Charger les invitations en attente pour un utilisateur
 * Utilise user_id si disponible, sinon email
 */
export const loadInvitationsEnAttente = createAsyncThunk(
  'collaboration/loadInvitationsEnAttente',
  async ({ userId, email }: { userId?: string; email?: string }, { rejectWithValue }) => {
    try {
      if (!userId && !email) {
        return [];
      }

      let invitations: Collaborateur[] = [];
      
      // D'abord essayer par user_id si disponible
      if (userId) {
        invitations = await databaseService.getInvitationsEnAttenteParUserId(userId);
      }
      
      // Si pas d'invitations par user_id, essayer par email
      if (invitations.length === 0 && email) {
        invitations = await databaseService.getInvitationsEnAttenteParEmail(email);
        // Si on trouve des invitations par email et qu'on a un userId, les lier
        if (invitations.length > 0 && userId) {
          for (const invitation of invitations) {
            if (!invitation.user_id) {
              await databaseService.lierCollaborateurAUtilisateur(userId, email);
            }
          }
          // Recharger après liaison
          invitations = await databaseService.getInvitationsEnAttenteParUserId(userId);
        }
      }
      
      return invitations;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du chargement des invitations en attente');
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
      await databaseService.updateCollaborateur(id, {
        statut: 'inactif',
      });
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Erreur lors du rejet de l\'invitation');
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

export const { clearError, clearCollaborateurActuel, clearInvitationsEnAttente } = collaborationSlice.actions;
export default collaborationSlice.reducer;

