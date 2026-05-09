import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Projet, Utilisateur, ActiviteUtilisateur, InvitationProjet, PermissionsProjet } from '../../types';

// Actions asynchrones pour la gestion des projets
export const creerProjet = createAsyncThunk(
  'collaboration/creerProjet',
  async (donneesProjet: { nom: string; description?: string; proprietaireId: string; proprietaireNom: string }) => {
    // Simulation d'un appel API
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
    
    // Simuler un délai d'API
    await new Promise(resolve => setTimeout(resolve, 1000));
    return nouveauProjet;
  }
);

export const rejoindreProjet = createAsyncThunk(
  'collaboration/rejoindreProjet',
  async (lienPartage: string) => {
    // Simulation d'un appel API pour rejoindre un projet
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simuler la récupération du projet
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
    // Simulation d'un appel API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const dateNow = Date.now();
    const invitation: InvitationProjet = {
      id: `invitation_${dateNow}`,
      projetId: donneesInvitation.projetId,
      projetNom: 'Ferme Exemple',
      emailInvite: donneesInvitation.email,
      rolePropose: donneesInvitation.role,
      statut: 'en_attente',
      dateEnvoi: new Date(dateNow).toISOString(),
      dateExpiration: new Date(dateNow + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 jours
      codeInvitation: Math.random().toString(36).substring(2, 8).toUpperCase(),
    };
    
    return invitation;
  }
);

export const enregistrerActivite = createAsyncThunk(
  'collaboration/enregistrerActivite',
  async (activite: Omit<ActiviteUtilisateur, 'id' | 'date'>) => {
    // Simulation d'un appel API
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const nouvelleActivite: ActiviteUtilisateur = {
      ...activite,
      id: `activite_${Date.now()}`,
      date: new Date().toISOString(),
    };
    
    return nouvelleActivite;
  }
);

interface CollaborationState {
  projets: Projet[];
  projetActuel: Projet | null;
  utilisateurActuel: Utilisateur | null;
  activites: ActiviteUtilisateur[];
  invitations: InvitationProjet[];
  loading: boolean;
  error?: string;
  // Extended fields for compatibility
  collaborateurActuel?: any;
  invitationsEnAttente?: any[];
  projetCollaboratifActif?: any;
  collaborationsActives?: any[];
  projetsAccessibles?: any[];
  collaborateurs?: any[];
}

const initialState: CollaborationState = {
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

const collaborationSlice = createSlice({
  name: 'collaboration',
  initialState,
  reducers: {
    setProjetActuel: (state, action: PayloadAction<Projet>) => {
      state.projetActuel = action.payload;
    },
    setUtilisateurActuel: (state, action: PayloadAction<Utilisateur>) => {
      state.utilisateurActuel = action.payload;
    },
    ajouterActiviteLocale: (state, action: PayloadAction<ActiviteUtilisateur>) => {
      state.activites.unshift(action.payload);
      // Garder seulement les 100 dernières activités
      if (state.activites.length > 100) {
        state.activites = state.activites.slice(0, 100);
      }
    },
    mettreAJourPermissions: (state, action: PayloadAction<{ utilisateurId: string; permissions: Partial<PermissionsProjet> }>) => {
      if (state.projetActuel) {
        const utilisateur = state.projetActuel.utilisateurs.find(u => u.id === action.payload.utilisateurId);
        if (utilisateur) {
          // Mettre à jour les permissions dans le projet
          state.projetActuel.permissions = { ...state.projetActuel.permissions, ...action.payload.permissions };
        }
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
      // Créer un projet
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
      
      // Rejoindre un projet
      .addCase(rejoindreProjet.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(rejoindreProjet.fulfilled, (state, action) => {
        state.loading = false;
        state.projetActuel = action.payload;
        // Ajouter le projet à la liste s'il n'y est pas déjà
        if (!state.projets.find(p => p.id === action.payload.id)) {
          state.projets.push(action.payload);
        }
      })
      .addCase(rejoindreProjet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Erreur lors de la connexion au projet';
      })
      
      // Inviter un utilisateur
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
        state.error = action.error.message || 'Erreur lors de l\'invitation';
      })
      
      // Enregistrer une activité
      .addCase(enregistrerActivite.pending, (state) => {
        // Pas de loading pour les activités
      })
      .addCase(enregistrerActivite.fulfilled, (state, action) => {
        state.activites.unshift(action.payload);
        // Garder seulement les 100 dernières activités
        if (state.activites.length > 100) {
          state.activites = state.activites.slice(0, 100);
        }
      })
      .addCase(enregistrerActivite.rejected, (state, action) => {
        console.error('Erreur lors de l\'enregistrement de l\'activité:', action.error);
      });
  },
});

export const {
  setProjetActuel,
  setUtilisateurActuel,
  ajouterActiviteLocale,
  mettreAJourPermissions,
  setLoading,
  setError,
  clearError,
} = collaborationSlice.actions;

export default collaborationSlice.reducer;

// Compatibility exports for components expecting these named exports
export const loadCollaborateursParProjet: any = () => async () => {};
export const loadCollaborateurs: any = () => async () => {};
export const loadCollaborateurActuel: any = () => async () => {};
export const loadCollaborationsActives: any = () => async () => {};
export const loadInvitationsEnAttente: any = () => async () => {};
export const createCollaborateur: any = () => async () => {};
export const updateCollaborateur: any = () => async () => {};
export const deleteCollaborateur: any = () => async () => {};
export const accepterInvitation: any = () => async () => {};
export const rejeterInvitation: any = () => async () => {};
export const selectProjetCollaboratif: any = () => async () => {};
export const clearCollaborateurActuel: any = () => ({});