import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Ration, IngredientRation } from '../../types';

interface NutritionState {
  rations: Ration[];
  loading: boolean;
  error?: string;
  ingredients: any[];
  rationsBudget: any[];
  stocksAliments: any[];
}

const initialState: NutritionState = {
  rations: [
    {
      id: '1',
      nom: 'Ration Porcelet Sevré',
      typePorc: 'porcelet',
      poidsMin: 6,
      poidsMax: 25,
      ingredients: [
        { nom: 'Maïs', pourcentage: 45, coutParKg: 0.25 },
        { nom: 'Tourteau de soja', pourcentage: 20, coutParKg: 0.45 },
        { nom: 'Son de blé', pourcentage: 15, coutParKg: 0.20 },
        { nom: 'Minéraux', pourcentage: 5, coutParKg: 2.00 },
        { nom: 'Vitamines', pourcentage: 2, coutParKg: 5.00 },
        { nom: 'Autres', pourcentage: 13, coutParKg: 0.30 },
      ],
      coutParKg: 0.35,
      notes: 'Ration équilibrée pour porcelets sevrés',
    },
    {
      id: '2',
      nom: 'Ration Truie Gestante',
      typePorc: 'truie_gestante',
      poidsMin: 150,
      poidsMax: 300,
      ingredients: [
        { nom: 'Maïs', pourcentage: 50, coutParKg: 0.25 },
        { nom: 'Tourteau de soja', pourcentage: 15, coutParKg: 0.45 },
        { nom: 'Son de blé', pourcentage: 20, coutParKg: 0.20 },
        { nom: 'Minéraux', pourcentage: 3, coutParKg: 2.00 },
        { nom: 'Vitamines', pourcentage: 1, coutParKg: 5.00 },
        { nom: 'Autres', pourcentage: 11, coutParKg: 0.30 },
      ],
      coutParKg: 0.28,
      notes: 'Ration pour truies en gestation',
    },
  ],
  loading: false,
  ingredients: [],
  rationsBudget: [],
  stocksAliments: [],
};

const nutritionSlice = createSlice({
  name: 'nutrition',
  initialState,
  reducers: {
    addRation: (state, action: PayloadAction<Ration>) => {
      state.rations.push(action.payload);
    },
    updateRation: (state, action: PayloadAction<Ration>) => {
      const index = state.rations.findIndex(r => r.id === action.payload.id);
      if (index !== -1) {
        state.rations[index] = action.payload;
      }
    },
    deleteRation: (state, action: PayloadAction<string>) => {
      state.rations = state.rations.filter(r => r.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
  },
});

export const { addRation, updateRation, deleteRation, setLoading, setError } = nutritionSlice.actions;
export default nutritionSlice.reducer;

// Compatibility exports for components expecting these named exports
export const loadIngredients: any = () => async () => {};
export const loadRations: any = () => async () => {};
export const loadRationsBudget: any = () => async () => {};
export const createIngredient: any = () => async () => {};
export const updateIngredient: any = () => async () => {};
export const deleteIngredient: any = () => async () => {};
export const createRation: any = () => async () => {};
export const createRationBudget: any = () => async () => {};
export const updateRationBudget: any = () => async () => {};
export const deleteRationBudget: any = () => async () => {};
