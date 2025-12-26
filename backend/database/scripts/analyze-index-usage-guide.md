# 📊 Guide d'Analyse des Performances des Index avec EXPLAIN ANALYZE

**Date:** 2025-01-XX  
**Objectif:** Vérifier l'utilisation des index sur des requêtes réelles en production/staging

---

## 📋 Prérequis

1. **Accès à la base de données de production/staging**
2. **IDs réels** pour remplacer les valeurs `TEST_*` dans les scripts
3. **Outils:** `psql` ou un client SQL avec support d'EXPLAIN ANALYZE

---

## 🔍 Étape 1: Vérifier les Index Existants

Exécuter la première section du script pour lister tous les index:

```sql
-- Lister tous les index sur les tables principales
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef,
  CASE 
    WHEN indexdef LIKE '%WHERE%' THEN 'PARTIAL'
    WHEN indexdef LIKE '%DESC%' OR indexdef LIKE '%ASC%' THEN 'SORTED'
    ELSE 'STANDARD'
  END as index_type
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'production_animaux',
    'production_pesees',
    'mortalites',
    -- ... autres tables
  )
ORDER BY tablename, indexname;
```

### Résultats Attendus

Vous devriez voir les index créés par les migrations:
- `046_add_performance_indexes.sql`
- `047_add_additional_performance_indexes.sql`

**Vérifier:**
- ✅ Tous les index recommandés existent
- ✅ Les index partiels sont correctement définis
- ✅ Les index composites incluent les bonnes colonnes dans le bon ordre

---

## 📊 Étape 2: Analyser l'Utilisation des Index

Exécuter la requête sur `pg_stat_user_indexes`:

```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  CASE 
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_scan < 10 THEN 'LOW_USAGE'
    WHEN idx_scan < 100 THEN 'MEDIUM_USAGE'
    ELSE 'HIGH_USAGE'
  END as usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC, tablename, indexname;
```

### Interprétation

- **UNUSED (idx_scan = 0):** L'index n'a jamais été utilisé
  - **Action:** Vérifier si l'index est vraiment nécessaire ou si les requêtes correspondantes ne sont pas exécutées
  - **Attention:** Sur une base neuve, les index peuvent avoir 0 scans si aucune requête n'a été exécutée

- **LOW_USAGE (idx_scan < 10):** L'index est rarement utilisé
  - **Action:** Vérifier si les requêtes correspondantes sont fréquentes
  - Peut être normal si l'index est pour des requêtes spécialisées

- **MEDIUM_USAGE / HIGH_USAGE:** L'index est utilisé régulièrement
  - ✅ Bon signe: L'index sert son objectif

---

## 🔬 Étape 3: Exécuter EXPLAIN ANALYZE

### Préparation

1. **Obtenir des IDs réels** depuis la base de données:
   ```sql
   -- Exemple: Obtenir un projet_id réel
   SELECT id FROM projets WHERE statut = 'actif' LIMIT 1;
   
   -- Exemple: Obtenir un animal_id réel
   SELECT id FROM production_animaux WHERE projet_id = 'VOTRE_PROJET_ID' LIMIT 1;
   ```

2. **Remplacer les valeurs `TEST_*`** dans le script `analyze-index-usage.sql`

### Exécution

Exécuter les requêtes `EXPLAIN ANALYZE` une par une, en commençant par les plus critiques:

1. **Requêtes fréquentes** (ex: chargement des animaux, pesées, etc.)
2. **Requêtes complexes** (ex: JOINs, agrégations)
3. **Requêtes de reporting** (ex: statistiques, calculs de performance)

### Exemple d'Exécution

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, COSTS)
SELECT id, code, nom, statut
FROM production_animaux
WHERE projet_id = 'VOTRE_PROJET_ID'
ORDER BY date_creation DESC
LIMIT 50;
```

---

## 📈 Étape 4: Analyser les Résultats EXPLAIN ANALYZE

### Structure d'un Résultat EXPLAIN ANALYZE

```
Limit  (cost=XX.XX..XX.XX rows=50 width=XXX) (actual time=XX.XXX..XX.XXX rows=50 loops=1)
  ->  Index Scan using idx_production_animaux_projet_created on production_animaux
        (cost=XX.XX..XX.XX rows=XXX width=XXX) (actual time=XX.XXX..XX.XXX rows=XXX loops=1)
        Index Cond: (projet_id = 'VOTRE_PROJET_ID'::text)
