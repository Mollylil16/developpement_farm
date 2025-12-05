# 🗄️ Système de Migrations Versionnées

Guide complet sur le système de migrations de base de données.

## 📋 Table des matières

1. [Introduction](#introduction)
2. [Architecture](#architecture)
3. [Créer une migration](#créer-une-migration)
4. [Exécution des migrations](#exécution-des-migrations)
5. [Rollback](#rollback)
6. [Bonnes pratiques](#bonnes-pratiques)
7. [Dépannage](#dépannage)

---

## Introduction

Le système de migrations versionnées permet de :
- ✅ Gérer les changements de schéma de manière structurée
- ✅ Versionner les modifications de base de données
- ✅ Suivre les migrations appliquées dans `schema_migrations`
- ✅ Éviter les pertes de données (transactions)
- ✅ Exécution atomique (rollback automatique en cas d'erreur)
- ✅ Prévention des exécutions multiples
- ✅ Support rollback optionnel

### Avant (Problème)

Les migrations étaient dans `database.ts` avec des try-catch partout :
- ❌ Risque de perte de données
- ❌ Migrations non versionnées
- ❌ Impossible de rollback
- ❌ Difficile à maintenir
- ❌ ~1500 lignes de code dans un seul fichier

### Après (Solution)

Migrations versionnées dans `src/database/migrations/` :
- ✅ Fichiers séparés et versionnés (25+ migrations)
- ✅ Table de tracking `schema_migrations`
- ✅ Exécution dans l'ordre (par version)
- ✅ Transactions pour l'atomicité
- ✅ Support rollback (optionnel)
- ✅ Service de gestion (`MigrationService`)

---

## Architecture

### Structure

```
src/database/migrations/
├── MigrationRunner.ts          # Moteur d'exécution
├── index.ts                    # Export centralisé
├── 001_initial_schema.ts       # Migration 1
├── 002_add_telephone.ts        # Migration 2
└── ...
```

### Composants

1. **MigrationRunner** : Gère l'exécution et le tracking
2. **Table `schema_migrations`** : Suivi des migrations appliquées
3. **Fichiers de migration** : Chaque migration dans son propre fichier

### Table de tracking

```sql
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## Créer une migration

### Format standard

```typescript
// src/database/migrations/026_ma_migration.ts
import type { SQLiteDatabase } from 'expo-sqlite';

export async function maMigration(db: SQLiteDatabase): Promise<void> {
  // Vérifier si la table existe
  const tableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='ma_table'"
  );

  if (!tableExists) {
    return; // Table n'existe pas, migration non nécessaire
  }

  // Vérifier si la colonne existe déjà
  const columnExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM pragma_table_info('ma_table') WHERE name = 'ma_colonne'"
  );

  if (!columnExists) {
    // Ajouter la colonne
    await db.execAsync(`
      ALTER TABLE ma_table ADD COLUMN ma_colonne TEXT;
    `);
    console.log('✅ [Migration] Colonne ma_colonne ajoutée');
  }
}
```

### Enregistrer la migration

Dans `src/database/migrations/index.ts` :

```typescript
import { maMigration } from './026_ma_migration';

export const migrations: Migration[] = [
  // ... migrations existantes
  {
    version: 26,
    name: 'ma_migration',
    up: maMigration,
  },
];
```

### Nommage

- Format : `{version}_{nom_descriptif}.ts`
- Version : Numéro séquentiel (26, 27, 28, ...)
- Nom : Descriptif en snake_case

Exemples :
- `026_add_weekly_pork_price_trends.ts`
- `027_add_indexes_for_performance.ts`

---

## Exécution des migrations

### Automatique

Les migrations s'exécutent automatiquement au démarrage de l'application :

```typescript
// Dans database.ts
await this.runVersionedMigrations();
```

### Ordre d'exécution

1. Création de `schema_migrations` si nécessaire
2. Récupération des migrations déjà appliquées
3. Tri des migrations par version
4. Exécution des migrations en attente
5. Marquage comme appliquées

### Logs

```
🔄 Application de la migration 26: ma_migration...
✅ Migration 26: ma_migration appliquée avec succès
⏭️  Migration 27: autre_migration déjà appliquée
```

---

## Rollback

### Support optionnel

Les migrations peuvent inclure une fonction `down` pour le rollback :

```typescript
export async function maMigrationUp(db: SQLiteDatabase): Promise<void> {
  // Migration forward
  await db.execAsync(`ALTER TABLE ma_table ADD COLUMN ma_colonne TEXT;`);
}

export async function maMigrationDown(db: SQLiteDatabase): Promise<void> {
  // Rollback
  await db.execAsync(`ALTER TABLE ma_table DROP COLUMN ma_colonne;`);
}

// Dans index.ts
{
  version: 26,
  name: 'ma_migration',
  up: maMigrationUp,
  down: maMigrationDown, // Optionnel
}
```

### ⚠️ Attention

Le rollback n'est pas automatique. Il doit être implémenté manuellement si nécessaire.

---

## Bonnes pratiques

### ✅ À faire

1. **Vérifier l'existence avant modification**
   ```typescript
   const tableExists = await db.getFirstAsync(...);
   if (!tableExists) return;
   ```

2. **Vérifier si déjà appliqué**
   ```typescript
   const columnExists = await db.getFirstAsync(...);
   if (columnExists) return; // Déjà appliqué
   ```

3. **Valider les données après migration**
   ```typescript
   const countBefore = await db.getFirstAsync('SELECT COUNT(*) ...');
   // ... migration ...
   const countAfter = await db.getFirstAsync('SELECT COUNT(*) ...');
   if (countBefore !== countAfter) {
     throw new Error('Données perdues lors de la migration');
   }
   ```

4. **Logs descriptifs**
   ```typescript
   console.log('✅ [Migration] Colonne ajoutée avec succès');
   ```

5. **Transactions quand possible**
   ```typescript
   // SQLite supporte les transactions
   await db.execAsync('BEGIN TRANSACTION;');
   try {
     // ... migrations ...
     await db.execAsync('COMMIT;');
   } catch (error) {
     await db.execAsync('ROLLBACK;');
     throw error;
   }
   ```

### ❌ À éviter

1. **Ne pas supprimer de données sans backup**
2. **Ne pas modifier les migrations déjà appliquées**
3. **Ne pas sauter de versions**
4. **Ne pas ignorer les erreurs silencieusement**

---

## Dépannage

### Problème : Migration échoue

1. Vérifier les logs pour l'erreur exacte
2. Vérifier si la migration a été partiellement appliquée
3. Corriger la migration si nécessaire
4. Réessayer

### Problème : Migration déjà appliquée mais échoue

Si une migration est marquée comme appliquée mais échoue :

```typescript
// Vérifier dans schema_migrations
SELECT * FROM schema_migrations WHERE version = 26;

// Si nécessaire, supprimer l'entrée (attention !)
DELETE FROM schema_migrations WHERE version = 26;
```

### Problème : Migration appliquée deux fois

Le système empêche cela automatiquement en vérifiant `schema_migrations`.

### Problème : Tables temporaires orphelines

Le système nettoie automatiquement les tables temporaires (`*_old`) avant les migrations.

---

## Exemples

### Exemple 1 : Ajouter une colonne

```typescript
export async function addColumnToTable(db: SQLiteDatabase): Promise<void> {
  const tableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='ma_table'"
  );

  if (!tableExists) return;

  const columnExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM pragma_table_info('ma_table') WHERE name = 'nouvelle_colonne'"
  );

  if (!columnExists) {
    await db.execAsync(`
      ALTER TABLE ma_table ADD COLUMN nouvelle_colonne TEXT DEFAULT '';
    `);
    console.log('✅ [Migration] Colonne nouvelle_colonne ajoutée');
  }
}
```

### Exemple 2 : Créer une table

```typescript
export async function createNewTable(db: SQLiteDatabase): Promise<void> {
  const tableExists = await db.getFirstAsync<{ name: string } | null>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='nouvelle_table'"
  );

  if (tableExists) return; // Déjà créée

  await db.execAsync(`
    CREATE TABLE nouvelle_table (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ [Migration] Table nouvelle_table créée');
}
```

### Exemple 3 : Migration complexe avec validation

```typescript
export async function complexMigration(db: SQLiteDatabase): Promise<void> {
  // Compter avant
  const countBefore = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM ma_table'
  );

  // Renommer table
  await db.execAsync('ALTER TABLE ma_table RENAME TO ma_table_old;');

  // Créer nouvelle structure
  await db.execAsync(`
    CREATE TABLE ma_table (
      id TEXT PRIMARY KEY,
      nouveau_champ TEXT
    );
  `);

  // Copier données
  await db.execAsync(`
    INSERT INTO ma_table (id, nouveau_champ)
    SELECT id, ancien_champ FROM ma_table_old;
  `);

  // Valider
  const countAfter = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM ma_table'
  );

  if (countBefore?.count !== countAfter?.count) {
    throw new Error('Données perdues lors de la migration');
  }

  // Nettoyer
  await db.execAsync('DROP TABLE ma_table_old;');
}
```

---

## MigrationService

Le `MigrationService` fournit des utilitaires pour gérer les migrations :

```typescript
import { MigrationService } from '../database/migrations/MigrationService';

// Récupérer le statut de toutes les migrations
const status = await MigrationService.getMigrationStatus(db);

// Vérifier si une migration est appliquée
const isApplied = await MigrationService.isMigrationApplied(db, 26);

// Récupérer la dernière migration appliquée
const last = await MigrationService.getLastAppliedMigration(db);

// Compter les migrations en attente
const pending = await MigrationService.getPendingMigrationsCount(db);
```

## Références

- [MigrationRunner.ts](../../src/database/migrations/MigrationRunner.ts)
- [MigrationService.ts](../../src/database/migrations/MigrationService.ts)
- [Migrations existantes](../../src/database/migrations/)
- [Database Service](../../src/services/database.ts)
- [Plan de nettoyage](MIGRATION_CLEANUP_PLAN.md) - Suppression de `migrateTables()`

---

**Dernière mise à jour:** 21 Novembre 2025

