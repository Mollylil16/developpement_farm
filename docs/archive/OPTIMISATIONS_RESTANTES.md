# Optimisations Restantes - Référence au Rapport d'Analyse

**Date:** $(date)  
**Statut:** Phase 1 et Phase 2 complétées ✅

---

## ✅ Ce qui a été fait

### Phase 1 - Quick Wins ✅ COMPLÉTÉE
1. ✅ Retirer délais artificiels dans `useDashboardData`
2. ✅ Réduire limite pesées dans `OverviewWidget` (100 → 20)
3. ✅ Implémenter `loadBatches` dans `BatchCheptelView`

### Phase 2 - Optimisations Frontend ✅ COMPLÉTÉE
4. ✅ Optimiser calculs dans `OverviewWidget` (useMemo intermédiaires)
5. ✅ Ajouter `React.memo` sur composants enfants (CheptelHeader, LivestockStatsCard, WidgetVueEnsemble)
6. ✅ Debouncing sur recherches (hook useDebounce créé et appliqué)

---

## 🔴 Ce qui reste à faire - Phase 3 (Backend) - Priorité HAUTE

### 6. ❌ Pagination dans les Endpoints Backend

**Localisation:** Plusieurs services backend

**Problème:**
- Endpoints comme `findAllListings`, `findAllAnimals`, `findAll` retournent toutes les données
- Pas de pagination ni de limite
- Risque de timeout sur de grandes collections

**Endpoints concernés:**
- `backend/src/production/production.service.ts`: `findAllAnimals()`
- `backend/src/marketplace/marketplace.service.ts`: `findAllListings()`
- `backend/src/mortalites/mortalites.service.ts`: `findAll()`
- `backend/src/users/users.service.ts`: `findAll()` (si utilisé)
- Autres endpoints `findAll` dans les services

**Solution à implémenter:**
```typescript
// DTO pour pagination
interface PaginationDto {
  page?: number;      // Défaut: 1
  limit?: number;     // Défaut: 50, max: 100
}

// Réponse paginée
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}
```

**Exemple d'implémentation:**
```typescript
async findAllAnimals(
  projetId: string, 
  userId: string, 
  pagination?: PaginationDto,
  inclureInactifs: boolean = true
): Promise<PaginatedResponse<ProductionAnimal>> {
  const page = pagination?.page || 1;
  const limit = Math.min(pagination?.limit || 50, 100);
  const offset = (page - 1) * limit;

  // Requête avec LIMIT et OFFSET
  const dataQuery = `SELECT * FROM production_animaux WHERE projet_id = $1 
    ${inclureInactifs ? '' : "AND statut = 'actif'"} 
    ORDER BY date_creation DESC 
    LIMIT $2 OFFSET $3`;
  
  const countQuery = `SELECT COUNT(*) FROM production_animaux WHERE projet_id = $1 
    ${inclureInactifs ? '' : "AND statut = 'actif'"}`;

  const [dataResult, countResult] = await Promise.all([
    this.databaseService.query(dataQuery, [projetId, limit, offset]),
    this.databaseService.query(countQuery, [projetId])
  ]);

  const total = parseInt(countResult.rows[0].count);
  const totalPages = Math.ceil(total / limit);

  return {
    data: dataResult.rows.map(row => this.mapRowToAnimal(row)),
    total,
    page,
    limit,
    hasMore: page < totalPages,
    totalPages
  };
}
```

**Gain attendu:** -80-90% de données transférées sur grandes collections

---

### 7. ❌ Caching (Redis ou Mémoire)

**Localisation:** Backend services

**Problème:**
- Pas de stratégie de caching pour les données fréquemment accédées
- Requêtes répétées pour les mêmes données
- Charge excessive sur la base de données

**Données à cacher:**
1. **Cache Dashboard (TTL: 30-60s)**
   - Stats du projet
   - Données de vue d'ensemble
   - Statistiques récentes

