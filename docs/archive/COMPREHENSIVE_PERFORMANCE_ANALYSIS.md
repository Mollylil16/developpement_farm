# 📊 Analyse Complète de Performance - Fermier Pro

**Date:** 2025-01-XX  
**Version:** 1.0  
**Objectif:** Identifier et optimiser tous les goulots d'étranglement de performance pour une application production-ready

---

## 📋 Table des Matières

1. [Résumé Exécutif](#résumé-exécutif)
2. [Architecture Actuelle](#architecture-actuelle)
3. [Analyse Frontend](#analyse-frontend)
4. [Analyse Backend](#analyse-backend)
5. [Analyse Base de Données](#analyse-base-de-données)
6. [Optimisations Prioritaires](#optimisations-prioritaires)
7. [Plan d'Implémentation](#plan-dimplémentation)
8. [Métriques et Validation](#métriques-et-validation)

---

## 🎯 Résumé Exécutif

### Problèmes Identifiés

**Frontend:**
- ⚠️ **440+ requêtes `SELECT *`** dans le backend (chargement de colonnes inutiles)
- ⚠️ **Logs de débogage excessifs** dans `OverviewWidget.tsx` (impact production)
- ⚠️ **Pas de code splitting** pour les écrans (bundle monolithique)
- ⚠️ **Redux Persist** sérialise tout le store à chaque changement
- ⚠️ **Pas de pagination** côté frontend pour les grandes listes
- ⚠️ **Délais artificiels** dans `useBuyerData.ts` (150ms entre requêtes)

**Backend:**
- ⚠️ **440+ requêtes `SELECT *`** (transfert de données inutiles)
- ⚠️ **Cache en mémoire** uniquement (perdu au redémarrage, pas de Redis)
- ⚠️ **Pas de compression HTTP** (gzip/brotli)
- ⚠️ **Pas de compression d'images** côté serveur (malgré `ImageService` existant)
- ⚠️ **Pool de connexions** limité à 20 (peut être insuffisant sous charge)
- ⚠️ **Pas de monitoring** des requêtes lentes (>1s)

**Base de Données:**
- ✅ **Indexes partiels** déjà implémentés (migration 046)
- ⚠️ **Pas d'analyse EXPLAIN ANALYZE** systématique
- ⚠️ **Pas de connection pooling** avancé (pgBouncer)
- ⚠️ **Pas de réplication** pour la lecture

### Impact Estimé

| Optimisation | Impact Frontend | Impact Backend | Impact DB | Priorité |
|-------------|----------------|----------------|-----------|-----------|
| Supprimer `SELECT *` | 🟡 Moyen | 🟢 **Élevé** | 🟢 **Élevé** | **HAUTE** |
| Code splitting | 🟢 **Élevé** | - | - | **HAUTE** |
| Compression HTTP | 🟢 **Élevé** | 🟢 **Élevé** | - | **HAUTE** |
| Pagination frontend | 🟢 **Élevé** | 🟢 **Élevé** | 🟢 **Élevé** | **HAUTE** |
| Redis cache | - | 🟢 **Élevé** | 🟢 **Élevé** | **MOYENNE** |
| Compression images | 🟢 **Élevé** | 🟡 Moyen | - | **MOYENNE** |
| Monitoring | 🟡 Moyen | 🟢 **Élevé** | 🟢 **Élevé** | **MOYENNE** |

---

## 🏗️ Architecture Actuelle

### Stack Technologique

**Frontend:**
- React Native 0.81.5
- Expo SDK 54
- Redux Toolkit + Redux Persist
- React Navigation
- AsyncStorage

**Backend:**
- NestJS 11
- PostgreSQL (via `pg` pool)
- Cache en mémoire (Map)
- Sharp (image processing)

**Base de Données:**
- PostgreSQL
- Pool de connexions: 20 max
- Indexes partiels (migration 046)

---

## 🎨 Analyse Frontend

### 1. **Problème: Logs de Débogage en Production**

**Fichier:** `src/components/widgets/OverviewWidget.tsx`

**Problème:**
```typescript
console.log('[OverviewWidget] ⚡ Component mounting/re-rendering - START');
console.log('[OverviewWidget] ✅ Theme loaded');
// ... 20+ autres console.log
```

**Impact:**
- 🟡 **Frontend:** Ralentissement en production (console.log est coûteux)
- 🟡 **Backend:** N/A
- 🟡 **DB:** N/A

**Solution:**
```typescript
// Utiliser un logger conditionnel
const isDev = __DEV__;
const log = isDev ? console.log : () => {};
log('[OverviewWidget] Component mounting');
```

**Priorité:** 🔴 **HAUTE** (facile, impact immédiat)

---

### 2. **Problème: Pas de Code Splitting**

**Fichier:** `src/navigation/lazyScreens.ts`

**Problème:**
```typescript
// Tous les écrans sont chargés au démarrage
export { default as WelcomeScreen } from '../screens/WelcomeScreen';
export { default as AuthScreen } from '../screens/AuthScreen';
// ... tous les écrans
```

**Impact:**
- 🟢 **Frontend:** Bundle initial trop lourd (tous les écrans chargés)
- 🟡 **Backend:** N/A
- 🟡 **DB:** N/A

**Solution:**
```typescript
// Lazy loading avec React.lazy (si supporté) ou imports dynamiques
import { lazy } from 'react';

export const WelcomeScreen = lazy(() => import('../screens/WelcomeScreen'));
export const AuthScreen = lazy(() => import('../screens/AuthScreen'));
```

**Priorité:** 🔴 **HAUTE** (impact significatif sur le temps de chargement)

---

### 3. **Problème: Redux Persist Sérialise Tout**

**Fichier:** `src/store/store.ts`

**Problème:**
```typescript
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['projet', 'auth'], // Seulement 2 slices, mais...
};
```

**Impact:**
- 🟡 **Frontend:** Sérialisation coûteuse à chaque changement d'état
- 🟡 **Backend:** N/A
- 🟡 **DB:** N/A

**Solution:**
```typescript
// Utiliser des transforms pour optimiser la sérialisation
import { createTransform } from 'redux-persist';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['projet', 'auth'],
  transforms: [
    // Compresser les données persistées
    createTransform(
      (inbound) => JSON.stringify(inbound),
      (outbound) => JSON.parse(outbound),
      { whitelist: ['projet', 'auth'] }
    ),
  ],
};
```

**Priorité:** 🟡 **MOYENNE** (amélioration progressive)

---

### 4. **Problème: Pas de Pagination Frontend**

**Fichier:** `src/components/ProductionCheptelComponent.tsx`

**Problème:**
```typescript
// Charge tous les animaux d'un coup
const allAnimaux = useAppSelector(selectAllAnimaux);
```

**Impact:**
- 🟢 **Frontend:** Ralentissement avec 1000+ animaux
- 🟢 **Backend:** Charge tous les animaux même si non affichés
- 🟢 **DB:** Requête lourde sans limite

**Solution:**
```typescript
// Implémenter la pagination côté frontend
const [page, setPage] = useState(1);
const pageSize = 50;
const paginatedAnimaux = animauxFiltres.slice((page - 1) * pageSize, page * pageSize);

// Utiliser FlatList avec onEndReached pour le scroll infini
<FlatList
  data={paginatedAnimaux}
  onEndReached={() => setPage(prev => prev + 1)}
  onEndReachedThreshold={0.5}
/>
```

**Priorité:** 🔴 **HAUTE** (impact majeur sur la scalabilité)

---

### 5. **Problème: Délais Artificiels**

**Fichier:** `src/hooks/useBuyerData.ts`

**Problème:**
```typescript
// Petit délai pour éviter le rate limiting
await new Promise((resolve) => setTimeout(resolve, 150));
```

**Impact:**
- 🟡 **Frontend:** Délai inutile de 300ms (2x 150ms)
- 🟡 **Backend:** N/A
- 🟡 **DB:** N/A

**Solution:**
```typescript
// Supprimer les délais et gérer le rate limiting côté API client
// Le retryHandler gère déjà les erreurs 429
```

**Priorité:** 🟡 **MOYENNE** (amélioration mineure mais facile)

---

### 6. **Problème: Re-renders Inutiles**

**Fichier:** `src/components/widgets/OverviewWidget.tsx`

**Problème:**
```typescript
// Pas de React.memo sur le composant
export default OverviewWidget;
```

**Impact:**
- 🟡 **Frontend:** Re-renders à chaque changement d'état parent
- 🟡 **Backend:** N/A
- 🟡 **DB:** N/A

**Solution:**
```typescript
// Réactiver React.memo (retiré pendant le débogage)
export default React.memo(OverviewWidget);
```

**Priorité:** 🟡 **MOYENNE** (amélioration progressive)

---

## ⚙️ Analyse Backend

### 1. **Problème: 440+ Requêtes `SELECT *`**

**Fichiers:** Tous les services backend

**Problème:**
```typescript
// backend/src/users/users.service.ts
const result = await this.databaseService.query(
  'SELECT * FROM users WHERE id = $1', // ❌ Charge toutes les colonnes
  [id]
);
```

**Impact:**
- 🟡 **Frontend:** Transfert de données inutiles (légèrement plus lent)
- 🟢 **Backend:** Traitement de colonnes inutiles
- 🟢 **DB:** Transfert réseau plus important, moins de cache efficace

**Solution:**
```typescript
// Sélectionner uniquement les colonnes nécessaires
const result = await this.databaseService.query(
  `SELECT id, email, nom, prenom, telephone, role, is_active, date_creation 
   FROM users WHERE id = $1`,
  [id]
);
```

**Priorité:** 🔴 **HAUTE** (impact majeur sur les performances)

---

### 2. **Problème: Cache en Mémoire Uniquement**

**Fichier:** `backend/src/common/services/cache.service.ts`

**Problème:**
```typescript
// Cache perdu au redémarrage du serveur
private cache = new Map<string, CacheEntry<any>>();
```

**Impact:**
- 🟡 **Frontend:** N/A
- 🟢 **Backend:** Cache perdu à chaque redémarrage
- 🟢 **DB:** Plus de requêtes après redémarrage

**Solution:**
```typescript
// Utiliser Redis en production
import { createClient } from 'redis';

@Injectable()
export class CacheService {
  private client: ReturnType<typeof createClient>;
  
  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }
  
  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
  }
}
```

**Priorité:** 🟡 **MOYENNE** (nécessite infrastructure Redis)

---

### 3. **Problème: Pas de Compression HTTP**

**Fichier:** `backend/src/main.ts`

**Problème:**
```typescript
// Pas de middleware de compression
const app = await NestFactory.create(AppModule);
```

**Impact:**
- 🟢 **Frontend:** Téléchargement de réponses non compressées (2-10x plus lourd)
- 🟢 **Backend:** Bande passante inutilisée
- 🟡 **DB:** N/A

**Solution:**
```typescript
import compression from 'compression';

const app = await NestFactory.create(AppModule);
app.use(compression()); // Gzip/Brotli automatique
```

**Priorité:** 🔴 **HAUTE** (facile, impact majeur)

---

### 4. **Problème: Pool de Connexions Limité**

**Fichier:** `backend/src/database/database.service.ts`

**Problème:**
```typescript
max: 20, // Peut être insuffisant sous charge
```

**Impact:**
- 🟡 **Frontend:** Timeouts possibles sous charge
- 🟢 **Backend:** Blocage de requêtes si pool saturé
- 🟢 **DB:** Connexions limitées

**Solution:**
```typescript
// Ajuster selon la charge attendue
max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX) : 50,
min: 5, // Maintenir un minimum de connexions
```

**Priorité:** 🟡 **MOYENNE** (nécessite monitoring pour ajuster)

---

### 5. **Problème: Pas de Monitoring des Requêtes Lentes**

**Fichier:** `backend/src/database/database.service.ts`

**Problème:**
```typescript
// Log uniquement si > 1000ms, mais pas de métriques
if (duration > 1000) {
  this.logger.warn(`Query lente (${duration}ms): ${text.substring(0, 50)}...`);
}
```

**Impact:**
- 🟡 **Frontend:** N/A
- 🟢 **Backend:** Pas de visibilité sur les performances
- 🟢 **DB:** Pas d'identification des requêtes problématiques

**Solution:**
```typescript
// Intégrer un système de métriques (Prometheus, DataDog, etc.)
import { Counter, Histogram } from 'prom-client';

const queryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['query_type'],
});

const slowQueries = new Counter({
  name: 'db_slow_queries_total',
  help: 'Total number of slow queries',
  labelNames: ['query_type'],
});

// Dans la méthode query:
const end = queryDuration.startTimer({ query_type: 'select' });
const result = await this.pool.query(text, params);
end();

if (duration > 1000) {
  slowQueries.inc({ query_type: 'select' });
}
```

**Priorité:** 🟡 **MOYENNE** (nécessite infrastructure de monitoring)

---

### 6. **Problème: Compression d'Images Non Appliquée**

**Fichier:** `backend/src/common/services/image.service.ts` (à vérifier)

**Problème:**
- Service `ImageService` existe mais peut ne pas être utilisé partout

**Impact:**
- 🟢 **Frontend:** Images lourdes (temps de chargement)
- 🟡 **Backend:** Stockage et bande passante
- 🟡 **DB:** N/A

**Solution:**
```typescript
// S'assurer que toutes les images uploadées passent par ImageService
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadImage(@UploadedFile() file: Express.Multer.File) {
  const compressed = await this.imageService.compressAndResize(file);
  // Sauvegarder compressed au lieu de file
}
```

**Priorité:** 🟡 **MOYENNE** (vérifier l'implémentation actuelle)

---

## 🗄️ Analyse Base de Données

### 1. **Problème: Pas d'EXPLAIN ANALYZE Systématique**

**Fichier:** Tous les services backend

**Problème:**
- Pas de validation systématique des plans d'exécution

**Impact:**
- 🟡 **Frontend:** N/A
- 🟡 **Backend:** N/A
- 🟢 **DB:** Requêtes non optimisées peuvent passer inaperçues

**Solution:**
```typescript
// Créer un script d'audit
// backend/scripts/analyze-slow-queries.ts
async function analyzeQuery(query: string, params: any[]) {
  const explainResult = await db.query(`EXPLAIN ANALYZE ${query}`, params);
  // Analyser le plan et alerter si:
  // - Seq Scan sur grandes tables
  // - Pas d'utilisation d'index
  // - Coût élevé
}
```

**Priorité:** 🟡 **MOYENNE** (outil de diagnostic)

---

### 2. **Problème: Pas de Connection Pooling Avancé**

**Fichier:** `backend/src/database/database.service.ts`

**Problème:**
- Utilisation directe de `pg.Pool` sans pgBouncer

**Impact:**
- 🟡 **Frontend:** N/A
- 🟡 **Backend:** Connexions PostgreSQL coûteuses
- 🟢 **DB:** Surconsommation de ressources

**Solution:**
```typescript
// Utiliser pgBouncer en production pour le pooling de connexions
// Configuration: transaction mode, pool_size ajusté
```

**Priorité:** 🟡 **MOYENNE** (nécessite infrastructure)

---

### 3. **Problème: Pas de Réplication pour la Lecture**

**Fichier:** N/A (architecture)

**Problème:**
- Toutes les requêtes (lecture/écriture) sur la même instance

**Impact:**
- 🟡 **Frontend:** N/A
- 🟡 **Backend:** Charge sur une seule instance
- 🟢 **DB:** Pas de scaling horizontal pour la lecture

**Solution:**
```typescript
// Utiliser un pool de lecture/écriture
class DatabaseService {
  private writePool: Pool;
  private readPool: Pool; // Connecté à un replica
  
  async query(text: string, params?: any[], useReadReplica = false) {
    const pool = useReadReplica ? this.readPool : this.writePool;
    return pool.query(text, params);
  }
}
```

**Priorité:** 🟢 **FAIBLE** (nécessite infrastructure avancée)

---

## 🚀 Optimisations Prioritaires

### Phase 1: Quick Wins (1-2 jours)

1. ✅ **Supprimer les logs de débogage** (`OverviewWidget.tsx`)
2. ✅ **Ajouter compression HTTP** (`main.ts`)
3. ✅ **Supprimer les délais artificiels** (`useBuyerData.ts`)
4. ✅ **Réactiver React.memo** (`OverviewWidget.tsx`)

**Impact estimé:** 🟢 **Élevé** | **Effort:** 🟢 **Faible**

---

### Phase 2: Optimisations Majeures (3-5 jours)

1. ✅ **Remplacer `SELECT *` par colonnes explicites** (tous les services)
2. ✅ **Implémenter pagination frontend** (`ProductionCheptelComponent.tsx`)
3. ✅ **Code splitting** (`lazyScreens.ts`)

**Impact estimé:** 🟢 **Très Élevé** | **Effort:** 🟡 **Moyen**

---

### Phase 3: Infrastructure (1-2 semaines)

1. ✅ **Redis cache** (remplacer cache mémoire)
2. ✅ **Monitoring des requêtes** (Prometheus/DataDog)
3. ✅ **Compression d'images** (vérifier et appliquer partout)

**Impact estimé:** 🟢 **Élevé** | **Effort:** 🔴 **Élevé**

---

## 📈 Plan d'Implémentation

### Étape 1: Quick Wins (Immédiat)

```bash
# 1. Supprimer les logs
# 2. Ajouter compression
# 3. Supprimer délais
# 4. Réactiver memo
```

### Étape 2: Backend - SELECT * (Semaine 1)

```typescript
// Créer un script pour identifier tous les SELECT *
// backend/scripts/find-select-star.ts

// Remplacer progressivement dans chaque service:
// - users.service.ts
// - production.service.ts
// - marketplace.service.ts
// - etc.
```

### Étape 3: Frontend - Pagination (Semaine 1-2)

```typescript
// Implémenter pagination dans:
// - ProductionCheptelComponent.tsx
// - MarketplaceBuyTab.tsx
// - Autres listes longues
```

### Étape 4: Code Splitting (Semaine 2)

```typescript
// Implémenter lazy loading pour:
// - Écrans peu utilisés
// - Modals lourds
// - Composants conditionnels
```

---

## 📊 Métriques et Validation

### Métriques à Mesurer

**Frontend:**
- Temps de chargement initial (bundle)
- Temps de rendu des listes (100, 500, 1000 items)
- Taille des bundles (avant/après code splitting)
- Nombre de re-renders (React DevTools)

**Backend:**
- Temps de réponse moyen (p50, p95, p99)
- Taille des réponses (avant/après compression)
- Taux de cache hit
- Nombre de requêtes lentes (>1s)

**Base de Données:**
- Temps d'exécution des requêtes (EXPLAIN ANALYZE)
- Utilisation des index
- Taille des résultats (avant/après SELECT explicite)

### Outils de Validation

- **Frontend:** React DevTools Profiler, Flipper, Lighthouse
- **Backend:** New Relic, DataDog, Prometheus
- **Database:** `EXPLAIN ANALYZE`, `pg_stat_statements`

---

## ✅ Checklist d'Implémentation

### Phase 1: Quick Wins
- [ ] Supprimer logs de débogage dans `OverviewWidget.tsx`
- [ ] Ajouter compression HTTP dans `main.ts`
- [ ] Supprimer délais artificiels dans `useBuyerData.ts`
- [ ] Réactiver `React.memo` dans `OverviewWidget.tsx`

### Phase 2: Backend
- [ ] Créer script pour identifier `SELECT *`
- [ ] Remplacer dans `users.service.ts`
- [ ] Remplacer dans `production.service.ts`
- [ ] Remplacer dans `marketplace.service.ts`
- [ ] Remplacer dans `mortalites.service.ts`
- [ ] Remplacer dans `reports.service.ts`
- [ ] Remplacer dans autres services

### Phase 3: Frontend
- [ ] Implémenter pagination dans `ProductionCheptelComponent.tsx`
- [ ] Implémenter pagination dans `MarketplaceBuyTab.tsx`
- [ ] Implémenter code splitting dans `lazyScreens.ts`
- [ ] Optimiser Redux Persist avec transforms

### Phase 4: Infrastructure
- [ ] Configurer Redis
- [ ] Migrer `CacheService` vers Redis
- [ ] Configurer monitoring (Prometheus/DataDog)
- [ ] Vérifier compression d'images partout

---

## 🎯 Résultats Attendus

### Avant Optimisations

- **Bundle initial:** ~5-10 MB
- **Temps de chargement:** 3-5 secondes
- **Taille réponse API moyenne:** 50-200 KB
- **Requêtes lentes (>1s):** 5-10%
- **Cache hit rate:** 0% (cache mémoire perdu au redémarrage)

### Après Optimisations

- **Bundle initial:** ~2-3 MB (code splitting)
- **Temps de chargement:** 1-2 secondes
- **Taille réponse API moyenne:** 10-50 KB (compression + SELECT explicite)
- **Requêtes lentes (>1s):** <1%
- **Cache hit rate:** 60-80% (Redis)

---

## 📝 Notes Finales

### Bonnes Pratiques à Maintenir

1. **Audit régulier:** Vérifier les requêtes lentes chaque semaine
2. **Monitoring continu:** Alertes sur p95 > 500ms
3. **Code reviews:** Vérifier l'absence de `SELECT *` et logs de production
4. **Tests de charge:** Valider les optimisations sous charge réelle

### Prochaines Étapes

1. Implémenter Phase 1 (Quick Wins)
2. Mesurer l'impact
3. Implémenter Phase 2 (Backend + Frontend)
4. Mesurer l'impact
5. Décider de Phase 3 selon les besoins

---

**Document créé le:** 2025-01-XX  
**Dernière mise à jour:** 2025-01-XX  
**Auteur:** Analyse Automatique de Performance

