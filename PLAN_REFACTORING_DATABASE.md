# 🏗️ Plan de Refactoring - database.ts (3607 lignes → ~500 lignes)

## 📊 Analyse Actuelle

**Fichier:** `src/services/database.ts`  
**Taille:** 3607 lignes  
**Objectif:** Réduire à ~500 lignes (initialisation + configuration uniquement)

---

## 🎯 Structure Cible

```
database.ts (~500 lignes)
├── Initialisation SQLite
├── Configuration (PRAGMA)
├── Orchestration migrations
└── getDatabase() helper

database/
├── migrations/
│   ├── MigrationRunner.ts (système versionné)
│   ├── 001_initial_schema.ts
│   ├── 002_add_users_telephone.ts
│   └── ...
├── schemas/
│   ├── users.schema.ts
│   ├── projets.schema.ts
│   ├── production.schema.ts
│   ├── finance.schema.ts
│   └── ...
└── indexes/
    └── createIndexes.ts
```

---

## 📋 Plan d'Action

### Phase 1: Extraire Logique Métier → Services (P0)

#### 1.1 SanteCoutsService
**Méthodes à extraire:**
- `getCoutsVeterinaires(projetId)` → `SanteCoutsService.getCouts(projetId)`
- `getCoutsVeterinairesPeriode(projetId, dateDebut, dateFin)` → `SanteCoutsService.getCoutsPeriode(...)`

**Fichier:** `src/services/sante/SanteCoutsService.ts`

#### 1.2 SanteRecommandationsService
**Méthodes à extraire:**
- `getRecommandationsSanitaires(projetId)` → `SanteRecommandationsService.getRecommandations(projetId)`
- `getTauxMortaliteParCause(projetId)` → `SanteRecommandationsService.getTauxMortaliteParCause(projetId)`

**Fichier:** `src/services/sante/SanteRecommandationsService.ts`

#### 1.3 SanteHistoriqueService
**Méthodes à extraire:**
- `getHistoriqueMedicalAnimal(animalId)` → `SanteHistoriqueService.getHistorique(animalId)`

**Fichier:** `src/services/sante/SanteHistoriqueService.ts`

#### 1.4 SanteTempsAttenteService
**Méthodes à extraire:**
- `getAnimauxTempsAttente(projetId)` → `SanteTempsAttenteService.getAnimauxEnAttente(projetId)`

**Fichier:** `src/services/sante/SanteTempsAttenteService.ts`

#### 1.5 ProductionGMQService
**Méthodes à extraire:**
- `recalculerGMQSuivants(animalId, dateModifiee)` → `ProductionGMQService.recalculerGMQ(animalId, dateModifiee)`
- `calculateDayDifference(start, end)` → `utils/dateUtils.ts`

**Fichier:** `src/services/production/ProductionGMQService.ts`

#### 1.6 UserDataService
**Méthodes à extraire:**
- `clearUserData(userId)` → `UserDataService.clearUserData(userId)`

**Fichier:** `src/services/UserDataService.ts`

### Phase 2: Extraire Création Tables → Schemas (P0)

#### 2.1 Créer fichiers schema par domaine
- `database/schemas/users.schema.ts`
- `database/schemas/projets.schema.ts`
- `database/schemas/production.schema.ts`
- `database/schemas/finance.schema.ts`
- `database/schemas/sante.schema.ts`
- `database/schemas/nutrition.schema.ts`
- `database/schemas/marketplace.schema.ts`

**Fonction:** Chaque fichier exporte une fonction `createTables(db: SQLiteDatabase)`

### Phase 3: Système de Migrations Versionné (P0)

#### 3.1 MigrationRunner
**Fichier:** `database/migrations/MigrationRunner.ts`

**Fonctionnalités:**
- Table `schema_migrations` pour tracker les migrations appliquées
- Exécution séquentielle des migrations
- Rollback support (optionnel)
- Validation des migrations

#### 3.2 Migrations existantes
Extraire de `migrateTables()` vers fichiers séparés:
- `001_add_users_telephone.ts`
- `002_add_marketplace_tables.ts`
- `003_add_opex_capex_fields.ts`

### Phase 4: Extraire Création Index (P1)

#### 4.1 Fichier indexes
**Fichier:** `database/indexes/createIndexes.ts`

**Fonction:** `createIndexes(db: SQLiteDatabase)`

### Phase 5: Nettoyer database.ts (P0)

**Garder uniquement:**
- `initialize()` - Initialisation SQLite
- `getDatabase()` - Helper pour obtenir la DB
- Appels aux migrations/schemas/indexes

**Supprimer:**
- Toutes les méthodes de logique métier
- `createTables()` (remplacé par schemas)
- `migrateTables()` (remplacé par MigrationRunner)
- `createIndexesWithProjetId()` (remplacé par createIndexes.ts)

---

## ⏱️ Estimation

- **Phase 1 (Services):** 8 jours/homme
- **Phase 2 (Schemas):** 5 jours/homme
- **Phase 3 (Migrations):** 5 jours/homme
- **Phase 4 (Indexes):** 2 jours/homme
- **Phase 5 (Nettoyage):** 3 jours/homme
- **Tests & Validation:** 5 jours/homme

**Total: 28 jours/homme**

---

## ✅ Critères de Succès

1. ✅ `database.ts` < 500 lignes
2. ✅ Toutes les méthodes métier dans services dédiés
3. ✅ Migrations versionnées et tracées
4. ✅ Tests unitaires pour chaque service
5. ✅ Aucune régression fonctionnelle
6. ✅ Temps de compilation réduit de 50%