2. **Cache Listes Projets (TTL: 5-15min)**
   - Liste des projets de l'utilisateur
   - Projet actif

3. **Cache Données de Référence (TTL: 1h+)**
   - Catégories
   - Données statiques

**Solution à implémenter:**
- Option 1: Cache en mémoire (simple, pour commencer)
- Option 2: Redis (pour production avec plusieurs instances)

**Exemple avec cache en mémoire:**
```typescript
// backend/src/common/cache/memory-cache.service.ts
@Injectable()
export class MemoryCacheService {
  private cache = new Map<string, { data: any; expiry: number }>();

  set(key: string, data: any, ttlSeconds: number): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expiry });
  }

  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}
```

**Gain attendu:** -50-80% de requêtes DB pour données cachées

---

### 8. ❌ Vérification et Optimisation des Indexes DB

**Localisation:** Migrations SQL

**Problème:**
- Indexes présents dans certaines migrations mais vérification complète nécessaire
- Pas d'analyse des requêtes lentes
- Requêtes SQL potentiellement lentes sur grandes tables

**Tables critiques à vérifier:**
1. `production_animaux`
   - Index sur `projet_id` ✅ (probablement déjà présent)
   - Index sur `statut` ✅ (probablement déjà présent)
   - Index composé `(projet_id, statut)` ⚠️ (à vérifier/ajouter)

2. `production_pesees`
   - Index sur `animal_id` ✅
   - Index sur `projet_id` ⚠️ (à vérifier)
   - Index sur `date` (pour ORDER BY date DESC) ⚠️

3. `batches`
   - Index sur `projet_id` ⚠️
   - Index sur `pen_name` (si recherche fréquente) ⚠️

4. `marketplace_listings`
   - Index sur `status` ✅
   - Index composé `(status, listed_at)` (pour ORDER BY) ⚠️

**Solution:**
Créer une migration pour ajouter les indexes manquants :
```sql
-- backend/database/migrations/046_add_performance_indexes.sql

-- Index composé pour production_animaux
CREATE INDEX IF NOT EXISTS idx_production_animaux_projet_statut 
ON production_animaux(projet_id, statut);

-- Index pour production_pesees
CREATE INDEX IF NOT EXISTS idx_production_pesees_projet_date 
ON production_pesees(projet_id, date DESC);

-- Index pour batches
CREATE INDEX IF NOT EXISTS idx_batches_projet_id 
ON batches(projet_id);

-- Index composé pour marketplace_listings
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status_listed 
ON marketplace_listings(status, listed_at DESC);

-- Analyser les tables après ajout des indexes
ANALYZE production_animaux;
ANALYZE production_pesees;
ANALYZE batches;
ANALYZE marketplace_listings;
```

**Gain attendu:** -50-90% de temps d'exécution des requêtes SQL

---

## 🟡 Ce qui reste à faire - Phase 4 (Avancées) - Priorité MOYENNE/BASSE

### 9. ⚠️ Optimisation FlatList (Priorité BASSE)

**Localisation:** `ProductionCheptelComponent.tsx`

**Status:** Déjà partiellement optimisé (getItemLayout, removeClippedSubviews)

**Recommandation:**
- Vérifier que `windowSize={5}` est optimal (actuellement 5, pourrait être 10-15)
- S'assurer que `maxToRenderPerBatch` est adapté au device

**Impact:** Faible (déjà optimisé)

---

### 10. ⚠️ Lazy Loading des Images (Priorité MOYENNE)

**Localisation:** Composants affichant des photos d'animaux

**Recommandation:**
- Utiliser `expo-image` avec lazy loading
- Implémenter un placeholder pendant le chargement
- Compresser les images côté serveur

**Gain attendu:** Réduction du temps de chargement initial, meilleure UX

---

### 11. ⚠️ Code Splitting Frontend (Priorité BASSE)

**Recommandation:**
- Implémenter lazy loading pour les écrans non critiques
- Code splitting des modals et composants lourds

