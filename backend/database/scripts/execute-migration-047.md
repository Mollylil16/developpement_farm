# 🚀 Guide d'Exécution de la Migration 047

**Migration:** `047_add_additional_performance_indexes.sql`  
**Date:** 2025-01-XX  
**Objectif:** Ajouter 23 nouveaux indexes pour optimiser les performances

---

## ⚠️ Prérequis

1. **Accès à la base de données de staging**
2. **Backup de la base de données** (recommandé avant toute migration)
3. **Temps estimé:** 5-15 minutes selon la taille de la base

---

## 📋 Étape 1: Préparation

### 1.1 Vérifier l'état actuel

```sql
-- Vérifier que la migration 046 a été exécutée
SELECT version, name, executed_at 
FROM schema_migrations 
WHERE name LIKE '%046%' OR name LIKE '%047%'
ORDER BY executed_at DESC;
```

### 1.2 Vérifier les index existants

```sql
-- Compter les index avant migration
SELECT 
  tablename,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'revenus', 'depenses_ponctuelles', 'charges_fixes',
    'vaccinations', 'maladies', 'traitements', 'visites_veterinaires',
    'gestations', 'sevrages', 'rapports_croissance',
    'planifications', 'collaborations'
  )
GROUP BY tablename
ORDER BY tablename;
```

### 1.3 Créer un backup (recommandé)

```bash
# Exemple avec pg_dump
pg_dump -h localhost -U your_user -d your_database > backup_before_047_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🔧 Étape 2: Exécution de la Migration

### Option A: Via psql (Recommandé)

```bash
# Se connecter à la base de données
psql -h localhost -U your_user -d your_database

# Exécuter la migration
\i backend/database/migrations/047_add_additional_performance_indexes.sql

# Ou directement
psql -h localhost -U your_user -d your_database -f backend/database/migrations/047_add_additional_performance_indexes.sql
```

### Option B: Via un client SQL (pgAdmin, DBeaver, etc.)

1. Ouvrir le fichier `047_add_additional_performance_indexes.sql`
2. Exécuter le script complet
3. Vérifier qu'aucune erreur n'est survenue

### Option C: Via l'application (si système de migrations intégré)

```bash
# Si vous utilisez un système de migrations (ex: TypeORM, Prisma, etc.)
npm run migration:run
# ou
yarn migration:run
```

---

## ✅ Étape 3: Vérification Post-Migration

### 3.1 Vérifier que tous les index ont été créés

```sql
-- Vérifier les nouveaux index créés
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  AND tablename IN (
    'revenus', 'depenses_ponctuelles', 'charges_fixes',
    'vaccinations', 'maladies', 'traitements', 'visites_veterinaires',
    'gestations', 'sevrages', 'rapports_croissance',
    'planifications', 'collaborations'
  )
ORDER BY tablename, indexname;
```

**Résultat attendu:** 23 nouveaux index devraient être présents

### 3.2 Vérifier les index partiels

```sql
-- Vérifier les index partiels (avec WHERE clause)
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexdef LIKE '%WHERE%'
ORDER BY tablename, indexname;
```

**Index partiels attendus:**
- `idx_vaccinations_projet_statut_date` (WHERE statut = 'a_faire')
- `idx_gestations_projet_statut_date` (WHERE statut = 'en_cours')
- `idx_planifications_projet_statut_date` (WHERE statut = 'a_faire' AND date_debut >= CURRENT_DATE)

### 3.3 Vérifier les statistiques

```sql
-- Vérifier que ANALYZE a été exécuté
SELECT 
  schemaname,
  tablename,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'revenus', 'depenses_ponctuelles', 'charges_fixes',
    'vaccinations', 'maladies', 'traitements', 'visites_veterinaires',
    'gestations', 'sevrages', 'rapports_croissance',
    'planifications', 'collaborations'
  )
ORDER BY tablename;
```

**Vérifier:** `last_analyze` ou `last_autoanalyze` devrait être récent

---

## 🔍 Étape 4: Tests de Performance (Optionnel mais Recommandé)

### 4.1 Tester une requête simple

```sql
-- Test sur revenus
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, montant, categorie, date
FROM revenus
WHERE projet_id = 'VOTRE_PROJET_ID'
ORDER BY date DESC
LIMIT 100;
```

**Vérifier:**
- ✅ `Index Scan using idx_revenus_projet_date` dans le plan
- ✅ `Execution Time` < 50ms (pour une requête simple)

### 4.2 Tester un index partiel

```sql
-- Test sur vaccinations à faire
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, animal_id, vaccin, date_vaccination
FROM vaccinations
WHERE projet_id = 'VOTRE_PROJET_ID' 
  AND statut = 'a_faire'
