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
import stocksReducer from './slices/stocksSlice';
import planningProductionReducer from './slices/planningProductionSlice';
import authReducer from './slices/authSlice';
import projetReducer from './slices/projetSlice';
import santeReducer from './slices/santeSlice';
import reportsReducer from './slices/reportsSlice';
import marketplaceReducer from './slices/marketplaceSlice';
import productionReducer from './slices/productionSlice';

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
    stocks: stocksReducer,
    planningProduction: planningProductionReducer,
    auth: authReducer,
    projet: projetReducer,
    sante: santeReducer,
    reports: reportsReducer,
    marketplace: marketplaceReducer,
    production: productionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
