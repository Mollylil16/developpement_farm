# 🔄 Guide de Migration vers les Repositories

## Objectif

Remplacer progressivement les appels directs à `database.ts` (7500 lignes) par les Repositories modulaires.

---

## Architecture des Repositories

### Structure
```
src/database/
├── repositories/
│   ├── BaseRepository.ts          # Classe abstraite de base
│   ├── AnimalRepository.ts        # ✅ Créé
│   ├── FinanceRepository.ts       # ✅ Créé
│   ├── GestationRepository.ts     # ⏳ À créer
│   ├── PeseeRepository.ts         # ⏳ À créer
│   └── index.ts                   # Exports centralisés
└── migrations/
    └── *.ts                        # Migrations futures
```

### Principe

Chaque Repository hérite de `BaseRepository` et fournit:
- **Méthodes CRUD de base**: `create()`, `update()`, `findById()`, `findAll()`, `deleteById()`
- **Méthodes métier spécifiques**: Ex: `findActiveByProjet()`, `getStats()`
- **Gestion automatique** des erreurs et logging

---

## Exemple d'Utilisation

### Avant (Ancien système)
```typescript
// Dans un slice Redux
import { getDatabase } from '../services/database';

export const loadAnimaux = createAsyncThunk(
  'production/loadAnimaux',
  async (projetId: string) => {
    const db = await getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM production_animaux WHERE projet_id = ?',
      [projetId]
    );
    return result;
  }
);
```

### Après (Avec Repository)
```typescript
// Dans un slice Redux
import { getDatabase } from '../services/database';
import { AnimalRepository } from '../database/repositories';

export const loadAnimaux = createAsyncThunk(
  'production/loadAnimaux',
  async (projetId: string) => {
    const db = await getDatabase();
    const animalRepo = new AnimalRepository(db);
    return await animalRepo.findActiveByProjet(projetId);
  }
);
```

**Avantages:**
- ✅ Code plus lisible et maintenable
- ✅ Logique SQL encapsulée
- ✅ Typage TypeScript complet
- ✅ Logging centralisé
- ✅ Plus facile à tester

---

## Plan de Migration

### Phase 1: ✅ Créer les Repositories de Base
- [x] BaseRepository
- [x] AnimalRepository
- [x] FinanceRepository (Revenus, Dépenses, Charges)

### Phase 2: Migrer les Slices Redux (Priorité)
1. **productionSlice.ts** → Utiliser `AnimalRepository`
2. **financeSlice.ts** → Utiliser `FinanceService`
3. **reproductionSlice.ts** → Créer `GestationRepository` + `SevrageRepository`
4. **veterinairesSlice.ts** → Créer `VaccinationRepository` + `TraitementRepository`
5. **mortalitesSlice.ts** → Créer `MortaliteRepository`
6. **stocksSlice.ts** → Créer `StockRepository`

### Phase 3: Créer les Repositories Manquants
- [ ] GestationRepository
- [ ] SevrageRepository
- [ ] PeseeRepository
- [ ] VaccinationRepository
- [ ] TraitementRepository
- [ ] MortaliteRepository
- [ ] StockRepository
- [ ] CollaborateurRepository

### Phase 4: Nettoyer database.ts
Une fois tous les repositories créés et utilisés:
- Supprimer les fonctions SQL devenues inutiles
- Garder uniquement la logique d'initialisation et migrations
- Idéalement: `database.ts` devrait faire < 500 lignes

---

## Template pour Créer un Repository

```typescript
/**
 * MonRepository - Description
 */

import * as SQLite from 'expo-sqlite';
import { BaseRepository } from './BaseRepository';
import { MonType } from '../../types/monModule';
import { v4 as uuidv4 } from 'react-native-uuid';

export class MonRepository extends BaseRepository<MonType> {
  constructor(db: SQLite.SQLiteDatabase) {
    super(db, 'ma_table');
  }

  /**
   * Créer un nouvel enregistrement
   */
  async create(data: Partial<MonType>): Promise<MonType> {
    const id = uuidv4().toString();
    const now = new Date().toISOString();

    await this.execute(
      `INSERT INTO ma_table (id, projet_id, champ1, champ2, date_creation, derniere_modification)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.projet_id, data.champ1, data.champ2, now, now]
    );

    const created = await this.findById(id);
    if (!created) {
      throw new Error('Impossible de créer l\'enregistrement');
    }
    return created;
  }

  /**
   * Mettre à jour un enregistrement
   */
  async update(id: string, data: Partial<MonType>): Promise<MonType> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    // Construction dynamique de la requête
    if (data.champ1 !== undefined) {
      fields.push('champ1 = ?');
      values.push(data.champ1);
    }
    // ... autres champs

    fields.push('derniere_modification = ?');
    values.push(now);
    values.push(id);

    await this.execute(`UPDATE ma_table SET ${fields.join(', ')} WHERE id = ?`, values);

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Enregistrement introuvable');
    }
    return updated;
  }

  /**
   * Méthodes métier spécifiques...
   */
  async maMethodeMetier(param: string): Promise<MonType[]> {
    return this.query<MonType>(
      `SELECT * FROM ma_table WHERE condition = ?`,
      [param]
    );
  }
}
```

---

## Tests pour les Repositories

Chaque Repository DOIT avoir des tests:

```typescript
// src/database/repositories/__tests__/AnimalRepository.test.ts
import { AnimalRepository } from '../AnimalRepository';
import * as SQLite from 'expo-sqlite';

