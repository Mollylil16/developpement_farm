# 🚀 Phase 4 - Guide de Migration des Slices Redux

**Objectif:** Remplacer les appels SQL directs dans les slices Redux par les Repositories créés.

**Durée estimée:** 6-8 heures  
**Priorité:** Haute  
**Difficulté:** Moyenne

---

## 📋 Plan de Migration

### Ordre Recommandé

1. **financeSlice.ts** (Facile) - 1h
2. **mortalitesSlice.ts** (Facile) - 30min
3. **stocksSlice.ts** (Facile) - 1h
4. **reproductionSlice.ts** (Moyen) - 2h
5. **veterinairesSlice.ts** (Moyen) - 1.5h
6. **productionSlice.ts** (Complexe) - 2h

---

## 🎯 Exemple Complet: mortalitesSlice.ts

### AVANT (Appels SQL directs)

```typescript
// src/store/slices/mortalitesSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getDatabase } from '../../services/database';

export const fetchMortalites = createAsyncThunk(
  'mortalites/fetch',
  async (projetId: string) => {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM mortalites WHERE projet_id = ? ORDER BY date_deces DESC',
      [projetId]
    );
    return result;
  }
);

export const createMortalite = createAsyncThunk(
  'mortalites/create',
  async (data: MortaliteData) => {
    const db = await getDatabase();
    const id = uuidv4();
    await db.runAsync(
      'INSERT INTO mortalites (id, projet_id, animal_id, date_deces, cause) VALUES (?, ?, ?, ?, ?)',
      [id, data.projet_id, data.animal_id, data.date_deces, data.cause]
    );
    // ...
  }
);
```

### APRÈS (Utilisation Repositories)

```typescript
// src/store/slices/mortalitesSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getDatabase } from '../../services/database';
import { MortaliteRepository } from '../../database/repositories';

export const fetchMortalites = createAsyncThunk(
  'mortalites/fetch',
  async (projetId: string) => {
    const db = await getDatabase();
    const mortaliteRepo = new MortaliteRepository(db);
    return await mortaliteRepo.findByProjet(projetId);
  }
);

export const createMortalite = createAsyncThunk(
  'mortalites/create',
  async (data: Partial<Mortalite>) => {
    const db = await getDatabase();
    const mortaliteRepo = new MortaliteRepository(db);
    return await mortaliteRepo.create(data);
  }
);

export const updateMortalite = createAsyncThunk(
  'mortalites/update',
  async ({ id, data }: { id: string; data: Partial<Mortalite> }) => {
    const db = await getDatabase();
    const mortaliteRepo = new MortaliteRepository(db);
    return await mortaliteRepo.update(id, data);
  }
);

export const deleteMortalite = createAsyncThunk(
  'mortalites/delete',
  async (id: string) => {
    const db = await getDatabase();
    const mortaliteRepo = new MortaliteRepository(db);
    await mortaliteRepo.delete(id);
    return id;
  }
);

export const fetchMortaliteStats = createAsyncThunk(
  'mortalites/stats',
  async (projetId: string) => {
    const db = await getDatabase();
    const mortaliteRepo = new MortaliteRepository(db);
    return await mortaliteRepo.getStats(projetId);
  }
);
```

---

## 📝 Checklist par Slice

### 1. financeSlice.ts

**Repository:** `FinanceService` (RevenuRepository, DepensePonctuelleRepository, ChargeFixeRepository)

**Actions à migrer:**
- [ ] `fetchRevenus` → `revenuRepo.findByProjet()`
- [ ] `createRevenu` → `revenuRepo.create()`
- [ ] `updateRevenu` → `revenuRepo.update()`
- [ ] `deleteRevenu` → `revenuRepo.delete()`
- [ ] `fetchDepenses` → `depenseRepo.findByProjet()`
- [ ] `createDepense` → `depenseRepo.create()`
- [ ] `fetchChargesFixes` → `chargeRepo.findByProjet()`
- [ ] `createChargeFixe` → `chargeRepo.create()`
- [ ] `fetchBilan` → `financeService.getBilan()`
- [ ] `fetchFluxTresorerie` → `financeService.getFluxTresorerie()`

