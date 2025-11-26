/**
 * Configuration du store Redux
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authReducer from './slices/authSlice';
import projetReducer from './slices/projetSlice';
import financeReducer from './slices/financeSlice';
import reproductionReducer from './slices/reproductionSlice';
import nutritionReducer from './slices/nutritionSlice';
import reportsReducer from './slices/reportsSlice';
import mortalitesReducer from './slices/mortalitesSlice';
import planificationReducer from './slices/planificationSlice';
import planningProductionReducer from './slices/planningProductionSlice';
import collaborationReducer from './slices/collaborationSlice';
import stocksReducer from './slices/stocksSlice';
import productionReducer from './slices/productionSlice';
import santeReducer from './slices/santeSlice';
import marketplaceReducer from './slices/marketplaceSlice';

// Configuration de la persistance
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['projet', 'auth'], // Projet actif et authentification sont persistés
};

// Combiner les reducers
const rootReducer = combineReducers({
  auth: authReducer,
  projet: projetReducer,
  finance: financeReducer,
  reproduction: reproductionReducer,
  nutrition: nutritionReducer,
  stocks: stocksReducer,
  production: productionReducer,
  sante: santeReducer,
  reports: reportsReducer,
  mortalites: mortalitesReducer,
  planification: planificationReducer,
  planningProduction: planningProductionReducer,
  collaboration: collaborationReducer,
  marketplace: marketplaceReducer,
});

// Reducer persisté
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Store principal
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

// Types pour TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
