/**
 * Utilitaires d'optimisation de performance
 * Fournit des helpers pour mémoïser les composants et optimiser les rendus
 */

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import type { ComponentType, PropsWithChildren } from 'react';

/**
 * Wrapper pour mémoïser un composant d'écran avec des props de navigation
 */
export function memoizeScreen<P extends object>(
  Component: ComponentType<P>,
  displayName?: string
): ComponentType<P> {
  const MemoizedComponent = React.memo(Component) as ComponentType<P>;
  if (displayName) {
    MemoizedComponent.displayName = displayName;
  }
  return MemoizedComponent;
}

/**
 * Hook pour optimiser les callbacks avec debouncing
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
  deps: React.DependencyList = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedCallback = useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay, ...deps]
  );

  return debouncedCallback;
}

/**
 * Hook pour optimiser les calculs coûteux avec cache
 */
export function useCachedMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  cacheKey?: string
): T {
  const cacheRef = useRef<Map<string, T>>(new Map());
  const prevDepsRef = useRef<React.DependencyList>([]);

  return useMemo(() => {
    const key = cacheKey || JSON.stringify(deps);
    
    // Vérifier si les dépendances ont changé
    const depsChanged = deps.some((dep, index) => dep !== prevDepsRef.current[index]);
    
    if (!depsChanged && cacheRef.current.has(key)) {
      return cacheRef.current.get(key)!;
    }

    const value = factory();
    cacheRef.current.set(key, value);
    prevDepsRef.current = deps;
    
    // Limiter la taille du cache à 50 entrées
    if (cacheRef.current.size > 50) {
      const firstKey = cacheRef.current.keys().next().value;
      cacheRef.current.delete(firstKey);
    }

    return value;
  }, deps);
}

/**
 * Hook pour précharger des données de manière intelligente
 */
export function usePreloadData<T>(
  loadFn: () => Promise<T>,
  shouldPreload: boolean = true,
  cacheTime: number = 5 * 60 * 1000 // 5 minutes par défaut
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  preload: () => Promise<void>;
} {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const cacheRef = useRef<{ data: T; timestamp: number } | null>(null);
  const loadingRef = useRef(false);

  const preload = useCallback(async () => {
    // Vérifier le cache
    if (cacheRef.current) {
      const age = Date.now() - cacheRef.current.timestamp;
      if (age < cacheTime) {
        setData(cacheRef.current.data);
        return;
      }
    }

    // Éviter les requêtes multiples simultanées
    if (loadingRef.current) {
      return;
    }

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      const result = await loadFn();
      
      cacheRef.current = {
        data: result,
        timestamp: Date.now(),
      };
      
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [loadFn, cacheTime]);

  useEffect(() => {
    if (shouldPreload) {
      preload();
    }
  }, [shouldPreload, preload]);

  return { data, loading, error, preload };
}

/**
 * Hook pour optimiser les FlatList avec des props par défaut
 */
export function useOptimizedFlatListProps<T>({
  itemHeight,
  estimatedItemSize,
}: {
  itemHeight?: number;
  estimatedItemSize?: number;
}) {
  return useMemo(
    () => ({
      // Optimisations de performance
      removeClippedSubviews: true,
      maxToRenderPerBatch: 10,
      windowSize: 5,
      initialNumToRender: 10,
      updateCellsBatchingPeriod: 50,
      
      // getItemLayout pour items de taille fixe
      ...(itemHeight && {
        getItemLayout: (_: any, index: number) => ({
          length: itemHeight,
          offset: itemHeight * index,
          index,
        }),
      }),
      
      // estimatedItemSize pour items de taille variable
      ...(estimatedItemSize && !itemHeight && {
        estimatedItemSize,
      }),
    }),
    [itemHeight, estimatedItemSize]
  );
}

/**
 * Composant wrapper pour optimiser les rendus conditionnels
 */
export const OptimizedConditionalRender: React.FC<
  PropsWithChildren<{
    condition: boolean;
    fallback?: React.ReactNode;
  }>
> = React.memo(({ condition, children, fallback = null }) => {
  return condition ? <>{children}</> : <>{fallback}</>;
});

OptimizedConditionalRender.displayName = 'OptimizedConditionalRender';

