import { useState, useCallback } from 'react';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: any[]) => Promise<T>;
  reset: () => void;
}

export function useAsync<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  immediate = false
): UseAsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (...args: any[]) => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [asyncFunction]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}

interface UseFormState<T> {
  values: T;
  errors: Record<string, string>;
  loading: boolean;
  setValue: (field: keyof T, value: any) => void;
  setError: (field: keyof T, error: string) => void;
  clearError: (field: keyof T) => void;
  clearAllErrors: () => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export function useFormState<T extends Record<string, any>>(
  initialValues: T
): UseFormState<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const setValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const setError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const clearError = useCallback((field: keyof T) => {
    setErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setLoading(false);
  }, [initialValues]);

  return {
    values,
    errors,
    loading,
    setValue,
    setError,
    clearError,
    clearAllErrors,
    setLoading,
    reset,
  };
}

interface UseRetryState {
  retryCount: number;
  maxRetries: number;
  canRetry: boolean;
  retry: () => void;
  resetRetry: () => void;
}

export function useRetry(maxRetries = 3): UseRetryState {
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  const resetRetry = useCallback(() => {
    setRetryCount(0);
  }, []);

  const canRetry = retryCount < maxRetries;

  return {
    retryCount,
    maxRetries,
    canRetry,
    retry,
    resetRetry,
  };
}

interface UseNetworkState {
  isOnline: boolean;
  isSlowConnection: boolean;
}

export function useNetworkState(): UseNetworkState {
  const [isOnline, setIsOnline] = useState(true);
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  // Note: In a real app, you would use NetInfo from @react-native-community/netinfo
  // For now, we'll simulate the state
  useState(() => {
    // Simulate network state changes
    const interval = setInterval(() => {
      setIsOnline(Math.random() > 0.1); // 90% chance of being online
      setIsSlowConnection(Math.random() > 0.7); // 30% chance of slow connection
    }, 5000);

    return () => clearInterval(interval);
  });

  return { isOnline, isSlowConnection };
}
