/**
 * Hook React pour utiliser les Feature Flags
 *
 * @example
 * ```typescript
 * const { isEnabled, isLoading } = useFeatureFlag('new_dashboard', { userId: 'user-123' });
 *
 * if (isEnabled) {
 *   return <NewDashboard />;
 * }
 * return <OldDashboard />;
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { getFeatureFlagsService, UserContext } from '../services/FeatureFlagsService';
import { useAppSelector } from '../store/hooks';
import { useRole } from '../contexts/RoleContext';

export interface UseFeatureFlagOptions {
  userId?: string | null;
  role?: string;
  email?: string;
  customAttributes?: Record<string, unknown>;
}

export interface UseFeatureFlagResult {
  isEnabled: boolean;
  value: unknown;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook pour vérifier si un feature flag est activé
 */
export function useFeatureFlag(
  flagKey: string,
  options?: UseFeatureFlagOptions
): UseFeatureFlagResult {
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [value, setValue] = useState<unknown>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Récupérer le contexte utilisateur depuis Redux si disponible
  const currentUser = useAppSelector((state) => state.auth.user);
  const { activeRole } = useRole();

  const loadFlag = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const service = getFeatureFlagsService();

      // Construire le contexte utilisateur
      const context: UserContext = {
        userId: options?.userId ?? currentUser?.id ?? null,
        role: options?.role ?? activeRole ?? undefined,
        email: options?.email ?? currentUser?.email ?? undefined,
        customAttributes: options?.customAttributes,
      };

      const flagValue = await service.getFlagValue(flagKey, context);
      const enabled = Boolean(flagValue);

      setValue(flagValue);
      setIsEnabled(enabled);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur inconnue');
      setError(error);
      setIsEnabled(false);
      setValue(false);
    } finally {
      setIsLoading(false);
    }
  }, [
    flagKey,
    options?.userId,
    options?.role,
    options?.email,
    options?.customAttributes,
    currentUser?.id,
    currentUser?.email,
    activeRole,
  ]);

  useEffect(() => {
    loadFlag();
  }, [loadFlag]);

  return {
    isEnabled,
    value,
    isLoading,
    error,
    refresh: loadFlag,
  };
}

/**
 * Hook pour récupérer plusieurs feature flags à la fois
 */
export function useFeatureFlags(
  flagKeys: string[],
  options?: UseFeatureFlagOptions
): Record<string, UseFeatureFlagResult> {
  const currentUser = useAppSelector((state) => state.auth.user);
  const { activeRole } = useRole();

  const results: Record<string, UseFeatureFlagResult> = {};

  flagKeys.forEach((key) => {
    results[key] = useFeatureFlag(key, options);
  });

  return results;
}

/**
 * Hook pour récupérer la variante d'un test A/B
 */
export function useABTest(
  testKey: string,
  options?: UseFeatureFlagOptions
): {
  variant: string;
  value: unknown;
  isLoading: boolean;
  error: Error | null;
} {
  const { value, isLoading, error } = useFeatureFlag(testKey, options);

  // Extraire le nom de la variante depuis la valeur
  const variant = typeof value === 'string' ? value : 'control';

  return {
    variant,
    value,
    isLoading,
    error,
  };
}
