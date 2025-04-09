import { useState, useCallback } from 'react';
import { withTimeout } from '../utils/asyncUtils';

type AsyncFunction<T> = (...args: any[]) => Promise<T>;

export function useSafeAsync<T>(
  asyncFunction: AsyncFunction<T>,
  onError?: (error: Error) => void,
  timeout?: number
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<T | null>(null);

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Use timeout para evitar promises que nunca resolvem
        const data = await withTimeout(
          asyncFunction(...args),
          timeout || 15000,
          'Operação demorou muito tempo para completar'
        );
        
        setResult(data);
        return data;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        if (onError) {
          onError(error);
        }
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [asyncFunction, onError, timeout]
  );

  return { execute, isLoading, error, result };
}
