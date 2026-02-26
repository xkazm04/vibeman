'use client';

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import type { WorkspaceProjectNode, IntegrationType } from '../sub_WorkspaceArchitecture/lib/types';
import type { FilteredCellData } from '../sub_WorkspaceArchitecture/lib/useMatrixCanvasData';
import { TIER_CONFIG } from '../sub_WorkspaceArchitecture/lib/types';
import { MATRIX_CONSTANTS } from '../sub_WorkspaceArchitecture/lib/matrixLayoutUtils';
import { INTEGRATION_COLORS } from './constants';
import { archTheme } from './lib/archTheme';

interface MatrixGridProps {
  sortedNodes: WorkspaceProjectNode[];
  filteredMatrix: Map<string, FilteredCellData>;
  selectedCell: { sourceId: string; targetId: string } | null;
  hoveredCell: { sourceId: string; targetId: string } | null;
  onCellHover: (cell: { sourceId: string; targetId: string } | null) => void;
  onCellSelect: (cell: { sourceId: string; targetId: string } | null) => void;
  contentWidth: number;
  contentHeight: number;
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
): { start: number; end: number } {
  // Calculate first visible cell (accounting for offset like headers)
  const adjustedScrollPos = Math.max(0, scrollPos - offset);
  const startCell = Math.floor(adjustedScrollPos / cellSize);
  const start = Math.max(0, startCell - BUFFER_CELLS);

  // Calculate last visible cell
  const visibleCells = Math.ceil(viewportSize / cellSize);
  const end = Math.min(totalCount, startCell + visibleCells + BUFFER_CELLS * 2);

  return { start, end };
}

export default function MatrixGrid({
  sortedNodes,
  filteredMatrix,
  selectedCell,
  hoveredCell,
  onCellHover,
  onCellSelect,
  contentWidth,
  contentHeight,
}: MatrixGridProps) {
  const { cellSize, labelOffset, headerHeight } = MATRIX_CONSTANTS;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = useState({ scrollLeft: 0, scrollTop: 0, width: 0, height: 0 });

  // Update scroll state on scroll or resize
  const updateScrollState = useCallback(() => {
    if (containerRef.current) {
      const { scrollLeft, scrollTop, clientWidth, clientHeight } = containerRef.current;
      setScrollState({ scrollLeft, scrollTop, width: clientWidth, height: clientHeight });
    }
  }, []);

  // Set up scroll and resize listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial state
    updateScrollState();

    // Listen for scroll
    container.addEventListener('scroll', updateScrollState, { passive: true });

    // Listen for resize
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', updateScrollState);
      resizeObserver.disconnect();
    };
  }, [updateScrollState]);

  // Calculate visible row and column ranges
  const { visibleRowRange, visibleColRange } = useMemo(() => {
    const nodeCount = sortedNodes.length;

    // Columns (horizontal scrolling)
    const visibleColRange = getVisibleRange(
      scrollState.scrollLeft,
      scrollState.width,
      cellSize,
      nodeCount,
      labelOffset
    );

    // Rows (vertical scrolling)
    const visibleRowRange = getVisibleRange(
      scrollState.scrollTop,
      scrollState.height,
      cellSize,
      nodeCount,
      headerHeight
    );

    return { visibleRowRange, visibleColRange };
  }, [scrollState, sortedNodes.length, cellSize, labelOffset, headerHeight]);

  // Pre-filter visible nodes for headers
  const visibleColNodes = useMemo(
    () => sortedNodes.slice(visibleColRange.start, visibleColRange.end),
    [sortedNodes, visibleColRange.start, visibleColRange.end]
  );

  const visibleRowNodes = useMemo(
    () => sortedNodes.slice(visibleRowRange.start, visibleRowRange.end),
    [sortedNodes, visibleRowRange.start, visibleRowRange.end]
  );

  return (
    <div
      ref={containerRef}
      className="overflow-auto bg-zinc-900/30 rounded-lg border border-zinc-800/50 -p-2 transition-colors duration-200 hover:border-zinc-700/60"
      style={{ maxHeight: '100%', maxWidth: '100%' }}
    >
      <svg width={contentWidth} height={contentHeight}>
        {/* Column headers (rotated) - only render visible ones */}
        {visibleColNodes.map((node, localIndex) => {
          const globalIndex = visibleColRange.start + localIndex;
          return (
            <g
              key={`col-${node.id}`}
              transform={`translate(${labelOffset + globalIndex * cellSize + cellSize / 2}, ${headerHeight - 8})`}
            >
              <text
                transform="rotate(-45)"
                textAnchor="end"
                fill={TIER_CONFIG[node.tier].color}
                fontSize={9}
                fontWeight={500}
              >
                {node.name.slice(0, 12)}
              </text>
            </g>
          );
        })}

        {/* Row headers and cells - only render visible rows */}
        {visibleRowNodes.map((source, localRowIndex) => {
          const globalRow = visibleRowRange.start + localRowIndex;
          return (
            <g key={`row-${source.id}`} transform={`translate(0, ${headerHeight + globalRow * cellSize})`}>
              {/* Row header */}
              <text
                x={labelOffset - 10}
                y={cellSize / 2 + 3}
                textAnchor="end"
                fill={TIER_CONFIG[source.tier].color}
                fontSize={9}
                fontWeight={500}
              >
                {source.name.slice(0, 10)}
              </text>

              {/* Cells - only render visible columns */}
              {visibleColNodes.map((target, localColIndex) => {
                const globalCol = visibleColRange.start + localColIndex;

                if (source.id === target.id) {
                  return (
                    <rect
                      key={`cell-${source.id}-${target.id}`}
                      x={labelOffset + globalCol * cellSize}
                      y={0}
                      width={cellSize - 2}
                      height={cellSize - 2}
                      fill={archTheme.surface.muted}
                      rx={3}
                    />
                  );
                }

                const cellData = filteredMatrix.get(`${source.id}-${target.id}`);
                const isActive =
                  (selectedCell?.sourceId === source.id && selectedCell?.targetId === target.id) ||
                  (hoveredCell?.sourceId === source.id && hoveredCell?.targetId === target.id);

                return (
                  <g
                    key={`cell-${source.id}-${target.id}`}
                    onMouseEnter={() => onCellHover({ sourceId: source.id, targetId: target.id })}
                    onMouseLeave={() => onCellHover(null)}
                    onClick={() =>
                      onCellSelect(
                        selectedCell?.sourceId === source.id && selectedCell?.targetId === target.id
                          ? null
                          : { sourceId: source.id, targetId: target.id }
                      )
                    }
                    style={{ cursor: cellData ? 'pointer' : 'default' }}
                  >
                    <rect
                      x={labelOffset + globalCol * cellSize}
                      y={0}
                      width={cellSize - 2}
                      height={cellSize - 2}
                      fill={isActive ? archTheme.surface.active : archTheme.surface.card}
                      stroke={isActive ? archTheme.indicator.activeBorder : 'transparent'}
                      strokeWidth={isActive ? 1.5 : 0}
                      rx={3}
                    />
                    {cellData && (
                      <>
                        {cellData.types.map((type, i) => (
                            <circle
                              key={type}
                              cx={labelOffset + globalCol * cellSize + cellSize / 2 - 5 + i * 5}
                              cy={cellSize / 2}
                              r={3.5}
                              fill={INTEGRATION_COLORS[type]}
                              opacity={isActive ? 1 : 0.7}
                            />
                          ))}
                      </>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
