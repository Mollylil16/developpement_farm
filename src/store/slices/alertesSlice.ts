import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import type { Porc, Gestation, Transaction } from '../../types';
import { GestionAlertes, UtilitairesDate, CalculsAgricoles } from '../../utils/calculs';

export interface Alerte {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  date: string; // ✅ Changé de Date à string
  porcId?: string;
  gestationId?: string;
  actionRequired?: boolean;
  dismissed?: boolean;
}

interface AlertesState {
  alertes: Alerte[];
  loading: boolean;
  error?: string;
}

const initialState: AlertesState = {
  alertes: [],
  loading: false,
};

// Action asynchrone pour calculer les alertes automatiquement
export const calculateAlertes = createAsyncThunk(
  'alertes/calculateAlertes',
  async (data: { porcs: Porc[]; gestations: Gestation[]; transactions: Transaction[] }, { rejectWithValue }) => {
    try {
      const { porcs, gestations, transactions } = data;
      const alertes: Alerte[] = [];
      const dateNow = new Date().toISOString(); // ✅ Créé une fois pour tout

      // Alertes pour les gestations proches du terme
      gestations.forEach(gestation => {
        if (gestation.statut === 'en_cours') {
          const alerteMessage = GestionAlertes.alerteGestation(new Date(gestation.dateMiseBasPrevue));
          if (alerteMessage) {
            alertes.push({
              id: `gestation-${gestation.id}`,
              type: 'warning',
              title: 'Gestation',
              message: alerteMessage,
              date: dateNow,
              gestationId: gestation.id,
              actionRequired: true,
            });
          }
        }
      });

      // Alertes pour les porcs prêts à vendre
      porcs.forEach(porc => {
        if (porc.statut === 'croissance') {
          const alerteMessage = GestionAlertes.alerteVente(porc.poidsActuel, porc.poidsCible);
          if (alerteMessage) {
            alertes.push({
              id: `vente-${porc.id}`,
              type: 'info',
              title: 'Vente',
              message: `${alerteMessage} - ${porc.numeroIdentification}`,
              date: dateNow,
              porcId: porc.id,
              actionRequired: false,
            });
          }
        }
      });

      // Alertes pour les sevrages
      porcs.forEach(porc => {
        if (porc.statut === 'sevrage') {
          const alerteMessage = CalculsAgricoles.alerteSevrage(new Date(porc.dateNaissance));
          if (alerteMessage) {
            alertes.push({
              id: `sevrage-${porc.id}`,
              type: 'info',
              title: 'Sevrage',
              message: `${alerteMessage} - ${porc.numeroIdentification}`,
              date: dateNow,
              porcId: porc.id,
              actionRequired: false,
            });
          }
        }
      });

      // Alertes financières
      const transactionsMois = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        const currentDate = new Date();
        return transactionDate.getMonth() === currentDate.getMonth() && 
               transactionDate.getFullYear() === currentDate.getFullYear();
      });

      const recettesMois = transactionsMois
        .filter(t => t.type === 'vente')
        .reduce((sum, t) => sum + t.montant, 0);

      const depensesMois = transactionsMois
        .filter(t => t.type === 'achat' || t.type === 'depense')
        .reduce((sum, t) => sum + t.montant, 0);

      const beneficeMois = recettesMois - depensesMois;

      // Alerte si bénéfice négatif
      if (beneficeMois < 0) {
        alertes.push({
          id: 'finance-negative',
          type: 'error',
          title: 'Finance',
          message: `Bénéfice négatif ce mois : ${beneficeMois.toLocaleString()} €`,
          date: dateNow,
          actionRequired: true,
        });
      }

      // Alerte si pas de transactions ce mois
      if (transactionsMois.length === 0) {
        alertes.push({
          id: 'finance-no-transactions',
          type: 'warning',
          title: 'Finance',
          message: 'Aucune transaction enregistrée ce mois',
          date: dateNow,
          actionRequired: false,
        });
      }

      // Alertes pour les porcs en retard de croissance
      porcs.forEach(porc => {
        if (porc.statut === 'croissance') {
          const ageJours = UtilitairesDate.differenceEnJours(new Date(porc.dateNaissance), new Date());
          const poidsAttendu = ageJours * 0.8; // Croissance moyenne de 0.8kg/jour
          
          if (porc.poidsActuel < poidsAttendu * 0.8) { // 20% en dessous de la moyenne
            alertes.push({
              id: `croissance-${porc.id}`,
              type: 'warning',
              title: 'Croissance',
              message: `${porc.numeroIdentification} : Croissance lente (${porc.poidsActuel}kg vs ${poidsAttendu.toFixed(1)}kg attendus)`,
              date: dateNow,
              porcId: porc.id,
              actionRequired: true,
            });
          }
        }
      });

      // Alertes pour les gestations en retard
      gestations.forEach(gestation => {
        if (gestation.statut === 'en_cours') {
          const joursDepuisSautage = UtilitairesDate.differenceEnJours(new Date(gestation.dateSautage), new Date());
          if (joursDepuisSautage > 120) { // Plus de 120 jours
            alertes.push({
              id: `gestation-retard-${gestation.id}`,
              type: 'error',
              title: 'Gestation',
              message: `Gestation en retard : ${joursDepuisSautage} jours depuis le sautage`,
              date: dateNow,
              gestationId: gestation.id,
              actionRequired: true,
            });
          }
        }
      });

      // Trier les alertes par priorité et date
      return alertes.sort((a, b) => {
        const priorityOrder = { error: 0, warning: 1, info: 2, success: 3 };
        const aPriority = priorityOrder[a.type];
        const bPriority = priorityOrder[b.type];
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // ✅ Comparaison de strings ISO (fonctionne parfaitement)
        return b.date.localeCompare(a.date);
      });
    } catch (error) {
      return rejectWithValue('Erreur lors du calcul des alertes');
    }
  }
);

const alertesSlice = createSlice({
  name: 'alertes',
  initialState,
  reducers: {
    addAlerte: (state, action: PayloadAction<Omit<Alerte, 'id' | 'date'>>) => {
      const nouvelleAlerte: Alerte = {
        ...action.payload,
        id: Date.now().toString(),
        date: new Date().toISOString(), // ✅ Ajout de la date en ISO string
      };
      state.alertes.unshift(nouvelleAlerte);
    },
    dismissAlerte: (state, action: PayloadAction<string>) => {
      const alerte = state.alertes.find(a => a.id === action.payload);
      if (alerte) {
        alerte.dismissed = true;
      }
    },
    removeAlerte: (state, action: PayloadAction<string>) => {
      state.alertes = state.alertes.filter(a => a.id !== action.payload);
    },
    clearAllAlertes: (state) => {
      state.alertes = [];
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(calculateAlertes.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(calculateAlertes.fulfilled, (state, action) => {
        state.loading = false;
        state.alertes = action.payload;
      })
      .addCase(calculateAlertes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  addAlerte, 
  dismissAlerte, 
  removeAlerte, 
  clearAllAlertes, 
  setLoading, 
  setError 
} = alertesSlice.actions;

export default alertesSlice.reducer;