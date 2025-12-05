# 🧹 Plan de Nettoyage de database.ts

## 📊 Situation Actuelle

**Fichier:** `src/services/database.ts`  
**Taille:** ~8267 lignes (très volumineux)  
**Problème:** Fichier monolithique avec du code dupliqué dans les repositories

---

## 🎯 Objectif

Réduire `database.ts` de **8267 lignes → ~500 lignes**

**Garder uniquement:**
- ✅ Initialisation de la base de données
- ✅ Migrations
- ✅ Helpers essentiels (transactions, cleanup)
- ✅ Configuration SQLite

**Supprimer:**
- ❌ Opérations CRUD (déjà dans repositories)
- ❌ Logique métier (déjà dans services)
- ❌ Code dupliqué

---

## 📋 Repositories Déjà Créés

### Production
- ✅ `AnimalRepository` - CRUD animaux
- ✅ `PeseeRepository` - Gestion pesées
- ✅ `SevrageRepository` - Gestion sevrages

### Finance
- ✅ `RevenuRepository` - CRUD revenus
- ✅ `DepensePonctuelleRepository` - CRUD dépenses
- ✅ `ChargeFixeRepository` - CRUD charges fixes

### Santé & Reproduction
- ✅ `MortaliteRepository` - CRUD mortalités
- ✅ `GestationRepository` - CRUD gestations
- ✅ `VaccinationRepository` - CRUD vaccinations

### Nutrition
- ✅ `StockRepository` - CRUD stocks

### Marketplace
- ✅ `MarketplaceListingRepository` - Annonces
- ✅ `MarketplaceOfferRepository` - Offres
- ✅ `MarketplaceTransactionRepository` - Transactions
- ✅ `MarketplaceChatRepository` - Chat
- ✅ `MarketplaceNotificationRepository` - Notifications
- ✅ `MarketplaceRatingRepository` - Notations

**Total: 17 repositories créés** 🎉

---

## 🗂️ Structure Cible de database.ts

```typescript
// src/services/database.ts (~500 lignes)

import * as SQLite from 'expo-sqlite';
import { createMarketplaceTables } from '../database/migrations';

class DatabaseService {
  private db: SQLiteDatabase | null = null;

  // ========================================
  // INITIALISATION (100 lignes)
  // ========================================
  async initialize(): Promise<void> {
    // Configuration SQLite
    // Gestion du verrou d'initialisation
    // Configuration WAL mode
  }

  // ========================================
  // MIGRATIONS (200 lignes)
  // ========================================
  private async createTables(): Promise<void> {
    // Tables production
    // Tables finance
    // Tables reproduction
    // Tables santé
    // Tables nutrition
  }

  private async migrateTables(): Promise<void> {
    // Migrations incrémentales
    // Gestion des versions
  }

  // ========================================
  // HELPERS ESSENTIELS (150 lignes)
  // ========================================
  async executeInTransaction<T>(
    operation: (db: SQLiteDatabase) => Promise<T>
  ): Promise<T> {
    // Wrapper transaction
  }

  async cleanup(): Promise<void> {
    // Nettoyage tables temporaires
  }

  private async createIndexes(): Promise<void> {
    // Création des indexes de performance
  }

  // ========================================
  // EXPORTS (50 lignes)
  // ========================================
  getDatabase(): SQLiteDatabase {
    if (!this.db) throw new Error('DB not initialized');
    return this.db;
  }
}

export const databaseService = new DatabaseService();
export const getDatabase = () => databaseService.getDatabase();
export const initializeDatabase = () => databaseService.initialize();
```

---

## 🔍 Fonctions à Supprimer (Exemples)

### CRUD Animaux (Déjà dans AnimalRepository)
```typescript
❌ async createAnimal(data: CreateProductionAnimalInput)
❌ async updateAnimal(id: string, data: UpdateProductionAnimalInput)
❌ async deleteAnimal(id: string)
❌ async getAnimalById(id: string)
❌ async getAnimauxByProjet(projetId: string)
❌ async getAnimauxActifs(projetId: string)
```

### CRUD Finance (Déjà dans Finance Repositories)
```typescript
❌ async createRevenu(data: Partial<Revenu>)
❌ async updateRevenu(id: string, data: UpdateRevenuInput)
❌ async deleteRevenu(id: string)
❌ async getRevenusByProjet(projetId: string)
❌ async createDepense(data: Partial<DepensePonctuelle>)
❌ async updateDepense(id: string, data: UpdateDepensePonctuelleInput)
```

