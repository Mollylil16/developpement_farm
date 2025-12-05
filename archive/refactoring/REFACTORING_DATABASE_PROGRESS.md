# 🏗️ Progression du Refactoring database.ts

## ✅ Ce qui a été fait

### 1. Structure créée
- ✅ `src/database/schemas/` - Dossier pour les schémas
- ✅ `src/database/schemas/core/` - Schémas core (users, projets)
- ✅ `src/database/schemas/finance/` - Schémas finance (charges_fixes, depenses_ponctuelles, revenus)
- ✅ `src/database/schemas/production/` - Schémas production (animaux, pesees, gestations, sevrages, mortalites, planifications)

### 2. Schémas créés (25/25 tables principales) ✅ COMPLET
- ✅ Core: `users.schema.ts`, `projets.schema.ts`
- ✅ Finance: `charges_fixes.schema.ts`, `depenses_ponctuelles.schema.ts`, `revenus.schema.ts`
- ✅ Production: `animaux.schema.ts`, `pesees.schema.ts`, `gestations.schema.ts`, `sevrages.schema.ts`, `mortalites.schema.ts`, `planifications.schema.ts`
- ✅ Nutrition: `ingredients.schema.ts`, `rations.schema.ts`, `ingredients_ration.schema.ts`, `rations_budget.schema.ts`, `stocks_aliments.schema.ts`, `stocks_mouvements.schema.ts`, `rapports_croissance.schema.ts`
- ✅ Santé: `calendrier_vaccinations.schema.ts`, `vaccinations.schema.ts`, `maladies.schema.ts`, `traitements.schema.ts`, `visites_veterinaires.schema.ts`, `rappels_vaccinations.schema.ts`
- ✅ Collaboration: `collaborations.schema.ts`

## 🚧 À faire

### Phase 1: Compléter les schémas manquants ✅ TERMINÉ
- ✅ Tous les schémas principaux ont été créés (25 tables)
- ℹ️ Les tables Marketplace sont gérées dans `src/database/migrations/create_marketplace_tables.ts`

### Phase 2: Refactorer database.ts

#### Étape 1: Créer createTablesFromSchemas()
```typescript
// Dans database.ts
import * as schemas from '../database/schemas';

private async createTablesFromSchemas(): Promise<void> {
  if (!this.db) {
    throw new Error('Base de données non initialisée');
  }

  // Core
  await schemas.createUsersTable(this.db);
  await schemas.createProjetsTable(this.db);

  // Finance
  await schemas.createChargesFixesTable(this.db);
  await schemas.createDepensesPonctuellesTable(this.db);
  await schemas.createRevenusTable(this.db);

  // Production
  await schemas.createProductionAnimauxTable(this.db);
  await schemas.createProductionPeseesTable(this.db);
  await schemas.createGestationsTable(this.db);
  await schemas.createSevragesTable(this.db);
  await schemas.createMortalitesTable(this.db);
  await schemas.createPlanificationsTable(this.db);

  // TODO: Ajouter les autres domaines
}
```

#### Étape 2: Remplacer createTables()
```typescript
// Remplacer l'appel dans initialize()
await this.createTablesFromSchemas(); // Au lieu de createTables()
```

#### Étape 3: Supprimer l'ancienne méthode createTables()
- [ ] Supprimer la méthode `createTables()` (~600 lignes)
- [ ] Vérifier que tout fonctionne

### Phase 3: Extraire les migrations
- [ ] Créer `database/migrations/MigrationRunner.ts`
- [ ] Extraire `migrateTables()` vers des migrations versionnées
- [ ] Système de versioning des migrations

### Phase 4: Extraire les index
- [ ] Créer `database/indexes/createIndexes.ts`
- [ ] Extraire `createIndexesWithProjetId()`
- [ ] Extraire les index de `createTables()`

### Phase 5: Nettoyage final
- [ ] Supprimer les méthodes deprecated
- [ ] Vérifier les temps de compilation
- [ ] Tests

## 📊 Estimation

- ✅ **Schémas:** TERMINÉ (25 tables créées)
- **Refactoring createTables():** 1h
- **Migrations:** 4-6h
- **Index:** 2-3h
- **Tests & nettoyage:** 2-3h

**Total estimé restant:** 9-13h

## 🎯 Objectif

Réduire `database.ts` de **3621 lignes** à **~500 lignes** (infrastructure uniquement)

