# Guide d'Analyse des Requêtes Lentes avec EXPLAIN ANALYZE

**Date:** 2025-01-XX  
**Objectif:** Identifier les requêtes lentes et proposer des optimisations d'indexes

---

## 📋 Vue d'Ensemble

Ce guide explique comment analyser les performances des requêtes PostgreSQL pour identifier les indexes manquants et les optimisations nécessaires.

---

## 🔍 Méthodologie

### Étape 1: Identifier les Requêtes Fréquentes

Analyser les requêtes les plus fréquemment exécutées dans le code :

```typescript
// Requêtes fréquentes identifiées:
// - production.service.ts: findAllAnimals (avec pagination)
// - production.service.ts: getPeseesByAnimal
// - mortalites.service.ts: findAll (avec pagination)
// - marketplace.service.ts: findAllListings (avec pagination)
// - projets.service.ts: findAll
```

### Étape 2: Exécuter EXPLAIN ANALYZE

Pour chaque requête identifiée, exécuter `EXPLAIN ANALYZE` dans PostgreSQL :

```sql
-- Exemple pour production_animaux
EXPLAIN ANALYZE
SELECT id, projet_id, code, nom, origine, sexe, date_naissance, poids_initial, 
       date_entree, actif, statut, race, reproducteur, categorie_poids, 
       pere_id, mere_id, notes, photo_uri, date_creation, derniere_modification
FROM production_animaux 
WHERE projet_id = 'proj_123' 
ORDER BY date_creation DESC 
LIMIT 500 OFFSET 0;
```

### Étape 3: Analyser les Résultats

**Indicateurs de Performance:**

1. **Seq Scan** (Scan séquentiel) - ⚠️ LENT
   - Si la table est grande (> 1000 lignes), un Seq Scan est généralement mauvais
   - Indique qu'un index pourrait aider

2. **Index Scan** ou **Index Only Scan** - ✅ RAPIDE
   - Utilise un index existant
   - Bon signe si le coût est faible

3. **Planning Time** et **Execution Time**
   - Planning Time < 1ms = bon
   - Execution Time > 100ms pour requête simple = à optimiser

4. **Cost** (Coût estimé)
   - Cost < 100 = excellent
   - Cost 100-1000 = acceptable
   - Cost > 1000 = à optimiser

---

## 📊 Requêtes à Analyser

### 1. Production Animaux

**Requête:** `findAllAnimals` avec pagination

```sql
EXPLAIN ANALYZE
SELECT id, projet_id, code, nom, origine, sexe, date_naissance, poids_initial, 
       date_entree, actif, statut, race, reproducteur, categorie_poids, 
       pere_id, mere_id, notes, photo_uri, date_creation, derniere_modification
FROM production_animaux 
WHERE projet_id = $1 
  AND statut = 'actif'  -- si inclureInactifs = false
ORDER BY date_creation DESC 
LIMIT 500 OFFSET 0;
```

**Indexes existants (migration 046):**
- `idx_production_animaux_projet_statut` (projet_id, statut)
- `idx_production_animaux_projet_created` (projet_id, date_creation DESC)

**Vérifier:** Si ORDER BY utilise l'index `idx_production_animaux_projet_created`

---

### 2. Pesées

**Requête:** `getPeseesByAnimal`

```sql
EXPLAIN ANALYZE
SELECT id, projet_id, animal_id, date, poids_kg, gmq, difference_standard, 
       commentaire, cree_par, date_creation
FROM production_pesees 
WHERE animal_id = $1 
ORDER BY date DESC;
```

**Indexes existants (migration 046):**
- `idx_production_pesees_animal_date` (animal_id, date DESC)

**Vérifier:** Si l'index est utilisé pour le tri

---

### 3. Mortalités

**Requête:** `findAll` avec pagination

```sql
EXPLAIN ANALYZE
SELECT id, projet_id, nombre_porcs, date, cause, categorie, 
       animal_code, poids_kg, notes, date_creation
FROM mortalites 
WHERE projet_id = $1 
ORDER BY date DESC 
LIMIT 500 OFFSET 0;
```

**Indexes existants (migration 046):**
- `idx_mortalites_projet_date` (projet_id, date DESC)

**Vérifier:** Si l'index est utilisé

---

### 4. Marketplace Listings

**Requête:** `findAllListings`

```sql
EXPLAIN ANALYZE
SELECT id, subject_id, producer_id, farm_id, price_per_kg, calculated_price, 
       status, listed_at, updated_at, last_weight_date,
       location_latitude, location_longitude, location_address, location_city, location_region,
       sale_terms, views, inquiries, date_creation, derniere_modification
FROM marketplace_listings 
WHERE status != 'removed' 
  AND farm_id = $1  -- si projetId fourni
ORDER BY listed_at DESC 
LIMIT 100 OFFSET 0;
```

**Indexes existants (migration 046):**
- `idx_marketplace_listings_active_listed` (listed_at DESC) WHERE status != 'removed'
- `idx_marketplace_listings_farm_active` (farm_id, listed_at DESC) WHERE status != 'removed'

**Vérifier:** Si l'index partiel est utilisé correctement

---

### 5. Projets

**Requête:** `findAll`

```sql
EXPLAIN ANALYZE
SELECT * FROM projets 
WHERE proprietaire_id = $1 
ORDER BY date_creation DESC;
```

**Indexes existants (migration 046):**
- `idx_projets_owner_active` (proprietaire_id, date_creation DESC) WHERE statut = 'actif'
- `idx_projets_owner_statut` (proprietaire_id, statut)

