/**
 * Hooks d'optimisation des performances
 * 
 * Ces hooks aident à réduire les re-renders inutiles et optimiser les appels API.
 */

// Debounce - pour retarder les mises à jour (recherche, filtres)
export { useDebounce } from '../useDebounce';

// Throttle - pour limiter la fréquence des mises à jour (scroll, resize)
export { useThrottle, useThrottledCallback } from '../useThrottle';

// Cache API - pour mémoriser les appels API avec déduplication
export { 
  useMemoizedApiCall, 
  invalidateAllCache, 
  invalidateCacheByPattern 
} from '../useMemoizedApiCall';

// Marketplace optimisé - cache + debounce spécifique au marketplace
export { useMarketplaceData } from '../useMarketplaceData';

// Cache générique existant
export { useApiCache } from '../useApiCache';
