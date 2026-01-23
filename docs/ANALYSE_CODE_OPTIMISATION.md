# 🔍 Analyse d'Optimisation du Codebase

**Date:** 23 Janvier 2026  
**Portée:** Frontend (React Native) + Backend (NestJS)

---

## 📊 Statistiques Globales

| Métrique | Valeur | Impact |
|----------|--------|--------|
| Console.log/warn/error | **680** | 🔴 Production |
| TODO/FIXME | **76** | 🟡 Dette technique |
| Appels apiClient | **573** | 🟡 À optimiser |
| useEffect | **269** | 🟡 Re-renders potentiels |
| fetch/axios directs | **30** | 🟡 Non centralisé |
| Logs de debug backend | **6** | 🔴 À supprimer |

---

## 🐛 CODE MORT / OBSOLÈTE À SUPPRIMER

### 1. Logs de debug backend (CRITIQUE)

**Fichier:** `backend/src/marketplace/marketplace.controller.ts`

```typescript
// À SUPPRIMER - Logs de debug vers localhost:7242
fetch('http://127.0.0.1:7242/ingest/...')
```

**Lignes:** 442, 449, 456

---

### 2. Fichiers potentiellement obsolètes

| Fichier | Raison | Action |
|---------|--------|--------|
| `src/utils/textRenderingScanner.ts` | Marqué deprecated | Vérifier usage |
| `src/services/database.ts` | Possible doublon | Vérifier vs DatabaseService |
| `src/database/repositories/MarketplaceRepositories.ts` | Ancien système | Migrer vers MarketplaceService |

---

### 3. Console.log à supprimer en production

**Fichiers les plus critiques (>10 logs):**

| Fichier | Logs | Priorité |
|---------|------|----------|
| `screens/marketplace/MarketplaceScreen.tsx` | 28 | 🔴 Haute |
| `components/FinanceGraphiquesComponent.tsx` | 22 | 🔴 Haute |
| `scripts/migrateUsersToMultiRole.ts` | 18 | Script OK |
| `database/repositories/FinanceRepository.ts` | 15 | 🟡 Backend |
| `database/repositories/BaseRepository.ts` | 15 | 🟡 Backend |

---

## ⚡ PROBLÈMES DE RE-RENDERS

### 1. useEffect sans dépendances correctes

**Pattern problématique:**
```typescript
// ❌ eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  loadData();
}, [someVar]); // Dépendances manquantes
```

**Fichiers concernés:**
- `src/screens/WeighingScreen.tsx` (lignes 545-560)
- `src/screens/SaleScreen.tsx` (ligne 186)
- `src/screens/MortalityScreen.tsx` (ligne 353)
- `src/screens/DiseaseScreen.tsx` (ligne 342)

### 2. Hooks avec objets dans les dépendances

**Pattern problématique:**
```typescript
// ❌ Crée une nouvelle référence à chaque render
const options = { projetId, limit: 10 };
useEffect(() => {}, [options]); // Re-render infini
```

---

## 🌐 APPELS API REDONDANTS

### 1. Appels multiples au même endpoint

**MarketplaceScreen.tsx:**
```typescript
// ❌ loadListings() appelé 4 fois dans différents useEffect
useEffect(() => { loadListings(); }, [tab]);
useEffect(() => { loadListings(); }, [filters]);
useEffect(() => { loadListings(); }, [sort]);
```

**Solution:** Debounce + consolidation

### 2. Appels non cachés

| Endpoint | Fréquence | Cache actuel |
|----------|-----------|--------------|
| `/production-animaux` | Chaque écran | ✅ Redux |
| `/marketplace/listings` | Chaque tab | ❌ Aucun |
| `/batch-weighings/batch/:id` | Chaque visite | ❌ Aucun |
| `/finance/depenses` | Chaque écran | ✅ Redux |

### 3. Bonnes pratiques existantes ✅

- `useFinanceData` - Cache 5 secondes ✅
- `useProductionData` - Cache 5 secondes ✅
- `useDashboardData` - Cache 30 secondes ✅
- `useApiCache` - Hook générique ✅

---

## 🔧 OPTIMISATIONS RECOMMANDÉES

### Priorité 1: Supprimer les logs de debug

```bash
# Backend: Supprimer les fetch de debug
grep -rn "fetch('http://127.0.0.1:7242" backend/src --include="*.ts"
```

### Priorité 2: Centraliser les appels API marketplace