**Avantages:**
- ✅ Logique métier encapsulée (calculs de bilan)
- ✅ Méthodes spécialisées (findByPeriod, getStats)
- ✅ Gestion d'erreurs améliorée

---

### 2. mortalitesSlice.ts

**Repository:** `MortaliteRepository`

**Actions à migrer:**
- [ ] `fetchMortalites` → `mortaliteRepo.findByProjet()`
- [ ] `createMortalite` → `mortaliteRepo.create()`
- [ ] `updateMortalite` → `mortaliteRepo.update()`
- [ ] `deleteMortalite` → `mortaliteRepo.delete()`
- [ ] `fetchMortaliteStats` → `mortaliteRepo.getStats()`
- [ ] `fetchMortalitesByPeriod` → `mortaliteRepo.findByPeriod()`

**Nouvelles fonctionnalités possibles:**
- Stats par cause
- Taux de mortalité calculé automatiquement
- Âge moyen au décès

---

### 3. stocksSlice.ts

**Repository:** `StockRepository`

**Actions à migrer:**
- [ ] `fetchStocks` → `stockRepo.findByProjet()`
- [ ] `createStock` → `stockRepo.create()`
- [ ] `updateStock` → `stockRepo.update()`
- [ ] `deleteStock` → `stockRepo.delete()`
- [ ] `fetchStocksEnAlerte` → `stockRepo.findEnAlerte()`
- [ ] `ajouterStock` → `stockRepo.ajouterStock()`
- [ ] `retirerStock` → `stockRepo.retirerStock()`
- [ ] `getValeurStock` → `stockRepo.getValeurTotaleStock()`

**Nouvelles fonctionnalités:**
- ✅ Gestion automatique des alertes
- ✅ Historique des mouvements
- ✅ Valorisation des stocks

---

### 4. reproductionSlice.ts

**Repositories:** `GestationRepository`, `SevrageRepository`

**Actions à migrer:**
- [ ] `fetchGestations` → `gestationRepo.findByProjet()`
- [ ] `createGestation` → `gestationRepo.create()`
- [ ] `updateGestation` → `gestationRepo.update()`
- [ ] `deleteGestation` → `gestationRepo.delete()`
- [ ] `fetchGestationsEnCours` → `gestationRepo.findEnCoursByProjet()`
- [ ] `terminerGestation` → `gestationRepo.terminerGestation()`
- [ ] `fetchSevrages` → `sevrageRepo.findByProjet()`
- [ ] `createSevrage` → `sevrageRepo.create()`
- [ ] `getStatsReproduction` → `gestationRepo.getStats()` + `sevrageRepo.getStats()`
- [ ] `getTauxSurvie` → `sevrageRepo.getTauxSurvie()`

**Nouvelles fonctionnalités:**
- ✅ Calcul auto date mise bas (saillie + 114j)
- ✅ Alertes mise bas imminente
- ✅ Historique par truie
- ✅ Taux de survie porcelets

---

### 5. veterinairesSlice.ts

**Repository:** `VaccinationRepository`

**Actions à migrer:**
- [ ] `fetchVaccinations` → `vaccinationRepo.findByProjet()`
- [ ] `createVaccination` → `vaccinationRepo.create()`
- [ ] `updateVaccination` → `vaccinationRepo.update()`
- [ ] `deleteVaccination` → `vaccinationRepo.delete()`
- [ ] `fetchRappelsDus` → `vaccinationRepo.findRappelsDus()`
- [ ] `effectuerRappel` → `vaccinationRepo.effectuerRappel()`
- [ ] `getCouvertureVaccinale` → `vaccinationRepo.getCouvertureVaccinale()`

**Nouvelles fonctionnalités:**
- ✅ Calcul auto date rappel
- ✅ Gestion multi-animaux (animal_ids JSON)
- ✅ Stats de couverture vaccinale
- ✅ Filtrage par type de vaccin

---

### 6. productionSlice.ts

**Repositories:** `AnimalRepository`, `PeseeRepository`

