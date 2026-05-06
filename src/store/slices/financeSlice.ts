import { createSlice, PayloadAction, Draft, createAsyncThunk } from '@reduxjs/toolkit';
import type { Transaction, CashFlow, Porc } from '../../types';
import type { ChargeFixe, DepensePonctuelle, Revenu } from '../../types/finance';
import { DatabaseService } from '../../services/database';
import { CalculsAgricoles } from '../../utils/calculs';
import apiClient from '../../services/api/apiClient';

// Types pour les calculs de rentabilité
export interface RentabilitePorc {
  porcId: string;
  coutTotal: number;
  prixVente: number;
  benefice: number;
  margeBrute: number;
  coutParKg: number;
  rentabilite: number; // en pourcentage
}

export interface AnalyseFinanciere {
  chiffreAffairesTotal: number;
  coutsTotaux: number;
  beneficeNet: number;
  margeBrute: number;
  rentabiliteGenerale: number;
  coutParKgProduction: number;
  transactionsParCategorie: Record<string, number>;
  evolutionMensuelle: CashFlow[];
}

interface FinanceState {
  transactions: Transaction[];
  cashFlow: CashFlow[];
  rentabilitePorcs: RentabilitePorc[];
  analyseFinanciere: AnalyseFinanciere | null;
  chargesFixes: ChargeFixe[];
  depensesPonctuelles: DepensePonctuelle[];
  revenus: Revenu[];
  loading: boolean;
  error?: string;
}

const initialState: FinanceState = {
  transactions: [],
  cashFlow: [],
  rentabilitePorcs: [],
  analyseFinanciere: null,
  chargesFixes: [],
  depensesPonctuelles: [],
  revenus: [],
  loading: false,
};

// Actions asynchrones
export const loadTransactions = createAsyncThunk(
  'finance/loadTransactions',
  async (_, { rejectWithValue }) => {
    try {
      const db = DatabaseService.getInstance();
      const transactions = await db.getAllTransactions();
      return transactions;
    } catch (error) {
      return rejectWithValue('Erreur lors du chargement des transactions');
    }
  }
);

export const saveTransaction = createAsyncThunk(
  'finance/saveTransaction',
  async (transaction: Transaction, { rejectWithValue }) => {
    try {
      const db = DatabaseService.getInstance();
      await db.saveTransaction(transaction);
      return transaction;
    } catch (error) {
      return rejectWithValue('Erreur lors de la sauvegarde de la transaction');
    }
  }
);

export const calculateRentabilite = createAsyncThunk(
  'finance/calculateRentabilite',
  async (porcs: Porc[], { rejectWithValue }) => {
    try {
      const db = DatabaseService.getInstance();
      const transactions = await db.getAllTransactions();
      
      const rentabilitePorcs: RentabilitePorc[] = porcs.map(porc => {
        // Calculer les coûts pour ce porc
        const coutsPorc = transactions
          .filter(t => t.porcId === porc.id && (t.type === 'achat' || t.type === 'depense'))
          .reduce((sum, t) => sum + t.montant, 0);
        
        // Calculer les recettes pour ce porc
        const recettesPorc = transactions
          .filter(t => t.porcId === porc.id && t.type === 'vente')
          .reduce((sum, t) => sum + t.montant, 0);
        
        const benefice = recettesPorc - coutsPorc;
        const coutParKg = porc.poidsActuel > 0 ? coutsPorc / porc.poidsActuel : 0;
        const rentabilite = coutsPorc > 0 ? (benefice / coutsPorc) * 100 : 0;
        
        return {
          porcId: porc.id,
          coutTotal: coutsPorc,
          prixVente: recettesPorc,
          benefice,
          margeBrute: CalculsAgricoles.calculerMargeBrute(recettesPorc, coutsPorc),
          coutParKg,
          rentabilite,
        };
      });
      
      return rentabilitePorcs;
    } catch (error) {
      return rejectWithValue('Erreur lors du calcul de rentabilité');
    }
  }
);

