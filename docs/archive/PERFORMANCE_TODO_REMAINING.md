# Optimisations Restantes - Performance

**Date:** $(date)  
**Statut:** Phase 1 ✅ et Phase 2 ✅ complétées

---

## 📊 État Actuel

### ✅ Optimisations Déjà Complétées

**Phase 1 - Quick Wins:**
1. ✅ Retirer délais artificiels dans `useDashboardData` (parallélisation)
2. ✅ Réduire limite pesées dans `OverviewWidget` (100 → 20)
3. ✅ Implémenter `loadBatches` dans `BatchCheptelView` (endpoint backend)
4. ✅ Optimiser calculs dans `OverviewWidget` (useMemo intermédiaires)

**Phase 2 - Optimisations Frontend:**
5. ✅ Ajouter `React.memo` sur composants enfants (CheptelHeader, LivestockStatsCard, WidgetVueEnsemble)
6. ✅ Debouncing sur recherches (hook useDebounce)

---

## 🔴 Optimisations Restantes - Par Priorité

### 🔴 PRIORITÉ HAUTE - Phase 3 Backend

#### 1. Pagination Backend ⚠️

**Localisation:** `backend/src/production/production.service.ts` et autres services

**Endpoints à modifier:**
- `findAllAnimals()` - `backend/src/production/production.service.ts:167`
- `findAllListings()` - `backend/src/marketplace/marketplace.service.ts:110`
- `findAll()` - `backend/src/mortalites/mortalites.service.ts:108`
- `findAll()` - `backend/src/users/users.service.ts:158`
- `findAll()` - `backend/src/projets/projets.service.ts` (si existe)

**Implémentation requise:**
```typescript
// Ajouter limit et offset aux méthodes
async findAllAnimals(
  projetId: string, 
  userId: string, 
  inclureInactifs: boolean = true,
  limit: number = 100,
  offset: number = 0
) {
  // ...
  query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  // ...
  return {
    data: result.rows.map(...),
    total: countResult.rows[0].count,
    limit,
    offset,
    hasMore: offset + limit < countResult.rows[0].count
  };
}
```

**DTO à créer:**
```typescript
// backend/src/common/dto/pagination.dto.ts
export class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 100;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
```

**Gain attendu:** -80-90% de données transférées sur grandes collections

---

#### 2. Caching ⚠️

**Localisation:** Backend services

**Stratégie recommandée:**

**Option A - Cache en mémoire (simple):**
```typescript
// backend/src/common/cache/memory-cache.service.ts
@Injectable()
export class MemoryCacheService {
  private cache = new Map<string, { data: any; expires: number }>();

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item || item.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return item.data as T;
  }

  set(key: string, data: any, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlSeconds * 1000,
    });
  }

  clear(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}
```

**Endpoints à cacher:**
- Dashboard stats (TTL: 30-60s)
- Listes de projets (TTL: 5-15min)
- Données de référence (catégories, etc.) (TTL: 1h+)

**Gain attendu:** -50-80% de requêtes DB pour données cachées

---

#### 3. Vérification et Optimisation Indexes DB ⚠️

**Localisation:** `backend/database/migrations/`

**Actions requises:**

1. **Analyser les requêtes fréquentes:**
   - Vérifier les WHERE clauses dans les services
   - Identifier les JOINs fréquents
   - Analyser les ORDER BY

2. **Vérifier les indexes existants:**
   ```sql
   -- Vérifier indexes sur tables principales
   SELECT indexname, indexdef 
   FROM pg_indexes 
   WHERE tablename IN ('production_animaux', 'mortalites', 'marketplace_listings', 'projets');
   ```

3. **Ajouter indexes manquants:**
   - `production_animaux(projet_id, statut)` - Composite index
   - `mortalites(projet_id, date)` - Composite index
   - `marketplace_listings(status, listed_at)` - Composite index
   - `batch_pigs(batch_id, entry_date)` - Composite index

**Migration à créer:**
```sql
-- backend/database/migrations/046_add_performance_indexes.sql
-- Indexes pour optimiser les requêtes fréquentes

-- Production animaux
CREATE INDEX IF NOT EXISTS idx_production_animaux_projet_statut 
  ON production_animaux(projet_id, statut);

-- Mortalités
CREATE INDEX IF NOT EXISTS idx_mortalites_projet_date 
  ON mortalites(projet_id, date DESC);

-- Marketplace
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status_listed 
  ON marketplace_listings(status, listed_at DESC);

-- Batch pigs
CREATE INDEX IF NOT EXISTS idx_batch_pigs_batch_entry 
  ON batch_pigs(batch_id, entry_date DESC);
```

**Gain attendu:** -50-90% de temps d'exécution des requêtes SQL

---

### 🟡 PRIORITÉ MOYENNE - Phase 4 Avancées

#### 4. Lazy Loading des Images ⚠️

**Localisation:** Composants affichant des photos (AnimalCard, etc.)

**Implémentation:**
```typescript
// Remplacer Image par expo-image
import { Image } from 'expo-image';

// Dans AnimalCard
<Image
  source={{ uri: animal.photo_uri }}
  placeholder={require('../../assets/placeholder.png')}
  contentFit="cover"
  transition={200}
  style={styles.photo}
/>
```

**Gain attendu:** Meilleur temps de chargement initial, moins de mémoire utilisée

---

#### 5. Code Splitting Frontend ⚠️

**Localisation:** `src/navigation/AppNavigator.tsx`

