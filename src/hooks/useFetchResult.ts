'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/stores/messageStore';

export interface FetchResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

/**
 * Reactive data-fetching hook.
 * Re-fetches whenever `url` changes. Surfaces errors via the shared toast system
 * instead of swallowing them silently.
 *
 * @param url  URL to fetch, or null/undefined to skip fetching.
 * @param options.errorTitle  Human-readable toast title shown on failure.
 */
export function useFetchResult<T>(
  url: string | null | undefined,
  options?: { errorTitle?: string },
): FetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!url);
  const errorTitle = options?.errorTitle ?? 'Failed to load data';

  // Keep a stable ref to the latest errorTitle so the execute callback doesn't
  // need to be recreated when only the title changes.
  const errorTitleRef = useRef(errorTitle);
  errorTitleRef.current = errorTitle;

  const execute = useCallback(async (fetchUrl: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: T = await res.json();
      setData(json);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error(errorTitleRef.current, msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (url) {
      execute(url);
    } else {
      setData(null);
      setLoading(false);
      setError(null);
    }
  }, [url, execute]);

  const refetch = useCallback(() => {
    if (url) execute(url);
  }, [url, execute]);

  return { data, error, loading, refetch };
}
