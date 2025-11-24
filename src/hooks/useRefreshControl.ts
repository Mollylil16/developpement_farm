/**
 * Hook personnalisé pour gérer le pull-to-refresh de manière standard
 * À utiliser dans tous les écrans
 */

import { useState, useCallback } from 'react';
import { useAppDispatch } from '../store/hooks';

interface UseRefreshControlOptions {
  onRefresh?: () => Promise<void> | void;
}

export function useRefreshControl(options?: UseRefreshControlOptions) {
  const [refreshing, setRefreshing] = useState(false);
  const dispatch = useAppDispatch();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (options?.onRefresh) {
        await options.onRefresh();
      }
    } catch (error) {
      console.error('Erreur lors du refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [options?.onRefresh]);

  return {
    refreshing,
    onRefresh,
  };
}

