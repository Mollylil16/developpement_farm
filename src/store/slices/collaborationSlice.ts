/**
 * Slice Redux pour la gestion des collaborations
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getErrorMessage } from '../../types/common';
import {
  Collaborateur,
  CreateCollaborateurInput,
  UpdateCollaborateurInput,
  DEFAULT_PERMISSIONS,
} from '../../types';

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
      const { getDatabase } = await import('../../services/database');
      const { CollaborateurRepository, UserRepository, ProjetRepository } = await import('../../database/repositories');
      const db = await getDatabase();
      const collaborateurRepo = new CollaborateurRepository(db);
      const userRepo = new UserRepository(db);
      const projetRepo = new ProjetRepository(db);
      
      const permissions = input.permissions
        ? { ...DEFAULT_PERMISSIONS[input.role], ...input.permissions }
        : DEFAULT_PERMISSIONS[input.role];
      
      const collaborateur = await collaborateurRepo.create({
        ...input,
        statut: input.statut || 'en_attente',
        permissions,
        date_invitation: new Date().toISOString(),
      });

      // Si c'est une collaboration vétérinaire avec un user_id et statut actif, synchroniser avec vetProfile.clients
      if (input.role === 'veterinaire' && input.user_id && (input.statut === 'actif' || !input.statut)) {
        try {
          const vet = await userRepo.findById(input.user_id);
          if (vet && vet.roles?.veterinarian) {
            const vetProfile = vet.roles.veterinarian;
            const farm = await projetRepo.findById(input.projet_id);
            
            // Vérifier si la ferme n'est pas déjà dans les clients
            const existingClient = vetProfile.clients.find(c => c.farmId === input.projet_id);
            if (!existingClient && farm) {
              const updatedClients = [
                ...vetProfile.clients,
                {
                  farmId: input.projet_id,
                  farmName: farm.nom || 'Ferme',
                  since: new Date().toISOString(),
                  status: 'active' as const,
                  contractType: 'consultation' as const,
                },
              ];

              const updatedRoles = {
                ...vet.roles,
                veterinarian: {
                  ...vetProfile,
                  clients: updatedClients,
                },
              };

              await userRepo.update(input.user_id, {
                roles: updatedRoles,
              });
            }
          }
        } catch (syncError) {
          // Ne pas faire échouer la création de collaboration si la synchronisation échoue
          console.warn('Erreur lors de la synchronisation avec vetProfile.clients:', syncError);
        }
      }

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
      const { getDatabase } = await import('../../services/database');
      const { CollaborateurRepository } = await import('../../database/repositories');
      const db = await getDatabase();
      const collaborateurRepo = new CollaborateurRepository(db);
      const collaborateurs = await collaborateurRepo.findByProjet(projetId);
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
      const { getDatabase } = await import('../../services/database');
      const { CollaborateurRepository } = await import('../../database/repositories');
      const db = await getDatabase();
      const collaborateurRepo = new CollaborateurRepository(db);
      const collaborateurs = await collaborateurRepo.findByProjet(projetId);
      return collaborateurs;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error));
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
      const { getDatabase } = await import('../../services/database');
      const { CollaborateurRepository, UserRepository, ProjetRepository } = await import('../../database/repositories');
      const db = await getDatabase();
      const collaborateurRepo = new CollaborateurRepository(db);
      const userRepo = new UserRepository(db);
      const projetRepo = new ProjetRepository(db);
      
      // Récupérer la collaboration avant la mise à jour
      const existingCollaborateur = await collaborateurRepo.findById(id);
      if (!existingCollaborateur) {
        throw new Error('Collaboration non trouvée');
      }

      const collaborateur = await collaborateurRepo.update(id, updates);

      // Si la collaboration devient active et que c'est un vétérinaire avec user_id, synchroniser
      if (
        collaborateur.role === 'veterinaire' &&
        collaborateur.user_id &&
        (updates.statut === 'actif' || (existingCollaborateur.statut !== 'actif' && collaborateur.statut === 'actif'))
      ) {
        try {
          const vet = await userRepo.findById(collaborateur.user_id);
          if (vet && vet.roles?.veterinarian) {
            const vetProfile = vet.roles.veterinarian;
            const farm = await projetRepo.findById(collaborateur.projet_id);
            
            // Vérifier si la ferme n'est pas déjà dans les clients
            const existingClient = vetProfile.clients.find(c => c.farmId === collaborateur.projet_id);
            if (!existingClient && farm) {
              const updatedClients = [
                ...vetProfile.clients,
                {
                  farmId: collaborateur.projet_id,
                  farmName: farm.nom || 'Ferme',
                  since: new Date().toISOString(),
                  status: 'active' as const,
                  contractType: 'consultation' as const,
                },
              ];

              const updatedRoles = {
                ...vet.roles,
                veterinarian: {
                  ...vetProfile,
                  clients: updatedClients,
                },
              };

              await userRepo.update(collaborateur.user_id, {
                roles: updatedRoles,
              });
            }
          }
        } catch (syncError) {
          // Ne pas faire échouer la mise à jour si la synchronisation échoue
          console.warn('Erreur lors de la synchronisation avec vetProfile.clients:', syncError);
        }
      }

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
      const { getDatabase } = await import('../../services/database');
      const { CollaborateurRepository } = await import('../../database/repositories');
      const db = await getDatabase();
      const collaborateurRepo = new CollaborateurRepository(db);
      await collaborateurRepo.deleteById(id);
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
      const { getDatabase } = await import('../../services/database');
      const { CollaborateurRepository, UserRepository, ProjetRepository } = await import('../../database/repositories');
      const db = await getDatabase();
      const collaborateurRepo = new CollaborateurRepository(db);
      const userRepo = new UserRepository(db);
      const projetRepo = new ProjetRepository(db);
      
      // Récupérer la collaboration avant la mise à jour pour vérifier le rôle
      const existingCollaborateur = await collaborateurRepo.findById(id);
      if (!existingCollaborateur) {
        throw new Error('Collaboration non trouvée');
      }

      const collaborateur = await collaborateurRepo.update(id, {
        statut: 'actif',
        date_acceptation: new Date().toISOString(),
      });

      // Si c'est une collaboration vétérinaire avec un user_id, synchroniser avec vetProfile.clients
      if (collaborateur.role === 'veterinaire' && collaborateur.user_id) {
        try {
          const vet = await userRepo.findById(collaborateur.user_id);
          if (vet && vet.roles?.veterinarian) {
            const vetProfile = vet.roles.veterinarian;
            const farm = await projetRepo.findById(collaborateur.projet_id);
            
            // Vérifier si la ferme n'est pas déjà dans les clients
            const existingClient = vetProfile.clients.find(c => c.farmId === collaborateur.projet_id);
            if (!existingClient && farm) {
              const updatedClients = [
                ...vetProfile.clients,
                {
                  farmId: collaborateur.projet_id,
                  farmName: farm.nom || 'Ferme',
                  since: new Date().toISOString(),
                  status: 'active' as const,
                  contractType: 'consultation' as const,
                },
              ];

              const updatedRoles = {
                ...vet.roles,
                veterinarian: {
                  ...vetProfile,
                  clients: updatedClients,
                },
              };

              await userRepo.update(collaborateur.user_id, {
                roles: updatedRoles,
              });
            }
          }
        } catch (syncError) {
          // Ne pas faire échouer l'acceptation si la synchronisation échoue
          console.warn('Erreur lors de la synchronisation avec vetProfile.clients:', syncError);
        }
      }

      return collaborateur;
    } catch (error: unknown) {
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
      const { getDatabase } = await import('../../services/database');
      const { CollaborateurRepository } = await import('../../database/repositories');
      const db = await getDatabase();
      const collaborateurRepo = new CollaborateurRepository(db);
      // Chercher le collaborateur actif pour cet utilisateur et ce projet
      const collaborateurs = await collaborateurRepo.findActifsByUserId(userId);
      const collaborateur = collaborateurs.find(
        (c) => c.projet_id === projetId && c.statut === 'actif'
      );

      return collaborateur || null;
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error));
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

      const { getDatabase } = await import('../../services/database');
      const { CollaborateurRepository } = await import('../../database/repositories');
      const db = await getDatabase();
      const collaborateurRepo = new CollaborateurRepository(db);

      let invitations: Collaborateur[] = [];

      // D'abord essayer par user_id si disponible
      if (userId) {
        invitations = await collaborateurRepo.findInvitationsEnAttenteByUserId(userId);
      }

      // Si pas d'invitations par user_id, essayer par email
      if (invitations.length === 0 && email) {
        invitations = await collaborateurRepo.findInvitationsEnAttenteByEmail(email);
        // Si on trouve des invitations par email et qu'on a un userId, les lier
        if (invitations.length > 0 && userId) {
          for (const invitation of invitations) {
            if (!invitation.user_id) {
              await collaborateurRepo.lierAUserParEmail(email, userId);
            }
          }
          // Recharger après liaison
          invitations = await collaborateurRepo.findInvitationsEnAttenteByUserId(userId);
        }
      }

      return invitations;
    } catch (error: unknown) {
      return rejectWithValue(
        getErrorMessage(error)
      );
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
      const { getDatabase } = await import('../../services/database');
      const { CollaborateurRepository } = await import('../../database/repositories');
      const db = await getDatabase();
      const collaborateurRepo = new CollaborateurRepository(db);
      await collaborateurRepo.update(id, {
        statut: 'inactif',
      });
      return id;
    } catch (error: unknown) {
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