### CRUD Mortalités (Déjà dans MortaliteRepository)
```typescript
❌ async createMortalite(data: Partial<Mortalite>)
❌ async getMortalitesByProjet(projetId: string)
❌ async getStatistiquesMortalite(projetId: string)
```

**Et ainsi de suite pour tous les modules...**

---

## ⚠️ Précautions Avant Suppression

### Étape 1: Audit Complet
```bash
# Rechercher toutes les utilisations de database.ts
grep -r "databaseService\." src/
grep -r "database.createAnimal" src/
grep -r "database.createRevenu" src/
```

### Étape 2: Migration des Appels
**Avant:**
```typescript
import { databaseService } from '../services/database';
const animal = await databaseService.createAnimal(data);
```

**Après:**
```typescript
import { AnimalRepository } from '../database/repositories';
const db = await getDatabase();
const animalRepo = new AnimalRepository(db);
const animal = await animalRepo.create(data);
```

### Étape 3: Tests de Régression
```bash
# Lancer tous les tests
npm test

# Tests d'intégration
npm run test:integration

# Vérifier que tout compile
npm run type-check
```

---

## 📝 Plan d'Exécution

### Phase 1: Audit (1 heure)
- [ ] Lister toutes les fonctions de database.ts
- [ ] Vérifier correspondance avec repositories
- [ ] Identifier les fonctions encore utilisées

### Phase 2: Migration des Appels (3 heures)
- [ ] Migrer les composants vers repositories
- [ ] Migrer les screens vers repositories
- [ ] Migrer les services vers repositories

### Phase 3: Suppression (1 heure)
- [ ] Supprimer fonctions CRUD dupliquées
- [ ] Garder uniquement init + migrations + helpers
- [ ] Vérifier compilation TypeScript

### Phase 4: Tests (2 heures)
- [ ] Tests unitaires
- [ ] Tests d'intégration
- [ ] Tests E2E critiques
- [ ] Test manuel de l'app

### Phase 5: Review & Documentation (1 heure)
- [ ] Code review
- [ ] Mettre à jour docs/CONTEXT.md
- [ ] Mettre à jour llms.txt
- [ ] Git commit

**Durée totale estimée: 8 heures**

---

## 🎯 Résultat Attendu

### Avant
```
src/services/database.ts (8267 lignes)
├── Initialisation (100 lignes)
├── Migrations (200 lignes)
├── Helpers (150 lignes)
├── CRUD Animaux (500 lignes) ❌
├── CRUD Finance (600 lignes) ❌
├── CRUD Mortalités (400 lignes) ❌
├── CRUD Gestations (500 lignes) ❌
├── CRUD Stocks (400 lignes) ❌
├── CRUD Vaccinations (300 lignes) ❌
├── CRUD Pesées (300 lignes) ❌
└── ... et beaucoup plus ❌
```

### Après
```
src/services/database.ts (500 lignes)
├── Initialisation (100 lignes) ✅
├── Migrations (200 lignes) ✅
├── Helpers (150 lignes) ✅
└── Exports (50 lignes) ✅

src/database/repositories/ (17 fichiers)
├── AnimalRepository.ts (319 lignes) ✅
├── RevenuRepository.ts (219 lignes) ✅
├── DepensePonctuelleRepository.ts (244 lignes) ✅
├── ... (14 autres repositories) ✅
└── Total: ~3500 lignes bien organisées ✅
```

---

## ✅ Avantages du Nettoyage

| Aspect | Avant | Après | Bénéfice |
|--------|-------|-------|----------|
| **Taille fichier** | 8267 lignes | 500 lignes | **94% réduit** |
| **Maintenabilité** | Faible | Élevée | **Modulaire** |
| **Testabilité** | Difficile | Facile | **Isolé** |
| **Réutilisabilité** | Faible | Élevée | **DRY** |
| **Onboarding** | Complexe | Simple | **Clair** |
| **Type Safety** | Moyen | Fort | **Strict** |

---

## 🚀 Prochaines Étapes

1. **Maintenant**: Continuer à utiliser les repositories existants
2. **Plus tard**: Exécuter le plan de nettoyage (8h de travail)
3. **Futur**: Ajouter plus de repositories si nécessaire

**Note**: Ce nettoyage n'est PAS bloquant. L'app fonctionne parfaitement avec les repositories actuels. C'est une optimisation de qualité de code.

---

**Prêt pour le nettoyage ? Le plan est clair ! 🧹**