```typescript
// Créer un hook useMarketplaceData similaire à useFinanceData
export function useMarketplaceData() {
  const dernierChargementRef = useRef<number>(0);
  const CACHE_DURATION = 10000; // 10 secondes
  
  const loadListings = useCallback(async () => {
    const now = Date.now();
    if (now - dernierChargementRef.current < CACHE_DURATION) {
      return; // Utiliser le cache
    }
    // ...
  }, []);
}
```

### Priorité 3: Utiliser les hooks d'optimisation

```typescript
// Hook useDebounce - pour valeurs (recherche)
const debouncedSearch = useDebounce(searchQuery, 300);

// Hook useThrottle - pour événements fréquents (scroll)
const throttledScrollY = useThrottle(scrollY, 100);

// Hook useThrottledCallback - pour fonctions
const throttledOnScroll = useThrottledCallback(onScroll, 100);

// Hook useMemoizedApiCall - pour appels API avec cache
const { data, loading, refresh } = useMemoizedApiCall(
  () => apiClient.get('/endpoint'),
  { cacheKey: 'my-data', ttl: 60000 }
);

// Hook useMarketplaceData - pour données marketplace
const { listings, loadListingsDebounced } = useMarketplaceData({
  cacheDuration: 30000,
  autoLoad: true,
});
```

### Priorité 4: Console.log auto-supprimés en production

✅ **Configuré via babel.config.js**

```typescript
// En production, tous les console.log sont automatiquement supprimés
// Seuls console.error et console.warn sont conservés
```

---

## 📁 FICHIERS À NETTOYER

### Frontend (src/)

| Fichier | Action | Priorité |
|---------|--------|----------|
| `screens/marketplace/MarketplaceScreen.tsx` | Supprimer 28 console.log | 🔴 |
| `components/FinanceGraphiquesComponent.tsx` | Supprimer 22 console.log | 🔴 |
| `utils/textRenderingScanner.ts` | Vérifier si utilisé | 🟡 |
| `services/database.ts` | Vérifier si doublon | 🟡 |

### Backend (backend/src/)

| Fichier | Action | Priorité |
|---------|--------|----------|
| `marketplace/marketplace.controller.ts` | Supprimer 6 fetch debug | 🔴 |

---

## 🎯 ACTIONS IMMÉDIATES

1. ✅ **Supprimer les logs de debug backend** (6 lignes) - FAIT
2. ✅ **Configurer babel pour supprimer console.log en prod** - FAIT
3. ✅ **Créer hook useMarketplaceData optimisé** - FAIT
4. 📝 **Auditer les TODO/FIXME** (voir ci-dessous)

---

## 📝 TODO/FIXME À TRAITER

### Priorité Haute (fonctionnalité manquante)

| Fichier | Ligne | Description |
|---------|-------|-------------|
| `MarketplaceScreen.tsx` | 1206 | Modal détails demande d'achat |
| `MarketplaceScreen.tsx` | 1220 | Modal répondre à demande |
| `MarketplaceScreen.tsx` | 1231 | Modal détails demande |
| `MarketplaceService.ts` | 873 | Mise à jour statut après vente |

### Priorité Moyenne (amélioration)

| Fichier | Ligne | Description |
|---------|-------|-------------|
| `DashboardVetScreen.tsx` | 283, 501 | Navigation notifications |
| `DashboardTechScreen.tsx` | 302 | Navigation notifications |
| `CollaborationsScreen.tsx` | 309, 370 | Paramètres et détails projet |

### Priorité Basse (dette technique)

| Fichier | Ligne | Description |
|---------|-------|-------------|
| `collaborationSlice.ts` | 55, 121 | Sync vetProfile côté backend |
| `apiClient.ts` | 362 | Retirer fallback après migration |
| `ChatAgentAPI.ts` | 26 | Intégrer vraie API |

---

## 🗑️ CODE DEPRECATED À NETTOYER

| Service | Statut | Utilisé par | Action |
|---------|--------|-------------|--------|
| `ChatAgentService` | @deprecated | Tests uniquement | Garder pour tests |
| `getDatabase()` | @deprecated | Tests uniquement | Garder pour compatibilité |
| `buyerId` (PurchaseRequest) | @deprecated | Transition vers senderId | Migrer progressivement |

---

## 📈 MÉTRIQUES CIBLES

| Métrique | Actuel | Cible | Statut |
|----------|--------|-------|--------|
| Console.log en prod | 680 | 0 (auto-supprimés) | ✅ Configuré |
| Logs debug backend | 6 | 0 | ✅ Supprimés |
| Appels API redondants | ~30% | <5% | 🔄 Hook créé |
| Re-renders inutiles | Non mesuré | Baseline à établir | 📝 À mesurer |
| Temps de chargement dashboard | Non mesuré | <2s | 📝 À mesurer |