**Actions à migrer:**
- [ ] `fetchAnimaux` → `animalRepo.findByProjet()`
- [ ] `createAnimal` → `animalRepo.create()`
- [ ] `updateAnimal` → `animalRepo.update()`
- [ ] `deleteAnimal` → `animalRepo.delete()`
- [ ] `fetchAnimauxActifs` → `animalRepo.findActifs()`
- [ ] `fetchPesees` → `peseeRepo.findByAnimal()`
- [ ] `createPesee` → `peseeRepo.create()`
- [ ] `updatePesee` → `peseeRepo.update()`
- [ ] `deletePesee` → `peseeRepo.delete()`
- [ ] `calculateGMQ` → `peseeRepo.calculateGMQ()`
- [ ] `getEvolutionPoids` → `peseeRepo.getEvolutionPoids()`
- [ ] `getPoidsActuel` → `peseeRepo.getPoidsActuelEstime()`

**Nouvelles fonctionnalités:**
- ✅ Calcul GMQ précis
- ✅ Courbes de croissance
- ✅ Estimation poids actuel (GMQ-based)
- ✅ Stats globales projet

---

## 🔄 Pattern de Migration Standard

### 1. Importer le Repository

```typescript
import { NomRepository } from '../../database/repositories';
```

### 2. Remplacer les Thunks

```typescript
// AVANT
export const fetchItems = createAsyncThunk(
  'items/fetch',
  async (projetId: string) => {
    const db = await getDatabase();
    const result = await db.getAllAsync('SELECT * FROM items WHERE projet_id = ?', [projetId]);
    return result;
  }
);

// APRÈS
export const fetchItems = createAsyncThunk(
  'items/fetch',
  async (projetId: string) => {
    const db = await getDatabase();
    const itemRepo = new NomRepository(db);
    return await itemRepo.findByProjet(projetId);
  }
);
```

### 3. Ajouter de Nouvelles Actions (si pertinent)

```typescript
export const fetchItemStats = createAsyncThunk(
  'items/stats',
  async (projetId: string) => {
    const db = await getDatabase();
    const itemRepo = new NomRepository(db);
    return await itemRepo.getStats(projetId);
  }
);
```

### 4. Mettre à Jour le State (si besoin)

```typescript
const itemsSlice = createSlice({
  name: 'items',
  initialState: {
    items: [],
    stats: null, // NOUVEAU
    loading: false,
    error: null,
  },
  // ...
});
```

---

## 🧪 Tests Après Migration

### Test de Base

```typescript
// src/store/slices/__tests__/mortalitesSlice.test.ts
import { configureStore } from '@reduxjs/toolkit';
import mortalitesReducer, { fetchMortalites } from '../mortalitesSlice';
import { getDatabase } from '../../../services/database';

jest.mock('../../../services/database');

describe('mortalitesSlice', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        mortalites: mortalitesReducer,
      },
    });
  });

  it('devrait charger les mortalités', async () => {
    const mockDb = {
      getAllAsync: jest.fn().mockResolvedValue([
        { id: '1', projet_id: 'proj-1', cause: 'maladie' },
      ]),
    };
    (getDatabase as jest.Mock).mockResolvedValue(mockDb);

    await store.dispatch(fetchMortalites('proj-1'));

    const state = store.getState().mortalites;
    expect(state.mortalites).toHaveLength(1);
    expect(state.loading).toBe(false);
  });
});
```

---

## ⚠️ Points d'Attention

### 1. Types TypeScript

Les Repositories retournent des types typés. Assurez-vous que les types dans les slices correspondent.

```typescript
// Vérifier que le type correspond
const gestations: Gestation[] = await gestationRepo.findByProjet(projetId);
```

### 2. Gestion d'Erreurs

Les Repositories lancent des erreurs avec `throw new Error()`. Gérer dans les thunks:

```typescript
export const createItem = createAsyncThunk(
  'items/create',
  async (data: Partial<Item>, { rejectWithValue }) => {
    try {
      const db = await getDatabase();
      const itemRepo = new ItemRepository(db);
      return await itemRepo.create(data);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);
```

### 3. Transactions

