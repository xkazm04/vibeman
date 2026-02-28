import { useRef, useState, useCallback, useEffect, useMemo } from 'react';

/** Visible range for a single axis (row or column) */
export interface VisibleRange {
  start: number;
  end: number;
}

/** Result returned by useVirtualizedGrid */
export interface VirtualizedGridResult {
  /** Ref to attach to the scrollable container element */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Visible row range (start inclusive, end exclusive) */
  visibleRowRange: VisibleRange;
  /** Visible column range (start inclusive, end exclusive) */
  visibleColRange: VisibleRange;
}

// Buffer cells to render outside viewport for smooth scrolling
const BUFFER_CELLS = 2;

/**
 * Calculate visible range of cells based on scroll position and viewport size
 */
function getVisibleRange(
  scrollPos: number,
  viewportSize: number,
  cellSize: number,
  totalCount: number,
  offset: number = 0
): VisibleRange {
  const adjustedScrollPos = Math.max(0, scrollPos - offset);
  const startCell = Math.floor(adjustedScrollPos / cellSize);
  const start = Math.max(0, startCell - BUFFER_CELLS);

  const visibleCells = Math.ceil(viewportSize / cellSize);
  const end = Math.min(totalCount, startCell + visibleCells + BUFFER_CELLS * 2);

  return { start, end };
}

/**
 * Reusable hook for viewport culling in grid-based visualizations.
 * Tracks scroll position and container size, returning which rows/columns
 * are currently visible (with buffer for smooth scrolling).
 */
export function useVirtualizedGrid(
  totalRows: number,
  totalCols: number,
  cellSize: number,
  /** Pixel offset before the first column (e.g. row label width) */
  colOffset: number = 0,
  /** Pixel offset before the first row (e.g. column header height) */
  rowOffset: number = 0,
): VirtualizedGridResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ scrollLeft: 0, scrollTop: 0, width: 0, height: 0 });

  const updateScrollState = useCallback(() => {
    if (containerRef.current) {
      const { scrollLeft, scrollTop, clientWidth, clientHeight } = containerRef.current;
      setScrollState({ scrollLeft, scrollTop, width: clientWidth, height: clientHeight });
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    updateScrollState();

    container.addEventListener('scroll', updateScrollState, { passive: true });

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', updateScrollState);
      resizeObserver.disconnect();
    };
  }, [updateScrollState]);

  const { visibleRowRange, visibleColRange } = useMemo(() => {
    const visibleColRange = getVisibleRange(
      scrollState.scrollLeft,
      scrollState.width,
      cellSize,
      totalCols,
      colOffset,
    );

    const visibleRowRange = getVisibleRange(
      scrollState.scrollTop,
      scrollState.height,
      cellSize,
      totalRows,
      rowOffset,
    );

    return { visibleRowRange, visibleColRange };
  }, [scrollState, totalRows, totalCols, cellSize, colOffset, rowOffset]);

  return { containerRef, visibleRowRange, visibleColRange };
}