describe('AnimalRepository', () => {
  let db: SQLite.SQLiteDatabase;
  let repo: AnimalRepository;

  beforeAll(async () => {
    db = await SQLite.openDatabaseAsync(':memory:');
    // Créer les tables de test
    repo = new AnimalRepository(db);
  });

  it('devrait créer un animal', async () => {
    const animal = await repo.create({
      projet_id: 'test',
      code: 'A001',
      sexe: 'femelle',
    });

    expect(animal.id).toBeDefined();
    expect(animal.code).toBe('A001');
  });

  // ... autres tests
});
```

---

## Checklist de Migration

Pour chaque module:

### 1. Créer le Repository
- [ ] Créer le fichier `src/database/repositories/MonRepository.ts`
- [ ] Hériter de `BaseRepository<MonType>`
- [ ] Implémenter `create()` et `update()`
- [ ] Ajouter les méthodes métier spécifiques
- [ ] Ajouter au fichier `index.ts`

### 2. Écrire les Tests
- [ ] Créer `__tests__/MonRepository.test.ts`
- [ ] Tester CRUD de base
- [ ] Tester les méthodes métier
- [ ] Viser 80%+ coverage

### 3. Migrer le Slice Redux
- [ ] Identifier toutes les fonctions SQL dans le slice
- [ ] Remplacer par des appels au Repository
- [ ] Vérifier que les tests du slice passent toujours
- [ ] Tester manuellement les fonctionnalités

### 4. Documenter
- [ ] Ajouter des commentaires JSDoc
- [ ] Mettre à jour docs/CONTEXT.md si nécessaire
- [ ] Ajouter des exemples d'utilisation

---

## Bonnes Pratiques

### ✅ À FAIRE
1. **Un Repository par table principale**
2. **Méthodes explicites et bien nommées** (`findActiveByProjet` plutôt que `find`)
3. **Toujours typer les retours** avec TypeScript
4. **Utiliser les transactions** pour les opérations multiples
5. **Logger les erreurs** (déjà fait dans BaseRepository)
6. **Écrire des tests** pour chaque Repository

### ❌ À ÉVITER
1. **Repositories trop gros** (max 300 lignes)
2. **Logique métier complexe** dans les Repositories (garder ça dans les slices/utils)
3. **Accès direct** à `db` depuis les slices (toujours passer par un Repository)
4. **Requêtes SQL** ailleurs que dans les Repositories

---

## Exemples Complets

### Exemple 1: Créer un Animal
```typescript
const db = await getDatabase();
const animalRepo = new AnimalRepository(db);

const nouvelAnimal = await animalRepo.create({
  projet_id: 'proj-123',
  code: 'T001',
  nom: 'Joséphine',
  sexe: 'femelle',
  race: 'Large White',
  reproducteur: true,
});

console.log('Animal créé:', nouvelAnimal.id);
```

### Exemple 2: Statistiques Financières
```typescript
const db = await getDatabase();
const financeService = new FinanceService(db);

const solde = await financeService.getSoldeByPeriod(
  'proj-123',
  '2025-01-01',
  '2025-12-31'
);

console.log('Solde:', solde.solde, 'CFA');
console.log('Revenus:', solde.revenus, 'CFA');
console.log('Dépenses:', solde.depenses + solde.charges, 'CFA');
```

### Exemple 3: Recherche et Filtrage
```typescript
const db = await getDatabase();
const animalRepo = new AnimalRepository(db);

// Toutes les truies reproductrices
const truies = await animalRepo.findReproducteursByProjet('proj-123', 'femelle');

// Statistiques du cheptel
const stats = await animalRepo.getStats('proj-123');
console.log(`${stats.truies} truies, ${stats.verrats} verrats`);
```

---

## Support

**Questions?** Consultez:
- `src/database/repositories/BaseRepository.ts` - Méthodes disponibles
- `src/database/repositories/AnimalRepository.ts` - Exemple complet
- `docs/CONTEXT.md` - Architecture globale

---

**Version:** 1.0.0  
**Date:** 21 Novembre 2025  
**Status:** En cours de migration

