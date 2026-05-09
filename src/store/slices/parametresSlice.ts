import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Devise, DeviseConfig, ParametresApp } from '../../types';

// Configuration des devises disponibles
export const DEVISES_CONFIG: Record<Devise, DeviseConfig> = {
  USD: {
    code: 'USD',
    symbole: '$',
    nom: 'Dollar américain',
    tauxChange: 1.08, // 1 EUR = 1.08 USD (approximatif)
    positionSymbole: 'before',
  },
  EUR: {
    code: 'EUR',
    symbole: '€',
    nom: 'Euro',
    tauxChange: 1.0, // Devise de référence
    positionSymbole: 'after',
  },
  CFA: {
    code: 'CFA',
    symbole: 'FCFA',
    nom: 'Franc CFA',
    tauxChange: 655.96, // 1 EUR = 655.96 FCFA (fixe)
    positionSymbole: 'after',
  },
};

interface ParametresState {
  parametres: ParametresApp;
  deviseConfig: DeviseConfig;
  loading: boolean;
  error?: string;
}

const initialState: ParametresState = {
  parametres: {
    devise: 'EUR',
    langue: 'fr',
    notifications: true,
    theme: 'clair',
  },
  deviseConfig: DEVISES_CONFIG.EUR,
  loading: false,
};

const parametresSlice = createSlice({
  name: 'parametres',
  initialState,
  reducers: {
    setDevise: (state, action: PayloadAction<Devise>) => {
      state.parametres.devise = action.payload;
      state.deviseConfig = DEVISES_CONFIG[action.payload];
    },
    setLangue: (state, action: PayloadAction<'fr' | 'en'>) => {
      state.parametres.langue = action.payload;
    },
    setNotifications: (state, action: PayloadAction<boolean>) => {
      state.parametres.notifications = action.payload;
    },
    setTheme: (state, action: PayloadAction<'clair' | 'sombre'>) => {
      state.parametres.theme = action.payload;
    },
    updateParametres: (state, action: PayloadAction<Partial<ParametresApp>>) => {
      state.parametres = { ...state.parametres, ...action.payload };
      if (action.payload.devise) {
        state.deviseConfig = DEVISES_CONFIG[action.payload.devise];
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
});

export const {
  setDevise,
  setLangue,
  setNotifications,
  setTheme,
  updateParametres,
  setLoading,
  setError,
  clearError,
} = parametresSlice.actions;

export default parametresSlice.reducer;