Si plusieurs opérations liées, utiliser des transactions:

```typescript
export const terminerGestationAvecSevrage = createAsyncThunk(
  'reproduction/terminerAvecSevrage',
  async ({ gestationId, sevrageData }: any) => {
    const db = await getDatabase();
    
    await db.execAsync('BEGIN TRANSACTION');
    
    try {
      const gestationRepo = new GestationRepository(db);
      const sevrageRepo = new SevrageRepository(db);
      
      const gestation = await gestationRepo.terminerGestation(
        gestationId,
        sevrageData.date_sevrage,
        sevrageData.nombre_porcelets
      );
      
      const sevrage = await sevrageRepo.create(sevrageData);
      
      await db.execAsync('COMMIT');
      
      return { gestation, sevrage };
    } catch (error) {
      await db.execAsync('ROLLBACK');
      throw error;
    }
  }
);
```

---

## 📊 Suivi de Migration

### Template de Suivi

Copier ce tableau dans un fichier `MIGRATION_PROGRESS.md`:

```markdown
# Suivi Migration Slices Redux → Repositories

## financeSlice.ts
- [ ] fetchRevenus
- [ ] createRevenu
- [ ] updateRevenu
- [ ] deleteRevenu
- [ ] fetchDepenses
- [ ] createDepense
- [ ] fetchChargesFixes
- [ ] createChargeFixe
- [ ] fetchBilan
- [ ] fetchFluxTresorerie

## mortalitesSlice.ts
- [ ] fetchMortalites
- [ ] createMortalite
- [ ] updateMortalite
- [ ] deleteMortalite
- [ ] fetchMortaliteStats

## stocksSlice.ts
- [ ] fetchStocks
- [ ] createStock
- [ ] updateStock
- [ ] deleteStock
- [ ] fetchStocksEnAlerte
- [ ] ajouterStock
- [ ] retirerStock
- [ ] getValeurStock

## reproductionSlice.ts
- [ ] fetchGestations
- [ ] createGestation
- [ ] updateGestation
- [ ] deleteGestation
- [ ] fetchGestationsEnCours
- [ ] terminerGestation
- [ ] fetchSevrages
- [ ] createSevrage
- [ ] getStatsReproduction

## veterinairesSlice.ts
- [ ] fetchVaccinations
- [ ] createVaccination
- [ ] updateVaccination
- [ ] deleteVaccination
- [ ] fetchRappelsDus
- [ ] effectuerRappel
- [ ] getCouvertureVaccinale

## productionSlice.ts
- [ ] fetchAnimaux
- [ ] createAnimal
- [ ] updateAnimal
- [ ] deleteAnimal
- [ ] fetchAnimauxActifs
- [ ] fetchPesees
- [ ] createPesee
- [ ] updatePesee
- [ ] deletePesee
- [ ] calculateGMQ
- [ ] getEvolutionPoids
```

---

## ✅ Validation Finale

Après chaque migration de slice:

1. **Compiler TypeScript** - `npm run type-check`
2. **Vérifier linting** - `npm run lint`
3. **Lancer tests** - `npm test -- nomSlice.test.ts`
4. **Tester manuellement** l'app
5. **Commit** - `git commit -m "feat: migrate nomSlice to repositories"`

---

## 🎯 Objectif Final

**Slices Redux minimalistes:**
- Uniquement orchestration (thunks)
- Pas de SQL direct
- Pas de logique métier complexe
- Juste appels aux Repositories

**Avantages:**
- ✅ Code plus propre
- ✅ Meilleure séparation des responsabilités
- ✅ Tests plus faciles
- ✅ Réutilisabilité des Repositories (hors Redux)

---

## 📚 Ressources

- [Pattern Repository](./MIGRATION_REPOSITORIES.md)
- [docs/CONTEXT.md](../CONTEXT.md)
- [Exemples Phase 3](../../PHASE3_REPOSITORIES_SUMMARY.md)

---

**Temps estimé total:** 6-8 heures  
**Difficulté:** Moyenne  
**Impact:** Élevé ⭐⭐⭐⭐⭐

**Bon courage ! 🚀**