Planning Time: X.XXX ms
Execution Time: XX.XXX ms
```

### Indicateurs Clés

#### ✅ **Index Scan / Index Only Scan**
- **Signification:** PostgreSQL utilise l'index ✅
- **Bon signe:** L'index fonctionne correctement

#### ⚠️ **Seq Scan (Sequential Scan)**
- **Signification:** PostgreSQL scanne toute la table séquentiellement
- **Problème:** Pas d'index utilisé ou index non optimal
- **Action:** Créer un index approprié ou optimiser la requête

#### 📊 **Execution Time**
- **< 50ms:** Excellent pour une requête simple
- **50-100ms:** Acceptable pour une requête simple
- **> 100ms:** À investiguer, peut nécessiter un index ou une optimisation

#### 🔄 **Buffers**
- **shared hit:** Données en cache (RAM) ✅
- **shared read:** Données lues depuis le disque ⚠️
- **Ratio hit/read élevé:** Bon signe (données souvent en cache)

#### ⏱️ **Planning Time**
- **< 10ms:** Normal
- **> 10ms:** Peut indiquer des statistiques obsolètes
- **Action:** Exécuter `ANALYZE table_name;`

---

## 🔧 Étape 5: Identifier les Problèmes et Solutions

### Problème 1: Seq Scan sur une Grande Table

**Symptôme:**
```
Seq Scan on production_animaux  (cost=0.00..XXXX.XX rows=XXX width=XXX) (actual time=XX.XXX..XXX.XXX rows=XXX loops=1)
  Filter: (projet_id = 'VOTRE_PROJET_ID'::text)
  Rows Removed by Filter: XXXX
Planning Time: X.XXX ms
Execution Time: XXX.XXX ms  <-- Temps élevé
```

**Solution:**
1. Vérifier si un index existe pour `projet_id`
2. Si l'index existe mais n'est pas utilisé:
   - Exécuter `ANALYZE production_animaux;` pour mettre à jour les statistiques
   - Vérifier que la requête correspond au pattern de l'index
3. Si l'index n'existe pas: Créer l'index approprié

### Problème 2: Index Non Utilisé

**Symptôme:**
- Index existe dans `pg_indexes`
- Mais `Seq Scan` dans EXPLAIN ANALYZE
- `idx_scan = 0` dans `pg_stat_user_indexes`

**Causes Possibles:**
1. **Statistiques obsolètes:** Exécuter `ANALYZE table_name;`
2. **Pattern de requête différent:** L'index ne correspond pas à la requête
3. **Table trop petite:** PostgreSQL préfère Seq Scan pour les petites tables (< 1000 lignes)

### Problème 3: Temps d'Exécution Élevé Malgré Index

**Symptôme:**
- `Index Scan` utilisé ✅
- Mais `Execution Time` > 100ms ⚠️

**Causes Possibles:**
1. **Index non optimal:** L'index ne couvre pas toutes les conditions WHERE
2. **Beaucoup de tuples:** Même avec index, beaucoup de lignes à traiter
3. **JOINs complexes:** Plusieurs tables à joindre

**Solutions:**
1. Créer un index composite si plusieurs conditions WHERE
2. Utiliser un index partiel si une condition WHERE est fréquente
3. Optimiser la requête (éviter SELECT *, LIMIT, etc.)

---

## 📝 Étape 6: Documenter les Résultats

Créer un document de synthèse avec:

1. **Index utilisés efficacement** ✅
   - Lister les index qui fonctionnent bien
   - Confirmer leur utilité

2. **Index non utilisés** ⚠️
   - Identifier les index inutiles (candidats à suppression)
   - Ou vérifier si les requêtes correspondantes sont rares

3. **Index manquants** ❌
   - Identifier les Seq Scan qui pourraient bénéficier d'un index
   - Créer une migration pour ajouter ces index

4. **Recommandations d'optimisation**
   - Index composites à créer
   - Index partiels à créer
   - Requêtes à optimiser

---

## 🔄 Étape 7: Maintenance Régulière

### Statistiques (À exécuter régulièrement)

```sql
-- Mettre à jour les statistiques des tables principales
ANALYZE production_animaux;
ANALYZE production_pesees;
ANALYZE mortalites;
-- ... autres tables
```

**Fréquence recommandée:**
- **Production:** Une fois par jour (via cron job)
- **Staging:** Après chaque migration importante

### Réorganisation des Index (À exécuter occasionnellement)

```sql
-- Réorganiser les index si nécessaire
REINDEX TABLE production_animaux;
REINDEX TABLE production_pesees;
-- ... autres tables
```

**Fréquence recommandée:**
- **Production:** Une fois par mois ou après beaucoup de modifications
- **Staging:** Avant des tests de performance

---

## 🎯 Checklist de Vérification

### Avant de Commencer
- [ ] Accès à la base de données obtenu
- [ ] IDs réels récupérés pour les tests
- [ ] Script `analyze-index-usage.sql` préparé

### Pendant l'Analyse
- [ ] Index existants listés et vérifiés
- [ ] Utilisation des index analysée (pg_stat_user_indexes)
- [ ] Requêtes EXPLAIN ANALYZE exécutées
- [ ] Résultats documentés

### Après l'Analyse
- [ ] Problèmes identifiés documentés
- [ ] Solutions proposées
- [ ] Migration créée pour les nouveaux index (si nécessaire)
- [ ] Statistiques mises à jour (ANALYZE)

---

## 📚 Ressources

- [PostgreSQL EXPLAIN Documentation](https://www.postgresql.org/docs/current/sql-explain.html)
- [Index Performance Tips](https://www.postgresql.org/docs/current/indexes-types.html)
- [pg_stat_statements Extension](https://www.postgresql.org/docs/current/pgstatstatements.html)

---

**Document créé le:** 2025-01-XX  
**Dernière mise à jour:** 2025-01-XX

