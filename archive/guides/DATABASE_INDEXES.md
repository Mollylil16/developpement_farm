# 📊 Index Stratégiques et Optimisation des Requêtes

Guide sur les index composites et l'optimisation des performances de base de données.

## 📋 Table des matières

1. [Introduction](#introduction)
2. [Index existants](#index-existants)
3. [Index composites](#index-composites)
4. [Pagination](#pagination)
5. [Bonnes pratiques](#bonnes-pratiques)

---

## Introduction

### Pourquoi des index stratégiques ?

Les index améliorent les performances des requêtes :
- ✅ Recherches rapides par `projet_id`
- ✅ Filtres combinés (ex: `projet_id` + `statut`)
- ✅ Tri efficace (ORDER BY)
- ✅ Jointures optimisées

### Problème initial

- ❌ Index simples uniquement (sur `projet_id`)
- ❌ Pas d'index composites pour requêtes multi-colonnes
- ❌ Requêtes lentes sur grandes tables
- ❌ Pas de pagination systématique

### Solution

- ✅ Index composites pour requêtes fréquentes
- ✅ Pagination dans BaseRepository
- ✅ Optimisation des requêtes ORDER BY

---

## Index existants

### Index simples sur projet_id

Créés dans `createIndexesWithProjetId()` :

- `idx_depenses_projet`
- `idx_revenus_projet`
- `idx_mortalites_projet`
- `idx_planifications_projet`
- `idx_collaborations_projet`
- `idx_stocks_aliments_projet`
- `idx_production_animaux_code` (composite unique: `projet_id, code`)

### Index sur autres colonnes

- `idx_users_telephone`
- `idx_production_animaux_reproducteur`
- `idx_collaborations_user_id`

---

## Index composites

### Production

#### Animaux
```sql
-- Requêtes: WHERE projet_id = ? AND actif = 1
CREATE INDEX idx_production_animaux_projet_actif 
ON production_animaux(projet_id, actif);

-- Requêtes: WHERE projet_id = ? AND statut = ?
CREATE INDEX idx_production_animaux_projet_statut 
ON production_animaux(projet_id, statut);

-- Requêtes: WHERE projet_id = ? AND reproducteur = 1 AND actif = 1
CREATE INDEX idx_production_animaux_projet_reproducteur 
ON production_animaux(projet_id, reproducteur, actif);
```

#### Pesées
```sql
-- Requêtes: WHERE animal_id = ? ORDER BY date
CREATE INDEX idx_production_pesees_animal_date 
ON production_pesees(animal_id, date);

-- Requêtes: WHERE projet_id = ? ORDER BY date
CREATE INDEX idx_production_pesees_projet_date 
ON production_pesees(projet_id, date);
```

#### Gestations
```sql
-- Requêtes: WHERE projet_id = ? AND statut = ?
CREATE INDEX idx_gestations_projet_statut 
ON gestations(projet_id, statut);

-- Requêtes: WHERE truie_id = ? ORDER BY date_sautage
CREATE INDEX idx_gestations_truie_date 
ON gestations(truie_id, date_sautage);
```

### Finance

#### Revenus
```sql
-- Requêtes: WHERE projet_id = ? AND date >= ? AND date <= ?
CREATE INDEX idx_revenus_projet_date 
ON revenus(projet_id, date);

-- Requêtes: WHERE projet_id = ? AND animal_id = ?
CREATE INDEX idx_revenus_projet_animal 
ON revenus(projet_id, animal_id);
```

#### Dépenses
```sql
-- Requêtes: WHERE projet_id = ? AND date >= ? AND date <= ?
CREATE INDEX idx_depenses_projet_date 
ON depenses_ponctuelles(projet_id, date);

-- Requêtes: WHERE projet_id = ? AND categorie = ?
CREATE INDEX idx_depenses_projet_categorie 
ON depenses_ponctuelles(projet_id, categorie);
```

#### Charges fixes
```sql
-- Requêtes: WHERE projet_id = ? AND statut = ?
CREATE INDEX idx_charges_fixes_projet_statut 
ON charges_fixes(projet_id, statut);
```

### Santé

#### Vaccinations
```sql
-- Requêtes: WHERE projet_id = ? ORDER BY date_vaccination
CREATE INDEX idx_vaccinations_projet_date 
ON vaccinations(projet_id, date_vaccination);

-- Requêtes: WHERE projet_id = ? AND statut = ?
CREATE INDEX idx_vaccinations_projet_statut 
ON vaccinations(projet_id, statut);

-- Requêtes: WHERE animal_id = ? ORDER BY date_vaccination
CREATE INDEX idx_vaccinations_animal_date 
ON vaccinations(animal_id, date_vaccination);
```

#### Traitements
```sql
-- Requêtes: WHERE projet_id = ? ORDER BY date_debut
CREATE INDEX idx_traitements_projet_date 
ON traitements(projet_id, date_debut);

-- Requêtes: WHERE animal_id = ? ORDER BY date_debut
CREATE INDEX idx_traitements_animal_date 
ON traitements(animal_id, date_debut);
```

#### Maladies
```sql
-- Requêtes: WHERE projet_id = ? ORDER BY date_debut
CREATE INDEX idx_maladies_projet_date 
ON maladies(projet_id, date_debut);

-- Requêtes: WHERE animal_id = ? ORDER BY date_debut
CREATE INDEX idx_maladies_animal_date 
ON maladies(animal_id, date_debut);
```

### Autres

#### Planifications
```sql
-- Requêtes: WHERE projet_id = ? AND statut = ?
CREATE INDEX idx_planifications_projet_statut 
ON planifications(projet_id, statut);

-- Requêtes: WHERE projet_id = ? ORDER BY date_prevue
CREATE INDEX idx_planifications_projet_date 
ON planifications(projet_id, date_prevue);
```

#### Collaborations
```sql
-- Requêtes: WHERE projet_id = ? AND statut = ?
CREATE INDEX idx_collaborations_projet_statut 
ON collaborations(projet_id, statut);

-- Requêtes: WHERE user_id = ? AND statut = ?
CREATE INDEX idx_collaborations_user_statut 
ON collaborations(user_id, statut);
```

---

## Pagination

### BaseRepository

La pagination est disponible dans `BaseRepository` :

```typescript
// Récupérer avec pagination
const result = await repository.findAllPaginated({
  projetId: 'projet-123',
  limit: 50,
  offset: 0,
  orderBy: 'derniere_modification',
  orderDirection: 'DESC',
});

// result contient:
// - data: T[] - Les enregistrements
// - total: number - Nombre total d'enregistrements
// - limit: number - Limite utilisée
// - offset: number - Offset utilisé
// - hasMore: boolean - Y a-t-il plus de résultats ?
```

### Exemple d'utilisation

```typescript
// Dans un repository spécifique
async findByProjetPaginated(
  projetId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<PaginatedResult<Planification>> {
  return this.findAllPaginated({
    projetId,
    limit: options.limit || 50,
    offset: options.offset || 0,
    orderBy: 'date_prevue',
    orderDirection: 'ASC',
  });
}
```

### Dans les composants

```typescript
const [page, setPage] = useState(0);
const limit = 50;

const loadData = async () => {
  const result = await planificationRepo.findByProjetPaginated(projetId, {
    limit,
    offset: page * limit,
  });
  
  setData(result.data);
  setHasMore(result.hasMore);
  setTotal(result.total);
};
```

---

## Bonnes pratiques

### ✅ À faire

1. **Utiliser la pagination pour les grandes tables**
   - Toujours paginer les listes qui peuvent contenir > 100 enregistrements
   - Limite par défaut: 50 enregistrements

2. **Créer des index composites pour requêtes fréquentes**
   - Analyser les requêtes avec EXPLAIN QUERY PLAN
   - Créer des index pour WHERE + ORDER BY combinés

3. **Ordre des colonnes dans les index composites**
   - Colonne la plus sélective en premier
   - Colonnes utilisées dans WHERE avant celles dans ORDER BY

4. **Éviter les index inutiles**
   - Chaque index ralentit les INSERT/UPDATE
   - Ne créer que les index vraiment utilisés

### ❌ À éviter

1. **Ne pas charger toutes les données en mémoire**
   - Utiliser `findAllPaginated()` au lieu de `findAll()`
   - Limiter les résultats avec LIMIT

2. **Ne pas créer trop d'index**
   - Maximum 5-10 index par table
   - Analyser l'utilisation avant de créer

3. **Ne pas ignorer les index sur les foreign keys**
   - SQLite ne crée pas automatiquement d'index sur FK
   - Créer manuellement si utilisé dans WHERE

---

## Analyse des performances

### EXPLAIN QUERY PLAN

Utiliser `EXPLAIN QUERY PLAN` pour analyser les requêtes :

```sql
EXPLAIN QUERY PLAN
SELECT * FROM production_animaux 
WHERE projet_id = ? AND actif = 1 
ORDER BY date_creation DESC;
```

### Vérifier l'utilisation des index

```sql
-- Lister tous les index
SELECT name, tbl_name, sql 
FROM sqlite_master 
WHERE type = 'index' 
AND tbl_name = 'production_animaux';
```

---

## Références

- [SQLite Indexes](https://www.sqlite.org/lang_createindex.html)
- [BaseRepository](../../src/database/repositories/BaseRepository.ts)
- [Index composites](../../src/database/indexes/createCompositeIndexes.ts)
- [Index projet_id](../../src/database/indexes/createIndexes.ts)

---

**Dernière mise à jour:** 21 Novembre 2025