**Implémentation:**
```typescript
// Lazy loading des écrans non critiques
const MarketplaceScreen = lazy(() => import('../screens/marketplace/MarketplaceScreen'));
const ReportsScreen = lazy(() => import('../screens/ReportsScreen'));

// Utiliser Suspense
<Suspense fallback={<LoadingSpinner />}>
  <MarketplaceScreen />
</Suspense>
```

**Écrans à lazy load:**
- MarketplaceScreen
- ReportsScreen
- SettingsScreen
- Modals lourds

**Gain attendu:** Réduction bundle initial, chargement plus rapide

---

#### 6. Optimisation FlatList (Ajustement) ⚠️

**Localisation:** `src/components/ProductionCheptelComponent.tsx`

**Statut:** Déjà optimisé mais peut être ajusté

**Recommandation:**
```typescript
// Ajuster windowSize selon les performances réelles
<FlatList
  windowSize={10} // Augmenter de 5 à 10-15 si performances bonnes
  maxToRenderPerBatch={15} // Augmenter si device puissant
  // ...
/>
```

---

### 🟢 PRIORITÉ BASSE - Monitoring

#### 7. Monitoring de Performance ⚠️

**Implémentation:**

**Frontend:**
```typescript
// src/utils/performance-monitor.ts
export const performanceMonitor = {
  measureRender(componentName: string) {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      if (duration > 16) { // > 1 frame
        console.warn(`[Performance] ${componentName} render: ${duration.toFixed(2)}ms`);
      }
    };
  },

  measureApiCall(endpoint: string) {
    const start = performance.now();
    return (responseSize?: number) => {
      const duration = performance.now() - start;
      console.log(`[API] ${endpoint}: ${duration.toFixed(2)}ms, ${responseSize || 0} bytes`);
    };
  },
};
```

**Backend:**
```typescript
// backend/src/common/interceptors/logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const request = context.switchToHttp().getRequest();
    
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        if (duration > 1000) {
          console.warn(`[Slow Request] ${request.method} ${request.url}: ${duration}ms`);
        }
      })
    );
  }
}
```

---

## 📋 Checklist d'Implémentation

### Phase 3 - Backend (2-3 jours estimés)

- [ ] **Pagination Backend**
  - [ ] Créer DTO PaginationDto
  - [ ] Modifier findAllAnimals avec pagination
  - [ ] Modifier findAllListings avec pagination
  - [ ] Modifier findAll mortalités avec pagination
  - [ ] Modifier autres endpoints findAll si nécessaire
  - [ ] Mettre à jour frontend pour utiliser pagination

- [ ] **Caching**
  - [ ] Créer MemoryCacheService (ou intégrer Redis)
  - [ ] Ajouter cache sur dashboard stats
  - [ ] Ajouter cache sur listes projets
  - [ ] Ajouter cache sur données de référence
  - [ ] Implémenter invalidation de cache

- [ ] **Indexes DB**
  - [ ] Analyser requêtes fréquentes
  - [ ] Créer migration pour nouveaux indexes
  - [ ] Vérifier performances avec EXPLAIN
  - [ ] Tester sur données réelles

### Phase 4 - Avancées (1 semaine estimée)

- [ ] **Lazy Loading Images**
  - [ ] Installer/configurer expo-image
  - [ ] Remplacer Image par expo-image dans AnimalCard
  - [ ] Ajouter placeholders
  - [ ] Tester performances

- [ ] **Code Splitting**
  - [ ] Identifier écrans à lazy load
  - [ ] Implémenter lazy loading
  - [ ] Ajouter Suspense boundaries
  - [ ] Tester bundle size

- [ ] **Monitoring**
  - [ ] Créer performance monitor frontend
  - [ ] Créer logging interceptor backend
  - [ ] Implémenter métriques clés
  - [ ] Configurer alertes si nécessaire

---

## 🎯 Estimation d'Impact

| Optimisation | Effort | Impact | Gain Estimé |
|-------------|--------|--------|-------------|
| Pagination Backend | 2-3 jours | 🔴 Élevé | -80-90% données |
| Caching | 1-2 jours | 🟡 Moyen | -50-80% requêtes DB |
| Indexes DB | 1 jour | 🟡 Moyen | -50-90% temps SQL |
| Lazy Loading Images | 1 jour | 🟢 Faible | Meilleure UX |
| Code Splitting | 2-3 jours | 🟢 Faible | -20-30% bundle |
| Monitoring | 1 jour | 🟢 Faible | Visibilité |

---

## 📝 Notes Importantes

### Ordre Recommandé d'Implémentation

1. **D'abord:** Indexes DB (gain immédiat, peu de code)
2. **Ensuite:** Pagination (impact élevé, nécessaire pour scalabilité)
3. **Puis:** Caching (optimise les requêtes répétées)
4. **Enfin:** Optimisations avancées (gains marginaux)

### Critères de Priorisation

- **Impact utilisateur:** Pagination > Caching > Indexes > Reste
- **Effort vs Gain:** Indexes > Pagination > Caching > Reste
- **Urgence technique:** Indexes (maintenance) > Pagination (scalabilité) > Reste

---

## 🔍 Vérification Post-Implémentation

Pour chaque optimisation, mesurer:
- Temps de réponse avant/après
- Données transférées avant/après
- Charge CPU/DB avant/après
- Expérience utilisateur (subjectif)

---

## ✅ Conclusion

Les **Phase 1 et Phase 2 sont complétées** avec succès. Il reste principalement les optimisations backend (Phase 3) qui auront le plus d'impact, notamment la **pagination** et les **indexes DB**.

Les optimisations avancées (Phase 4) sont optionnelles et peuvent être implémentées selon les besoins et contraintes de temps.

