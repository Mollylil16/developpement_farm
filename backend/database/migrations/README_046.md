# Migration 046 - Indexes de Performance

## Description

Cette migration ajoute des indexes composites optimisés pour améliorer les performances des requêtes fréquentes.

## Fichier

`046_add_performance_indexes.sql`

## Indexes Créés

### production_animaux
- `idx_production_animaux_projet_statut` : (projet_id, statut)
- `idx_production_animaux_projet_created` : (projet_id, date_creation DESC)

### production_pesees
- `idx_production_pesees_projet_date` : (projet_id, date DESC)
- `idx_production_pesees_animal_date` : (animal_id, date DESC)

### mortalites
- `idx_mortalites_projet_date` : (projet_id, date DESC)
- `idx_mortalites_projet_categorie` : (projet_id, categorie)

### marketplace_listings
- `idx_marketplace_listings_status_listed` : (status, listed_at DESC)
- `idx_marketplace_listings_farm_status` : (farm_id, status)

### batch_pigs
- `idx_batch_pigs_batch_entry` : (batch_id, entry_date DESC)

### batch_pig_movements
- `idx_batch_pig_movements_pig_date` : (pig_id, movement_date DESC)

### batches
- `idx_batches_projet_creation` : (projet_id, batch_creation_date DESC)

### projets
- `idx_projets_owner_statut` : (proprietaire_id, statut)
- `idx_projets_owner_active` : (proprietaire_id, statut, date_creation DESC) WHERE statut = 'actif'

## Application

### Méthode 1: Via psql

```bash
# Se connecter à la base de données
psql -U votre_user -d votre_database

# Exécuter la migration
\i backend/database/migrations/046_add_performance_indexes.sql
```

### Méthode 2: Via ligne de commande

```bash
psql -U votre_user -d votre_database -f backend/database/migrations/046_add_performance_indexes.sql
```

### Méthode 3: Via votre outil de gestion de migrations

Si vous utilisez un outil de gestion de migrations (ex: node-pg-migrate, db-migrate), ajoutez cette migration à votre système.

## Vérification

Après l'application, vérifier que les indexes ont été créés :

```sql
-- Vérifier les indexes sur production_animaux
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'production_animaux' 
  AND indexname LIKE 'idx_production_animaux%';

-- Vérifier tous les nouveaux indexes
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE indexname LIKE 'idx_%projet%' 
   OR indexname LIKE 'idx_%batch%'
   OR indexname LIKE 'idx_marketplace_listings%'
ORDER BY tablename, indexname;
```

## Impact Attendu

- **-50% à -90%** de temps d'exécution des requêtes SQL fréquentes
- Amélioration notable sur les requêtes avec filtres par projet + statut/date
- Meilleure performance sur les ORDER BY avec WHERE

## Rollback (si nécessaire)

Si vous devez annuler cette migration :

```sql
-- Supprimer les indexes créés
DROP INDEX IF EXISTS idx_production_animaux_projet_statut;
DROP INDEX IF EXISTS idx_production_animaux_projet_created;
DROP INDEX IF EXISTS idx_production_pesees_projet_date;
DROP INDEX IF EXISTS idx_production_pesees_animal_date;
DROP INDEX IF EXISTS idx_mortalites_projet_date;
DROP INDEX IF EXISTS idx_mortalites_projet_categorie;
DROP INDEX IF EXISTS idx_marketplace_listings_status_listed;
DROP INDEX IF EXISTS idx_marketplace_listings_farm_status;
DROP INDEX IF EXISTS idx_batch_pigs_batch_entry;
DROP INDEX IF EXISTS idx_batch_pig_movements_pig_date;
DROP INDEX IF EXISTS idx_batches_projet_creation;
DROP INDEX IF EXISTS idx_projets_owner_statut;
DROP INDEX IF EXISTS idx_projets_owner_active;
```

## Notes

- Les indexes utilisent `IF NOT EXISTS` donc la migration est idempotente
- L'instruction `ANALYZE` est incluse pour mettre à jour les statistiques
- Les indexes peuvent prendre quelques secondes à créer selon la taille des tables
- **Index partiels**: Les indexes `idx_marketplace_listings_active_listed` et `idx_marketplace_listings_farm_active` sont des index partiels (avec clause WHERE) pour optimiser efficacement les requêtes avec `status != 'removed'`, car les index B-tree ne supportent pas efficacement l'opérateur d'inégalité (`!=`)

## Fix Appliqué

Si vous avez déjà appliqué la version initiale de la migration 046, exécutez le script de correction :
```bash
psql -U votre_user -d votre_database -f backend/database/migrations/FIX_046_marketplace_indexes.sql
```

Ce script :
- Supprime l'ancien index `idx_marketplace_listings_status_listed`
- Crée les nouveaux index partiels optimisés
