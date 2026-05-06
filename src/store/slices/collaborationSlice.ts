import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Collaborateur, CreateCollaborateurInput, UpdateCollaborateurInput } from '../../types/collaboration';
import type { Projet, Utilisateur, ActiviteUtilisateur, InvitationProjet, PermissionsProjet } from '../../types';
import apiClient from '../../services/api/apiClient';

// ---------------------------------------------------------------------------
// Async thunks — Collaborateur-based (new API)
// ---------------------------------------------------------------------------

export const loadCollaborateursParProjet = createAsyncThunk(
  'collaboration/loadCollaborateursParProjet',
  async (projetId: string, { rejectWithValue }) => {
    try {
      return await apiClient.get<Collaborateur[]>(`/collaborateurs?projet_id=${projetId}`);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erreur lors du chargement des collaborateurs');
    }
  }
);

/** Alias used by VeterinaireComponent */
export const loadCollaborateurs = loadCollaborateursParProjet;

export const loadInvitationsEnAttente = createAsyncThunk(
  'collaboration/loadInvitationsEnAttente',
  async (
    params: { userId?: string; email?: string | null; telephone?: string | null },
    { rejectWithValue }
  ) => {
    try {
      const query = new URLSearchParams();
      if (params.userId) query.set('user_id', params.userId);
      if (params.email) query.set('email', params.email);
      if (params.telephone) query.set('telephone', params.telephone);
      return await apiClient.get<Collaborateur[]>(`/collaborateurs/invitations/en-attente?${query.toString()}`);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erreur lors du chargement des invitations');
    }
  }
);

export const loadCollaborationsActives = createAsyncThunk(
  'collaboration/loadCollaborationsActives',
  async (userId: string, { rejectWithValue }) => {
    try {
      return await apiClient.get<Collaborateur[]>(`/collaborateurs/actives?user_id=${userId}`);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erreur lors du chargement des collaborations');
    }
  }
);

export const loadCollaborateurActuel = createAsyncThunk(
  'collaboration/loadCollaborateurActuel',
  async (params: { projetId: string; userId: string }, { rejectWithValue }) => {
    try {
      const collaborateurs = await apiClient.get<Collaborateur[]>(
        `/collaborateurs?projet_id=${params.projetId}&user_id=${params.userId}`
      );
      return collaborateurs.length > 0 ? collaborateurs[0] : null;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erreur lors du chargement du collaborateur');
    }
  }
);

/** Selects (and loads) the collaboratif project for a vet/tech user */
export const selectProjetCollaboratif = createAsyncThunk(
  'collaboration/selectProjetCollaboratif',
  async (params: { projetId: string; userId: string }, { rejectWithValue }) => {
    try {
      const [projet, collaborateurs] = await Promise.all([
        apiClient.get<Projet>(`/projets/${params.projetId}`),
        apiClient.get<Collaborateur[]>(
          `/collaborateurs?projet_id=${params.projetId}&user_id=${params.userId}`
        ),
      ]);
      const collaborateurActuel = collaborateurs.length > 0 ? collaborateurs[0] : null;
      return { projet, collaborateurActuel };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erreur lors de la sélection du projet');
    }
  }
);

export const createCollaborateur = createAsyncThunk(
  'collaboration/createCollaborateur',
  async (data: CreateCollaborateurInput, { rejectWithValue }) => {
    try {
      return await apiClient.post<Collaborateur>('/collaborateurs', data);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erreur lors de la création du collaborateur');
    }
  }
);

export const updateCollaborateur = createAsyncThunk(
  'collaboration/updateCollaborateur',
  async (params: { id: string; data: UpdateCollaborateurInput }, { rejectWithValue }) => {
    try {
      return await apiClient.patch<Collaborateur>(`/collaborateurs/${params.id}`, params.data);
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erreur lors de la mise à jour du collaborateur');
    }
  }
);

export const deleteCollaborateur = createAsyncThunk(
  'collaboration/deleteCollaborateur',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/collaborateurs/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Erreur lors de la suppression du collaborateur');
    }
  }
);

export const accepterInvitation = createAsyncThunk(
  'collaboration/accepterInvitation',
  async (id: string, { rejectWithValue }) => {
    try {
      return await apiClient.patch<Collaborateur>(`/collaborateurs/${id}/accepter`, {});
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Erreur lors de l'acceptation de l'invitation");
    }
  }
);

export const rejeterInvitation = createAsyncThunk(
  'collaboration/rejeterInvitation',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.patch(`/collaborateurs/${id}/rejeter`, {});
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "Erreur lors du rejet de l'invitation");
    }
  }
);

// ---------------------------------------------------------------------------
// Async thunks — Legacy project-based (kept for CollaborationScreen.tsx)
// ---------------------------------------------------------------------------

