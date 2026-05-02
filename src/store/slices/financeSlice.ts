import { createSlice, PayloadAction, Draft, createAsyncThunk } from '@reduxjs/toolkit';
import type { Transaction, CashFlow, Porc } from '../../types';
import { DatabaseService } from '../../services/database';
import { CalculsAgricoles } from '../../utils/calculs';

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
  loading: boolean;
  error?: string;
}

const initialState: FinanceState = {
  transactions: [],
  cashFlow: [],
  rentabilitePorcs: [],
  analyseFinanciere: null,
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
          date: monthDate,
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
