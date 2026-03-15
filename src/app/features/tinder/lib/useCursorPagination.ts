/**
 * Utility hook for keyset cursor pagination.
 * Manages the loading guard ref and cursor ref shared by local and remote modes.
 * Both useLocalMode and useRemoteMode consume this hook for consistent pagination state.
 */
import { useCallback, useRef } from 'react';

interface UseCursorPaginationOptions {
  hasMore: boolean;
  itemsLength: number;
  currentIndex: number;
  threshold?: number;
}

export interface UseCursorPaginationResult {
  /** Synchronous loading guard — prevents double-fetches on rapid swipe */
  loadingRef: React.MutableRefObject<boolean>;
  /** Keyset cursor — ID of the last item from the most recent server response */
  nextCursorRef: React.MutableRefObject<string | null>;
  /** Trigger `onLoadMore(cursor)` when within `threshold` items of the end */
  loadMoreIfNeeded: (onLoadMore: (cursor: string | null) => void) => void;
}

export function useCursorPagination({
  hasMore,
  itemsLength,
  currentIndex,
  threshold = 5,
}: UseCursorPaginationOptions): UseCursorPaginationResult {
  const loadingRef = useRef(false);
  const nextCursorRef = useRef<string | null>(null);

  const loadMoreIfNeeded = useCallback(
    (onLoadMore: (cursor: string | null) => void) => {
      if (currentIndex >= itemsLength - threshold && hasMore && !loadingRef.current) {
        onLoadMore(nextCursorRef.current);
      }
    },
    [currentIndex, itemsLength, hasMore, threshold],
  );

  return { loadingRef, nextCursorRef, loadMoreIfNeeded };
}