export const creerProjet = createAsyncThunk(
  'collaboration/creerProjet',
  async (donneesProjet: { nom: string; description?: string; proprietaireId: string; proprietaireNom: string }) => {
    const dateNow = new Date().toISOString();
    const nouveauProjet: Projet = {
      id: `projet_${Date.now()}`,
      nom: donneesProjet.nom,
      description: donneesProjet.description,
      proprietaireId: donneesProjet.proprietaireId,
      proprietaireNom: donneesProjet.proprietaireNom,
      dateCreation: dateNow,
      derniereModification: dateNow,
      statut: 'actif',
      utilisateurs: [{
        id: donneesProjet.proprietaireId,
        nom: donneesProjet.proprietaireNom,
        email: 'proprietaire@example.com',
        role: 'proprietaire',
        dateAjout: dateNow,
      }],
      lienPartage: `farmtrack://projet/${Date.now()}`,
      permissions: {
        peutModifierPorcs: true,
        peutModifierGestations: true,
        peutModifierNutrition: true,
        peutModifierFinance: true,
        peutModifierPlanification: true,
        peutInviterUtilisateurs: true,
        peutVoirRapports: true,
      },
    };
    await new Promise<void>(resolve => { setTimeout(resolve, 1000); });
    return nouveauProjet;
  }
);

export const rejoindreProjet = createAsyncThunk(
  'collaboration/rejoindreProjet',
  async (lienPartage: string) => {
    await new Promise<void>(resolve => { setTimeout(resolve, 1000); });
    const projet: Projet = {
      id: 'projet_exemple',
      nom: 'Ferme Exemple',
      description: 'Projet partagé',
      proprietaireId: 'proprietaire_123',
      proprietaireNom: 'Jean Dupont',
      dateCreation: new Date('2024-01-01').toISOString(),
      derniereModification: new Date().toISOString(),
      statut: 'actif',
      utilisateurs: [],
      lienPartage,
      permissions: {
        peutModifierPorcs: true,
        peutModifierGestations: true,
        peutModifierNutrition: true,
        peutModifierFinance: false,
        peutModifierPlanification: false,
        peutInviterUtilisateurs: false,
        peutVoirRapports: true,
      },
    };
    return projet;
  }
);

export const inviterUtilisateur = createAsyncThunk(
  'collaboration/inviterUtilisateur',
  async (donneesInvitation: { projetId: string; email: string; role: 'collaborateur' | 'lecteur' }) => {
    await new Promise<void>(resolve => { setTimeout(resolve, 1000); });
    const dateNow = Date.now();
    const invitation: InvitationProjet = {
      id: `invitation_${dateNow}`,
      projetId: donneesInvitation.projetId,
      projetNom: 'Ferme Exemple',
      emailInvite: donneesInvitation.email,
      rolePropose: donneesInvitation.role,
      statut: 'en_attente',
      dateEnvoi: new Date(dateNow).toISOString(),
      dateExpiration: new Date(dateNow + 7 * 24 * 60 * 60 * 1000).toISOString(),
      codeInvitation: Math.random().toString(36).substring(2, 8).toUpperCase(),
    };
    return invitation;
  }
);

export const enregistrerActivite = createAsyncThunk(
  'collaboration/enregistrerActivite',
  async (activite: Omit<ActiviteUtilisateur, 'id' | 'date'>) => {
    await new Promise<void>(resolve => { setTimeout(resolve, 500); });
    const nouvelleActivite: ActiviteUtilisateur = {
      ...activite,
      id: `activite_${Date.now()}`,
      date: new Date().toISOString(),
    };
    return nouvelleActivite;
  }
);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface CollaborationState {
  // Collaborateur-based (new)
  collaborateurs: Collaborateur[];
  invitationsEnAttente: Collaborateur[];
  collaborateurActuel: Collaborateur | null;
  collaborationsActives: Collaborateur[];
  projetCollaboratifActif: Projet | null;
  projetsAccessibles: Projet[];

  // Legacy project-based (old)
  projets: Projet[];
  projetActuel: Projet | null;
  utilisateurActuel: Utilisateur | null;
  activites: ActiviteUtilisateur[];
  invitations: InvitationProjet[];

  loading: boolean;
  error?: string;
}