export const generateAnalyseFinanciere = createAsyncThunk(
  'finance/generateAnalyseFinanciere',
  async (_, { rejectWithValue }) => {
    try {
      const db = DatabaseService.getInstance();
      const transactions = await db.getAllTransactions();
      
      // Calculs généraux
      const chiffreAffairesTotal = transactions
        .filter(t => t.type === 'vente' || t.type === 'recette')
        .reduce((sum, t) => sum + t.montant, 0);
      
      const coutsTotaux = transactions
        .filter(t => t.type === 'achat' || t.type === 'depense')
        .reduce((sum, t) => sum + t.montant, 0);
      
      const beneficeNet = chiffreAffairesTotal - coutsTotaux;
      const margeBrute = CalculsAgricoles.calculerMargeBrute(chiffreAffairesTotal, coutsTotaux);
      const rentabiliteGenerale = coutsTotaux > 0 ? (beneficeNet / coutsTotaux) * 100 : 0;
      
      // Transactions par catégorie
      const transactionsParCategorie: Record<string, number> = {};
      transactions.forEach(t => {
        transactionsParCategorie[t.categorie] = (transactionsParCategorie[t.categorie] || 0) + t.montant;
      });
      
      // Évolution mensuelle (simplifiée)
      const evolutionMensuelle: CashFlow[] = [];
      const currentDate = new Date();
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthTransactions = transactions.filter(t => {
          const tDate = new Date(t.date);
          return tDate.getMonth() === monthDate.getMonth() && 
                 tDate.getFullYear() === monthDate.getFullYear();
        });
        
        const recettes = monthTransactions
          .filter(t => t.type === 'vente' || t.type === 'recette')
          .reduce((sum, t) => sum + t.montant, 0);
        
        const depenses = monthTransactions
          .filter(t => t.type === 'achat' || t.type === 'depense')
          .reduce((sum, t) => sum + t.montant, 0);
        
        evolutionMensuelle.push({
          date: monthDate.toISOString(),
          recettes,
          depenses,
          solde: recettes - depenses,
        });
      }
      
      // Calcul du coût par kg de production (estimation)
      const poidsTotalProduction = 1000; // À remplacer par le poids réel des porcs vendus
      const coutParKgProduction = CalculsAgricoles.calculerCoutParKg(coutsTotaux, poidsTotalProduction);
      
      return {
        chiffreAffairesTotal,
        coutsTotaux,
        beneficeNet,
        margeBrute,
        rentabiliteGenerale,
        coutParKgProduction,
        transactionsParCategorie,
        evolutionMensuelle,
      };
    } catch (error) {
      return rejectWithValue('Erreur lors de la génération de l\'analyse financière');
    }
  }
);

// ---------------------------------------------------------------------------
// Async thunks — ChargeFixe
// ---------------------------------------------------------------------------

export const loadChargesFixes = createAsyncThunk(
  'finance/loadChargesFixes',
  async (projetId: string, { rejectWithValue }) => {
    try {
      return await apiClient.get<ChargeFixe[]>(`/finance/charges-fixes?projet_id=${projetId}`);
    } catch (error) {
      return rejectWithValue('Erreur lors du chargement des charges fixes');
    }
  }
);

export const createChargeFixe = createAsyncThunk(
  'finance/createChargeFixe',
  async (data: Omit<ChargeFixe, 'id'>, { rejectWithValue }) => {
    try {
      return await apiClient.post<ChargeFixe>('/finance/charges-fixes', data);
    } catch (error) {
      return rejectWithValue('Erreur lors de la création de la charge fixe');
    }
  }
);

export const updateChargeFixe = createAsyncThunk(
  'finance/updateChargeFixe',
  async (params: { id: string; data: Partial<ChargeFixe> }, { rejectWithValue }) => {
    try {
      return await apiClient.patch<ChargeFixe>(`/finance/charges-fixes/${params.id}`, params.data);
    } catch (error) {
      return rejectWithValue('Erreur lors de la mise à jour de la charge fixe');
    }
  }
);

export const deleteChargeFixe = createAsyncThunk(
  'finance/deleteChargeFixe',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/finance/charges-fixes/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue('Erreur lors de la suppression de la charge fixe');
    }
  }
);

