# Migration Frontend vers PostgreSQL via API REST

## ✅ Fait

1. **BaseRepository** : Adapté pour utiliser `apiClient` au lieu de SQLite
2. **UserRepository** : Migré vers l'API REST (`/users`)
3. **ProjetRepository** : Migré vers l'API REST (`/projets`)
4. **database.ts** : Simplifié, ne retourne plus de connexion SQLite
5. **OnboardingService** : Supprimé les dépendances à `getDatabase()`

## 🔄 Pattern de Migration

### Avant (SQLite)
```typescript
import { getDatabase } from './database';
import { UserRepository } from '../database/repositories';

const db = await getDatabase();
const userRepo = new UserRepository(db);
```

### Après (PostgreSQL via API)
```typescript
import { UserRepository } from '../database/repositories';

const userRepo = new UserRepository(); // Plus besoin de db
```

## 📋 À Faire

### 1. Adapter les autres repositories
- [ ] AnimalRepository → `/production/animaux`
- [ ] PeseeRepository → `/production/pesees`
- [ ] GestationRepository → `/reproduction/gestations`
- [ ] SevrageRepository → `/reproduction/sevrages`
- [ ] DepensePonctuelleRepository → `/finance/depenses-ponctuelles`
- [ ] RevenuRepository → `/finance/revenus`
- [ ] ChargeFixeRepository → `/finance/charges-fixes`
- [ ] StockRepository → `/nutrition/stocks-aliments`
- [ ] IngredientRepository → `/nutrition/ingredients`
- [ ] RationRepository → `/nutrition/rations`
- [ ] PlanificationRepository → `/planifications`
- [ ] CollaborateurRepository → `/collaborations`
- [ ] MortaliteRepository → `/mortalites`
- [ ] VaccinationRepository → `/sante/vaccinations`
- [ ] RappelVaccinationRepository → `/sante/rappels-vaccination`
- [ ] MaladieRepository → `/sante/maladies`
- [ ] TraitementRepository → `/sante/traitements`
- [ ] VisiteVeterinaireRepository → `/sante/visites-veterinaires`
- [ ] MarketplaceListingRepository → `/marketplace/listings`
- [ ] MarketplaceOfferRepository → `/marketplace/offers`
- [ ] MarketplaceTransactionRepository → `/marketplace/transactions`
- [ ] Etc.

### 2. Mettre à jour tous les fichiers utilisant `getDatabase()`

Fichiers à mettre à jour :
- `src/services/sante/SanteAlertesService.ts`
- `src/services/MarketplaceService.ts`
- `src/services/exportService.ts`
- `src/services/chatAgent/core/DataValidator.ts`
- `src/services/chatAgent/AgentActionExecutor.ts`
- `src/services/PurchaseRequestService.ts`
- `src/services/ServiceProposalNotificationService.ts`
- `src/services/PorkPriceTrendService.ts`
- `src/services/FarmService.ts`
- `src/scripts/migrateUsersToMultiRole.ts`
- Et tous les fichiers dans `src/screens/` et `src/components/` qui utilisent des repositories

### 3. Supprimer les imports SQLite

Remplacer :
```typescript
import * as SQLite from 'expo-sqlite';
```

Par :
```typescript
// Plus besoin d'importer SQLite
```

### 4. Mettre à jour les constructeurs de repositories

Tous les repositories doivent maintenant être instanciés sans paramètre :
```typescript
// ❌ Avant
const repo = new UserRepository(db);

// ✅ Après
const repo = new UserRepository();
```

## 🔍 Commandes pour trouver les fichiers à mettre à jour

```bash
# Trouver tous les fichiers utilisant getDatabase
grep -r "getDatabase" src/

# Trouver tous les fichiers instanciant des repositories avec db
grep -r "new.*Repository(db)" src/

# Trouver tous les imports SQLite
grep -r "expo-sqlite" src/
```

## 📝 Notes

- Tous les repositories utilisent maintenant `apiClient` via `BaseRepository`
- Les endpoints du backend sont déjà disponibles (voir `backend/src/*/controllers`)
- L'authentification est gérée automatiquement par `apiClient` (tokens JWT)
- Les erreurs réseau sont gérées par `apiClient` avec retry et fallback

