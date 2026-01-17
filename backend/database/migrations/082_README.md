# Migration 082: Ajouter support verrat dans batch_gestations

## Description
Cette migration ajoute les colonnes `verrat_id` et `verrat_nom` à la table `batch_gestations` pour uniformiser avec le mode individuel et permettre le stockage des informations du verrat.

## Changements
- Ajoute `verrat_id VARCHAR(255)` (nullable)
- Ajoute `verrat_nom TEXT` (nullable)
- Crée un index sur `verrat_id` pour améliorer les performances

## Application

### Option 1: Via psql (recommandé)
```bash
psql -U votre_user -d votre_database -f 082_add_verrat_to_batch_gestations.sql
```

### Option 2: Via le backend (si système de migration automatique)
La migration sera appliquée automatiquement au démarrage du backend.

### Option 3: Via Render/Production
1. Se connecter à la base de données PostgreSQL
2. Exécuter le contenu de `082_add_verrat_to_batch_gestations.sql`

## Vérification
```sql
-- Vérifier que les colonnes existent
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'batch_gestations'
  AND column_name IN ('verrat_id', 'verrat_nom');

-- Vérifier l'index
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'batch_gestations'
  AND indexname = 'idx_batch_gestations_verrat_id';
```

## Rollback (si nécessaire)
```sql
DROP INDEX IF EXISTS idx_batch_gestations_verrat_id;
ALTER TABLE batch_gestations
DROP COLUMN IF EXISTS verrat_id,
DROP COLUMN IF EXISTS verrat_nom;
```
