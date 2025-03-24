// File location: lib/hooks/useApi.ts
import { useState, useEffect, useCallback } from 'react';

interface UseApiOptions {
  initialData?: any;
  autoFetch?: boolean;
}

/**
 * Custom hook to handle API requests with loading, error and data states
 * @param url API endpoint URL
 * @param options Configuration options
 * @returns Object containing data, loading state, error state, and refetch function
 */
export function useApi<T>(url: string, options: UseApiOptions = {}) {
  const { initialData = null, autoFetch = true } = options;
  
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(autoFetch);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch data from the provided URL
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error(`Error fetching from ${url}:`, err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setIsLoading(false);
    }
  }, [url]);
  
  // Refetch function to manually trigger a new data fetch
  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);
  
  // Effect to fetch data on mount if autoFetch is true
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);
  
  return { data, isLoading, error, refetch };
}

/**
 * Custom hook to handle API requests with query parameters
 * @param baseUrl Base API endpoint URL
 * @param options Configuration options
 * @returns Object containing data, loading state, error state, and functions to fetch with params
 */
export function useApiWithParams<T>(baseUrl: string, options: UseApiOptions = {}) {
  const { initialData = null, autoFetch = false } = options;
  
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchDataWithParams = useCallback(async (params?: Record<string, string | number | boolean>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Create URL with query parameters
      const url = new URL(baseUrl, window.location.origin);
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
      }
      
      // Fetch data
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
      
      return result;
    } catch (err) {
      console.error(`Error fetching from ${baseUrl}:`, err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl]);
  
  // Simple refetch using current parameters
  const refetchData = useCallback(() => {
    fetchDataWithParams();
  }, [fetchDataWithParams]);
  
  // Effect to fetch data on mount if autoFetch is true
  useEffect(() => {
    if (autoFetch) {
      fetchDataWithParams();
    }
  }, [autoFetch, fetchDataWithParams]);
  
  return { data, isLoading, error, fetchDataWithParams, refetchData };
}