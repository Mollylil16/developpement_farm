import { configureStore } from '@reduxjs/toolkit';
import porcsReducer from './slices/porcsSlice';
import reproductionReducer from './slices/reproductionSlice';
import nutritionReducer from './slices/nutritionSlice';
import financeReducer from './slices/financeSlice';
import alertesReducer from './slices/alertesSlice';
import planificationReducer from './slices/planificationSlice';
import parametresReducer from './slices/parametresSlice';
import collaborationReducer from './slices/collaborationSlice';
import mortalitesReducer from './slices/mortalitesSlice';

export const store = configureStore({
  reducer: {
    porcs: porcsReducer,
    reproduction: reproductionReducer,
    nutrition: nutritionReducer,
    finance: financeReducer,
    alertes: alertesReducer,
    planification: planificationReducer,
    parametres: parametresReducer,
    collaboration: collaborationReducer,
    mortalites: mortalitesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