// ---------------------------------------------------------------------------
// Async thunks — DepensePonctuelle
// ---------------------------------------------------------------------------

export const loadDepensesPonctuelles = createAsyncThunk(
  'finance/loadDepensesPonctuelles',
  async (projetId: string, { rejectWithValue }) => {
    try {
      return await apiClient.get<DepensePonctuelle[]>(`/finance/depenses?projet_id=${projetId}`);
    } catch (error) {
      return rejectWithValue('Erreur lors du chargement des dépenses ponctuelles');
    }
  }
);

export const createDepensePonctuelle = createAsyncThunk(
  'finance/createDepensePonctuelle',
  async (data: Omit<DepensePonctuelle, 'id'>, { rejectWithValue }) => {
    try {
      return await apiClient.post<DepensePonctuelle>('/finance/depenses', data);
    } catch (error) {
      return rejectWithValue('Erreur lors de la création de la dépense');
    }
  }
);

export const updateDepensePonctuelle = createAsyncThunk(
  'finance/updateDepensePonctuelle',
  async (params: { id: string; data: Partial<DepensePonctuelle> }, { rejectWithValue }) => {
    try {
      return await apiClient.patch<DepensePonctuelle>(`/finance/depenses/${params.id}`, params.data);
    } catch (error) {
      return rejectWithValue('Erreur lors de la mise à jour de la dépense');
    }
  }
);

export const deleteDepensePonctuelle = createAsyncThunk(
  'finance/deleteDepensePonctuelle',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/finance/depenses/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue('Erreur lors de la suppression de la dépense');
    }
  }
);

// ---------------------------------------------------------------------------
// Async thunks — Revenu
// ---------------------------------------------------------------------------

export const loadRevenus = createAsyncThunk(
  'finance/loadRevenus',
  async (projetId: string, { rejectWithValue }) => {
    try {
      return await apiClient.get<Revenu[]>(`/finance/revenus?projet_id=${projetId}`);
    } catch (error) {
      return rejectWithValue('Erreur lors du chargement des revenus');
    }
  }
);

export const createRevenu = createAsyncThunk(
  'finance/createRevenu',
  async (data: Omit<Revenu, 'id'>, { rejectWithValue }) => {
    try {
      return await apiClient.post<Revenu>('/finance/revenus', data);
    } catch (error) {
      return rejectWithValue('Erreur lors de la création du revenu');
    }
  }
);

export const updateRevenu = createAsyncThunk(
  'finance/updateRevenu',
  async (params: { id: string; data: Partial<Revenu> }, { rejectWithValue }) => {
    try {
      return await apiClient.patch<Revenu>(`/finance/revenus/${params.id}`, params.data);
    } catch (error) {
      return rejectWithValue('Erreur lors de la mise à jour du revenu');
    }
  }
);

export const deleteRevenu = createAsyncThunk(
  'finance/deleteRevenu',
  async (id: string, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/finance/revenus/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue('Erreur lors de la suppression du revenu');
    }
  }
);

export const calculateAndSaveMargesVente = createAsyncThunk(
  'finance/calculateAndSaveMargesVente',
  async (projetId: string, { rejectWithValue }) => {
    try {
      return await apiClient.post<Revenu[]>(`/finance/marges-vente/calculate`, { projetId });
    } catch (error) {
      return rejectWithValue('Erreur lors du calcul des marges de vente');
    }
  }
);

export const loadStatistiquesMoisActuel = createAsyncThunk(
  'finance/loadStatistiquesMoisActuel',
  async (projetId: string, { rejectWithValue }) => {
    try {
      return await apiClient.get<Record<string, unknown>>(`/finance/statistiques/mois-actuel?projet_id=${projetId}`);
    } catch (error) {
      return rejectWithValue('Erreur lors du chargement des statistiques du mois actuel');
    }
  }
);