**Vérifier:** Si un index sur (proprietaire_id, date_creation DESC) sans WHERE serait mieux

---

## 🎯 Tables à Vérifier (Sans Indexes dans Migration 046)

### 1. Revenues

**Requêtes possibles:**
```sql
-- Par projet et date
SELECT * FROM revenus 
WHERE projet_id = $1 
ORDER BY date DESC;

-- Par catégorie
SELECT * FROM revenus 
WHERE projet_id = $1 
  AND categorie = 'vente_porc';
```

**Indexes recommandés:**
```sql
CREATE INDEX IF NOT EXISTS idx_revenus_projet_date 
ON revenus(projet_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_revenus_projet_categorie 
ON revenus(projet_id, categorie);
```

---

### 2. Depenses Ponctuelles

**Requêtes possibles:**
```sql
-- Par projet et date
SELECT * FROM depenses_ponctuelles 
WHERE projet_id = $1 
ORDER BY date DESC;
```

**Indexes recommandés:**
```sql
CREATE INDEX IF NOT EXISTS idx_depenses_projet_date 
ON depenses_ponctuelles(projet_id, date DESC);
```

---

### 3. Vaccinations

**Requêtes possibles:**
```sql
-- Par animal
SELECT * FROM vaccinations 
WHERE animal_id = $1 
ORDER BY date DESC;

-- Par projet
SELECT * FROM vaccinations 
WHERE projet_id = $1 
ORDER BY date DESC;
```

**Indexes recommandés:**
```sql
CREATE INDEX IF NOT EXISTS idx_vaccinations_animal_date 
ON vaccinations(animal_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_vaccinations_projet_date 
ON vaccinations(projet_id, date DESC);
```

---

### 4. Traitements

**Requêtes possibles:**
```sql
-- Par animal
SELECT * FROM traitements 
WHERE animal_id = $1 
ORDER BY date_debut DESC;
```

**Indexes recommandés:**
```sql
CREATE INDEX IF NOT EXISTS idx_traitements_animal_date 
ON traitements(animal_id, date_debut DESC);
```

---

### 5. Gestations

**Requêtes possibles:**
```sql
-- Par projet et statut
SELECT * FROM gestations 
WHERE projet_id = $1 
  AND statut = 'en_cours' 
ORDER BY date_insemination DESC;
```

**Indexes recommandés:**
```sql
CREATE INDEX IF NOT EXISTS idx_gestations_projet_statut 
ON gestations(projet_id, statut, date_insemination DESC);
```

---

## 🔧 Script SQL pour Analyse Complète

```sql
-- 1. Identifier les requêtes lentes dans pg_stat_statements (si activé)
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  (total_exec_time / NULLIF(calls, 0)) as avg_time_per_call
FROM pg_stat_statements
WHERE query LIKE '%production_animaux%'
   OR query LIKE '%mortalites%'
   OR query LIKE '%marketplace_listings%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 2. Vérifier l'utilisation des indexes existants
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- 3. Identifier les indexes inutilisés
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexname NOT LIKE 'pg_%'
ORDER BY tablename, indexname;

-- 4. Identifier les tables sans indexes (ou avec peu d'indexes)
SELECT 
  t.tablename,
  COUNT(i.indexname) as index_count
FROM pg_tables t
LEFT JOIN pg_indexes i ON t.tablename = i.tablename AND t.schemaname = i.schemaname
WHERE t.schemaname = 'public'
  AND t.tablename IN ('revenus', 'depenses_ponctuelles', 'vaccinations', 'traitements', 'gestations')
GROUP BY t.tablename
ORDER BY index_count, t.tablename;
```

---

## 📝 Checklist d'Analyse

### Pour chaque requête fréquente :

- [ ] Exécuter `EXPLAIN ANALYZE` avec des données réalistes
- [ ] Vérifier le type de scan (Seq Scan vs Index Scan)
- [ ] Noter le temps d'exécution
- [ ] Noter le coût estimé
- [ ] Identifier les filtres WHERE non indexés
- [ ] Identifier les ORDER BY non indexés
- [ ] Vérifier si les indexes existants sont utilisés
- [ ] Proposer de nouveaux indexes si nécessaire

---

## 🚀 Actions Recommandées

### Priorité 1 (Haute Fréquence)
1. Vérifier que les indexes de la migration 046 sont utilisés
2. Analyser les requêtes de production_animaux avec différents filtres
3. Analyser les requêtes de marketplace_listings

### Priorité 2 (Moyenne Fréquence)
4. Ajouter des indexes pour revenus et depenses_ponctuelles
5. Analyser les requêtes de vaccinations et traitements

### Priorité 3 (Basse Fréquence)
6. Ajouter des indexes pour gestations si nécessaire
7. Optimiser les requêtes de rapports complexes

---

## 📚 Références

- [PostgreSQL EXPLAIN Documentation](https://www.postgresql.org/docs/current/using-explain.html)
- [Index Types in PostgreSQL](https://www.postgresql.org/docs/current/indexes-types.html)
- [Query Performance Tips](https://www.postgresql.org/docs/current/performance-tips.html)

---

## ⚠️ Notes Importantes

1. **Toujours tester en environnement de staging** avant d'appliquer en production
2. **Analyser avec des données réalistes** (taille de table similaire à la production)
3. **Les indexes améliorent les lectures mais ralentissent les écritures** - trouver le bon équilibre
4. **VACUUM régulièrement** pour maintenir les statistiques à jour
5. **ANALYZE après création d'indexes** pour mettre à jour les statistiques