**Exemple:**
```typescript
// Lazy load des écrans
const MarketplaceScreen = React.lazy(() => import('./screens/marketplace/MarketplaceScreen'));
const ReportsScreen = React.lazy(() => import('./screens/ReportsScreen'));

// Utiliser avec Suspense
<Suspense fallback={<LoadingSpinner />}>
  <MarketplaceScreen />
</Suspense>
```

**Gain attendu:** Réduction de la taille du bundle initial

---

### 12. ⚠️ Monitoring et Analyse Continue (Priorité BASSE)

**Recommandation:**
1. **Performance Metrics**
   - Temps de réponse API (p50, p95, p99)
   - Taille des réponses
   - Temps de rendu composants

2. **Error Tracking**
   - Requêtes lentes (>1s)
   - Timeouts
   - Erreurs de mémoire

3. **Database Monitoring**
   - EXPLAIN plans pour requêtes fréquentes
   - Index usage
   - Query time

**Gain attendu:** Visibilité sur les performances, détection proactive des problèmes

---

## 📊 Résumé des Optimisations Restantes

| # | Optimisation | Priorité | Complexité | Impact | Effort Estimé |
|---|--------------|----------|------------|--------|---------------|
| 6 | Pagination Backend | 🔴 HAUTE | Moyenne | Élevé | 2-3 jours |
| 7 | Caching | 🔴 HAUTE | Moyenne-Élevée | Très Élevé | 3-5 jours |
| 8 | Indexes DB | 🔴 HAUTE | Faible | Élevé | 1 jour |
| 10 | Lazy Loading Images | 🟡 MOYENNE | Faible | Moyen | 1-2 jours |
| 11 | Code Splitting | 🟡 BASSE | Moyenne | Faible | 2-3 jours |
| 12 | Monitoring | 🟡 BASSE | Moyenne | Moyen | 3-5 jours |

---

## 🎯 Plan d'Action Recommandé

### Phase 3 - Backend (Priorité Immédiate) - 1 semaine

1. **Jour 1-2: Pagination Backend**
   - Créer DTOs de pagination
   - Implémenter pagination sur `findAllAnimals`
   - Implémenter pagination sur `findAllListings`
   - Implémenter pagination sur autres endpoints critiques
   - Mettre à jour le frontend pour gérer la pagination

2. **Jour 3: Indexes DB**
   - Analyser les requêtes fréquentes
   - Créer migration pour indexes manquants
   - Tester les performances avant/après

3. **Jour 4-5: Caching**
   - Implémenter service de cache (mémoire pour commencer)
   - Cacher données dashboard
   - Cacher listes projets
   - Implémenter invalidation de cache

### Phase 4 - Avancées (Selon besoins) - 1-2 semaines

4. **Lazy Loading Images** (1-2 jours)
5. **Code Splitting** (2-3 jours)
6. **Monitoring** (3-5 jours)

---

## ✅ Checklist Générale

### Phase 3 - Backend
- [ ] Créer DTOs de pagination
- [ ] Implémenter pagination sur endpoints critiques
- [ ] Mettre à jour frontend pour gérer pagination
- [ ] Créer migration pour indexes DB
- [ ] Analyser et valider performance indexes
- [ ] Implémenter service de cache
- [ ] Cacher données dashboard
- [ ] Cacher listes projets
- [ ] Implémenter invalidation cache

### Phase 4 - Avancées
- [ ] Implémenter lazy loading images
- [ ] Implémenter code splitting écrans
- [ ] Ajouter monitoring performance
- [ ] Configurer alertes performance

---

## 📝 Notes Importantes

1. **Pagination:** Commencer par les endpoints les plus utilisés (production, marketplace)
2. **Caching:** Commencer simple (mémoire), passer à Redis plus tard si nécessaire
3. **Indexes:** Toujours analyser avec EXPLAIN avant et après pour mesurer l'impact
4. **Monitoring:** Essentiel pour maintenir les performances dans le temps