const initialState: CollaborationState = {
  collaborateurs: [],
  invitationsEnAttente: [],
  collaborateurActuel: null,
  collaborationsActives: [],
  projetCollaboratifActif: null,
  projetsAccessibles: [],

  projets: [],
  projetActuel: null,
  utilisateurActuel: {
    id: 'utilisateur_123',
    nom: 'Utilisateur Local',
    email: 'utilisateur@example.com',
    role: 'proprietaire',
    dateAjout: new Date().toISOString(),
  },
  activites: [],
  invitations: [],

  loading: false,
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const collaborationSlice = createSlice({
  name: 'collaboration',
  initialState,
  reducers: {
    clearCollaborateurActuel: (state) => {
      state.collaborateurActuel = null;
      state.projetCollaboratifActif = null;
    },
    setProjetActuel: (state, action: PayloadAction<Projet>) => {
      state.projetActuel = action.payload;
    },
    setUtilisateurActuel: (state, action: PayloadAction<Utilisateur>) => {
      state.utilisateurActuel = action.payload;
    },
    ajouterActiviteLocale: (state, action: PayloadAction<ActiviteUtilisateur>) => {
      state.activites.unshift(action.payload);
      if (state.activites.length > 100) {
        state.activites = state.activites.slice(0, 100);
      }
    },
    mettreAJourPermissions: (
      state,
      action: PayloadAction<{ utilisateurId: string; permissions: Partial<PermissionsProjet> }>
    ) => {
      if (state.projetActuel) {
        state.projetActuel.permissions = {
          ...state.projetActuel.permissions,
          ...action.payload.permissions,
        };
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = undefined;
    },
  },
  extraReducers: (builder) => {
    builder
      // loadCollaborateursParProjet
      .addCase(loadCollaborateursParProjet.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(loadCollaborateursParProjet.fulfilled, (state, action) => {
        state.loading = false;
        state.collaborateurs = action.payload ?? [];
      })
      .addCase(loadCollaborateursParProjet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // loadInvitationsEnAttente
      .addCase(loadInvitationsEnAttente.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(loadInvitationsEnAttente.fulfilled, (state, action) => {
        state.loading = false;
        state.invitationsEnAttente = action.payload ?? [];
      })
      .addCase(loadInvitationsEnAttente.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // loadCollaborationsActives
      .addCase(loadCollaborationsActives.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(loadCollaborationsActives.fulfilled, (state, action) => {
        state.loading = false;
        state.collaborationsActives = action.payload ?? [];
        // projetsAccessibles is derived from collaborationsActives (unique projet_ids)
        // The actual Projet objects are fetched separately when needed
      })
      .addCase(loadCollaborationsActives.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // loadCollaborateurActuel
      .addCase(loadCollaborateurActuel.fulfilled, (state, action) => {
        state.collaborateurActuel = action.payload;
      })

      // selectProjetCollaboratif
      .addCase(selectProjetCollaboratif.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(selectProjetCollaboratif.fulfilled, (state, action) => {
        state.loading = false;
        state.projetCollaboratifActif = action.payload.projet;
        state.collaborateurActuel = action.payload.collaborateurActuel;
        // Keep projetsAccessibles in sync
        const exists = state.projetsAccessibles.some((p) => p.id === action.payload.projet.id);
        if (!exists) {
          state.projetsAccessibles.push(action.payload.projet);
        }
      })
      .addCase(selectProjetCollaboratif.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // createCollaborateur
      .addCase(createCollaborateur.fulfilled, (state, action) => {
        state.collaborateurs.push(action.payload);
      })

      // updateCollaborateur
      .addCase(updateCollaborateur.fulfilled, (state, action) => {
        const index = state.collaborateurs.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.collaborateurs[index] = action.payload;
        }
        if (state.collaborateurActuel?.id === action.payload.id) {
          state.collaborateurActuel = action.payload;
        }
      })

      // deleteCollaborateur
      .addCase(deleteCollaborateur.fulfilled, (state, action) => {
        state.collaborateurs = state.collaborateurs.filter((c) => c.id !== action.payload);
      })

      // accepterInvitation
      .addCase(accepterInvitation.fulfilled, (state, action) => {
        state.invitationsEnAttente = state.invitationsEnAttente.filter(
          (c) => c.id !== action.payload.id
        );
      })

      // rejeterInvitation
      .addCase(rejeterInvitation.fulfilled, (state, action) => {
        state.invitationsEnAttente = state.invitationsEnAttente.filter(
          (c) => c.id !== action.payload
        );
      })

      // creerProjet (legacy)
      .addCase(creerProjet.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(creerProjet.fulfilled, (state, action) => {
        state.loading = false;
        state.projets.push(action.payload);
        state.projetActuel = action.payload;
      })
      .addCase(creerProjet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors de la création du projet';
      })

      // rejoindreProjet (legacy)
      .addCase(rejoindreProjet.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(rejoindreProjet.fulfilled, (state, action) => {
        state.loading = false;
        state.projetActuel = action.payload;
        if (!state.projets.find((p) => p.id === action.payload.id)) {
          state.projets.push(action.payload);
        }
      })
      .addCase(rejoindreProjet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors de la connexion au projet';
      })

      // inviterUtilisateur (legacy)
      .addCase(inviterUtilisateur.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(inviterUtilisateur.fulfilled, (state, action) => {
        state.loading = false;
        state.invitations.push(action.payload);
      })
      .addCase(inviterUtilisateur.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Erreur lors de l'invitation";
      })

      // enregistrerActivite (legacy)
      .addCase(enregistrerActivite.fulfilled, (state, action) => {
        state.activites.unshift(action.payload);
        if (state.activites.length > 100) {
          state.activites = state.activites.slice(0, 100);
        }
      })
      .addCase(enregistrerActivite.rejected, (_state, action) => {
        console.error("Erreur lors de l'enregistrement de l'activité:", action.error);
      });
  },
});

export const {
  clearCollaborateurActuel,
  setProjetActuel,
  setUtilisateurActuel,
  ajouterActiviteLocale,
  mettreAJourPermissions,
  setLoading,
  setError,
  clearError,
} = collaborationSlice.actions;

export default collaborationSlice.reducer;