ORDER BY date_vaccination ASC;
```

**Vérifier:**
- ✅ `Index Scan using idx_vaccinations_projet_statut_date` dans le plan
- ✅ Pas de `Seq Scan`

---

## ⚠️ Dépannage

### Problème 1: Erreur "relation already exists"

**Symptôme:**
```
ERROR: relation "idx_revenus_projet_date" already exists
```

**Solution:**
- La migration utilise `CREATE INDEX IF NOT EXISTS`, donc cette erreur ne devrait pas survenir
- Si elle survient, vérifier qu'un index avec le même nom existe déjà
- Option: Supprimer l'index existant et réexécuter la migration

### Problème 2: Migration très lente

**Symptôme:**
- La migration prend plus de 30 minutes

**Causes possibles:**
- Table très grande (> 1 million de lignes)
- Disque lent
- Autres opérations en cours

**Solution:**
- Exécuter pendant une période de faible charge
- Vérifier l'espace disque disponible
- Monitorer les logs PostgreSQL

### Problème 3: Index non créé

**Symptôme:**
- La migration s'exécute sans erreur
- Mais certains index sont absents

**Solution:**
1. Vérifier les logs PostgreSQL pour des erreurs silencieuses
2. Vérifier les permissions de l'utilisateur (nécessite CREATE INDEX)
3. Réexécuter la création de l'index manuellement

---

## 📊 Étape 5: Monitoring Post-Migration

### 5.1 Surveiller l'utilisation des index

```sql
-- Surveiller l'utilisation des nouveaux index (après quelques jours)
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  CASE 
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_scan < 10 THEN 'LOW_USAGE'
    WHEN idx_scan < 100 THEN 'MEDIUM_USAGE'
    ELSE 'HIGH_USAGE'
  END as usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  AND tablename IN (
    'revenus', 'depenses_ponctuelles', 'charges_fixes',
    'vaccinations', 'maladies', 'traitements', 'visites_veterinaires',
    'gestations', 'sevrages', 'rapports_croissance',
    'planifications', 'collaborations'
  )
ORDER BY idx_scan ASC, tablename, indexname;
```

### 5.2 Comparer les performances avant/après

**Avant migration:**
- Noter les temps d'exécution des requêtes fréquentes
- Identifier les requêtes lentes

**Après migration:**
- Réexécuter les mêmes requêtes
- Comparer les temps d'exécution
- Vérifier l'utilisation des index dans EXPLAIN ANALYZE

---

## ✅ Checklist de Validation

### Avant Migration
- [ ] Backup de la base de données créé
- [ ] Accès à la base de staging confirmé
- [ ] Migration 046 vérifiée (si applicable)
- [ ] Index existants listés (baseline)

### Pendant Migration
- [ ] Migration exécutée sans erreur
- [ ] Temps d'exécution acceptable (< 30 min)
- [ ] Aucune erreur dans les logs PostgreSQL

### Après Migration
- [ ] 23 nouveaux index vérifiés
- [ ] Index partiels vérifiés
- [ ] ANALYZE exécuté sur toutes les tables
- [ ] Tests de performance réussis
- [ ] Documentation mise à jour

---

## 📝 Notes Importantes

1. **Environnement:** Cette migration doit être exécutée en **staging** d'abord
2. **Production:** Ne pas exécuter en production avant validation en staging
3. **Rollback:** Si problème, restaurer le backup créé à l'étape 1.3
4. **Monitoring:** Surveiller l'utilisation des index après quelques jours d'utilisation

---

## 🔄 Prochaines Étapes

Après validation en staging:
1. Documenter les résultats
2. Planifier l'exécution en production
3. Exécuter la migration en production
4. Vérifier l'utilisation des index avec `analyze-index-usage.sql`

---

**Document créé le:** 2025-01-XX  
**Dernière mise à jour:** 2025-01-XX