const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {
    addTransaction: (state: Draft<FinanceState>, action: PayloadAction<Transaction>) => {
      state.transactions.push(action.payload);
    },
    updateTransaction: (state: Draft<FinanceState>, action: PayloadAction<Transaction>) => {
      const index = state.transactions.findIndex((t: Transaction) => t.id === action.payload.id);
      if (index !== -1) {
        state.transactions[index] = action.payload;
      }
    },
    deleteTransaction: (state: Draft<FinanceState>, action: PayloadAction<string>) => {
      state.transactions = state.transactions.filter((t: Transaction) => t.id !== action.payload);
    },
    updateCashFlow: (state: Draft<FinanceState>, action: PayloadAction<CashFlow[]>) => {
      state.cashFlow = action.payload;
    },
    setLoading: (state: Draft<FinanceState>, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state: Draft<FinanceState>, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    clearError: (state: Draft<FinanceState>) => {
      state.error = undefined;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load Transactions
      .addCase(loadTransactions.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(loadTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload;
      })
      .addCase(loadTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Save Transaction
      .addCase(saveTransaction.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(saveTransaction.fulfilled, (state, action) => {
        state.loading = false;
        const existingIndex = state.transactions.findIndex(t => t.id === action.payload.id);
        if (existingIndex !== -1) {
          state.transactions[existingIndex] = action.payload;
        } else {
          state.transactions.push(action.payload);
        }
      })
      .addCase(saveTransaction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Calculate Rentabilite
      .addCase(calculateRentabilite.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(calculateRentabilite.fulfilled, (state, action) => {
        state.loading = false;
        state.rentabilitePorcs = action.payload;
      })
      .addCase(calculateRentabilite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Generate Analyse Financiere
      .addCase(generateAnalyseFinanciere.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(generateAnalyseFinanciere.fulfilled, (state, action) => {
        state.loading = false;
        state.analyseFinanciere = action.payload;
      })
      .addCase(generateAnalyseFinanciere.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // ChargesFixes
      .addCase(loadChargesFixes.fulfilled, (state, action) => {
        state.chargesFixes = action.payload ?? [];
      })
      .addCase(createChargeFixe.fulfilled, (state, action) => {
        state.chargesFixes.push(action.payload);
      })
      .addCase(updateChargeFixe.fulfilled, (state, action) => {
        const idx = state.chargesFixes.findIndex((c) => c.id === action.payload.id);
        if (idx !== -1) state.chargesFixes[idx] = action.payload;
      })
      .addCase(deleteChargeFixe.fulfilled, (state, action) => {
        state.chargesFixes = state.chargesFixes.filter((c) => c.id !== action.payload);
      })
      // DepensesPonctuelles
      .addCase(loadDepensesPonctuelles.fulfilled, (state, action) => {
        state.depensesPonctuelles = action.payload ?? [];
      })
      .addCase(createDepensePonctuelle.fulfilled, (state, action) => {
        state.depensesPonctuelles.push(action.payload);
      })
      .addCase(updateDepensePonctuelle.fulfilled, (state, action) => {
        const idx = state.depensesPonctuelles.findIndex((d) => d.id === action.payload.id);
        if (idx !== -1) state.depensesPonctuelles[idx] = action.payload;
      })
      .addCase(deleteDepensePonctuelle.fulfilled, (state, action) => {
        state.depensesPonctuelles = state.depensesPonctuelles.filter((d) => d.id !== action.payload);
      })
      // Revenus
      .addCase(loadRevenus.fulfilled, (state, action) => {
        state.revenus = action.payload ?? [];
      })
      .addCase(createRevenu.fulfilled, (state, action) => {
        state.revenus.push(action.payload);
      })
      .addCase(updateRevenu.fulfilled, (state, action) => {
        const idx = state.revenus.findIndex((r) => r.id === action.payload.id);
        if (idx !== -1) state.revenus[idx] = action.payload;
      })
      .addCase(deleteRevenu.fulfilled, (state, action) => {
        state.revenus = state.revenus.filter((r) => r.id !== action.payload);
      });
  },
});

export const {
  addTransaction,
  updateTransaction,
  deleteTransaction,
  updateCashFlow,
  setLoading,
  setError,
  clearError
} = financeSlice.actions;
export default financeSlice.reducer;

// Re-export types for convenience
export type { ChargeFixe, DepensePonctuelle, Revenu };
