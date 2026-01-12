/**
 * Configuration du store Redux
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, createTransform } from 'redux-persist';
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
import { authMiddleware } from './middleware/authMiddleware';

// Transform pour auth: exclure isLoading et error (données temporaires) - Phase 3
const authTransform = createTransform(
  // Transform à l'entrée (avant stockage)
  (inboundState: any) => {
    if (!inboundState) return inboundState;
    return {
      user: inboundState.user,
      isAuthenticated: inboundState.isAuthenticated,
      // Exclure isLoading et error (données temporaires)
    };
  },
  // Transform à la sortie (après récupération)
  (outboundState: any) => {
    if (!outboundState) return outboundState;
    return {
      ...outboundState,
      isLoading: false, // Réinitialiser à false au démarrage
      error: null, // Réinitialiser l'erreur
    };
  },
  { whitelist: ['auth'] }
);

// Transform pour projet: exclure loading, error, et projets (seulement projetActif) - Phase 3
const projetTransform = createTransform(
  // Transform à l'entrée (avant stockage)
  (inboundState: any) => {
    if (!inboundState) return inboundState;
    return {
      projetActif: inboundState.projetActif,
      // Exclure projets (liste complète), loading, error (données temporaires ou volumineuses)
    };
  },
  // Transform à la sortie (après récupération)
  (outboundState: any) => {
    if (!outboundState) return outboundState;
    return {
      ...outboundState,
      projets: [], // Réinitialiser la liste (sera rechargée depuis l'API)
      loading: false, // Réinitialiser à false au démarrage
      error: null, // Réinitialiser l'erreur
    };
  },
  { whitelist: ['projet'] }
);

// Configuration de la persistance (Phase 3 - Optimisée)
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['projet', 'auth'], // Projet actif et authentification sont persistés
  transforms: [authTransform, projetTransform], // Transforms sélectifs pour réduire la taille
  throttle: 1000, // Throttle les écritures pour éviter les performances lentes
  // timeout: Le timeout par défaut de redux-persist est de 5s. 
  // Le message "rehydrate called after timeout" n'est PAS une erreur critique.
  // L'app continue de fonctionner normalement, les données sont chargées même après le timeout.
  // Pour les appareils lents, ce message peut apparaître mais n'affecte pas le fonctionnement.
  timeout: 15000, // Augmenter le timeout à 15 secondes pour les appareils plus lents
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
    }).concat(authMiddleware),
});

// Créer le persistor avec un timeout étendu
// Le timeout par défaut (5s) peut être insuffisant sur les appareils lents
export const persistor = persistStore(store, null, () => {
  // Callback appelé une fois la réhydratation terminée (succès ou timeout)
  // Aucune action spéciale nécessaire - l'app continue de fonctionner
  if (__DEV__) {
    console.log('[Redux Persist] Réhydratation terminée');
  }
});

// Types pour TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
