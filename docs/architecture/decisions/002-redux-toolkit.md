# ADR-002: Redux Toolkit

## Status
Accepted

## Date
21 Novembre 2025

## Context

L'application nécessite une gestion d'état complexe avec :
- État partagé entre plusieurs écrans
- Synchronisation avec la base de données locale
- Persistance de l'état
- Actions asynchrones (thunks)

Redux classique était trop verbeux et nécessitait beaucoup de boilerplate.

## Decision

Utiliser **Redux Toolkit** comme solution de gestion d'état.

Redux Toolkit fournit :
- `createSlice` : Réduction du boilerplate
- `createAsyncThunk` : Gestion des actions asynchrones
- `configureStore` : Configuration optimisée
- Intégration avec `redux-persist` pour la persistance

## Consequences

### Avantages

- ✅ Moins de code boilerplate
- ✅ Meilleure DX (Developer Experience)
- ✅ Immer intégré (immutabilité simplifiée)
- ✅ DevTools intégrés
- ✅ Performance optimisée

### Inconvénients

- ⚠️ Courbe d'apprentissage pour les nouveaux développeurs
- ⚠️ Bundle size légèrement plus important

### Structure

```typescript
// Slice exemple
const productionSlice = createSlice({
  name: 'production',
  initialState,
  reducers: {
    addAnimal: (state, action) => {
      state.animaux.push(action.payload);
    }
  }
});

// Thunk asynchrone
export const loadAnimaux = createAsyncThunk(
  'production/loadAnimaux',
  async (projetId: string) => {
    const repo = new AnimalRepository(db);
    return await repo.findByProjet(projetId);
  }
);
```

## Références

- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [Store Configuration](../../../src/store/store.ts)

