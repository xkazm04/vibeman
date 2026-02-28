'use client';

import React, { useMemo } from 'react';
import type { WorkspaceProjectNode, IntegrationType } from '../sub_WorkspaceArchitecture/lib/types';
import type { FilteredCellData } from '../sub_WorkspaceArchitecture/lib/useMatrixCanvasData';
import { TIER_CONFIG } from '../sub_WorkspaceArchitecture/lib/types';
import { MATRIX_CONSTANTS } from '../sub_WorkspaceArchitecture/lib/matrixLayoutUtils';
import { INTEGRATION_COLORS } from './constants';
import { archTheme } from './lib/archTheme';
import type { HighlightRule } from './lib/highlightAlgebra';
import { useVirtualizedGrid } from './lib/useVirtualizedGrid';

interface MatrixGridProps {
  sortedNodes: WorkspaceProjectNode[];
  filteredMatrix: Map<string, FilteredCellData>;
  selectedCell: { sourceId: string; targetId: string } | null;
  hoveredCell: { sourceId: string; targetId: string } | null;
  onCellHover: (cell: { sourceId: string; targetId: string } | null) => void;
  onCellSelect: (cell: { sourceId: string; targetId: string } | null) => void;
  contentWidth: number;
  contentHeight: number;
  /** Optional highlight rule for blast radius visualization */
  highlightRule?: HighlightRule;
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
  highlightRule,
}: MatrixGridProps) {
  const { cellSize, labelOffset, headerHeight } = MATRIX_CONSTANTS;
  const nodeCount = sortedNodes.length;
  const { containerRef, visibleRowRange, visibleColRange } = useVirtualizedGrid(
    nodeCount, nodeCount, cellSize, labelOffset, headerHeight,
  );

  // Pre-filter visible nodes for headers
  const visibleColNodes = useMemo(
    () => sortedNodes.slice(visibleColRange.start, visibleColRange.end),
    [sortedNodes, visibleColRange.start, visibleColRange.end]
  );

  const visibleRowNodes = useMemo(
    () => sortedNodes.slice(visibleRowRange.start, visibleRowRange.end),
    [sortedNodes, visibleRowRange.start, visibleRowRange.end]
  );

  // Compute hovered row/col indices for crosshair highlight
  const hoveredIndices = useMemo(() => {
    if (!hoveredCell) return null;
    const rowIdx = sortedNodes.findIndex(n => n.id === hoveredCell.sourceId);
    const colIdx = sortedNodes.findIndex(n => n.id === hoveredCell.targetId);
    if (rowIdx === -1 || colIdx === -1) return null;
    return { rowIdx, colIdx };
  }, [hoveredCell, sortedNodes]);

  return (
    <div
      ref={containerRef}
      className="overflow-auto bg-zinc-900/30 rounded-lg border border-zinc-800/50 -p-2 transition-colors duration-200 hover:border-zinc-700/60"
      style={{ maxHeight: '100%', maxWidth: '100%' }}
    >
      <svg width={contentWidth} height={contentHeight}>
        {/* Crosshair highlight behind cells */}
        {hoveredIndices && (
          <>
            {/* Row highlight - full width */}
            <rect
              x={labelOffset}
              y={headerHeight + hoveredIndices.rowIdx * cellSize}
              width={sortedNodes.length * cellSize}
              height={cellSize - 2}
              fill="rgba(6,182,212,0.08)"
              rx={2}
              pointerEvents="none"
            />
            {/* Column highlight - full height */}
            <rect
              x={labelOffset + hoveredIndices.colIdx * cellSize}
              y={headerHeight}
              width={cellSize - 2}
              height={sortedNodes.length * cellSize}
              fill="rgba(6,182,212,0.08)"
              rx={2}
              pointerEvents="none"
            />
          </>
        )}

        {/* Column headers (rotated) - only render visible ones */}
        {visibleColNodes.map((node, localIndex) => {
          const globalIndex = visibleColRange.start + localIndex;
          const colHeaderWeight = highlightRule?.hasActiveHighlight()
            ? highlightRule.getWeight(node.id, 'node')
            : 0;
          const colHeaderDimmed = highlightRule?.hasActiveHighlight() && colHeaderWeight === 0;
          return (
            <g
              key={`col-${node.id}`}
              transform={`translate(${labelOffset + globalIndex * cellSize + cellSize / 2}, ${headerHeight - 8})`}
              style={{ opacity: colHeaderDimmed ? 0.3 : 1, transition: 'opacity 200ms ease-in-out' }}
            >
              <text
                transform="rotate(-45)"
                textAnchor="end"
                fill={TIER_CONFIG[node.tier].color}
                fontSize={9}
                fontWeight={colHeaderWeight >= 0.8 ? 700 : 500}
              >
                {node.name.slice(0, 12)}
              </text>
            </g>
          );
        })}

        {/* Row headers and cells - only render visible rows */}
        {visibleRowNodes.map((source, localRowIndex) => {
          const globalRow = visibleRowRange.start + localRowIndex;
          const rowHeaderWeight = highlightRule?.hasActiveHighlight()
            ? highlightRule.getWeight(source.id, 'node')
            : 0;
          const rowHeaderDimmed = highlightRule?.hasActiveHighlight() && rowHeaderWeight === 0;
          return (
            <g key={`row-${source.id}`} transform={`translate(0, ${headerHeight + globalRow * cellSize})`}>
              {/* Row header */}
              <text
                x={labelOffset - 10}
                y={cellSize / 2 + 3}
                textAnchor="end"
                fill={TIER_CONFIG[source.tier].color}
                fontSize={9}
                fontWeight={rowHeaderWeight >= 0.8 ? 700 : 500}
                style={{ opacity: rowHeaderDimmed ? 0.3 : 1, transition: 'opacity 200ms ease-in-out' }}
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
                const isSelected = selectedCell?.sourceId === source.id && selectedCell?.targetId === target.id;
                const isHovered = hoveredCell?.sourceId === source.id && hoveredCell?.targetId === target.id;
                const isActive = isSelected || isHovered;

                // Blast radius: cell weight is the minimum of source and target node weights
                const hasBlastRadius = highlightRule?.hasActiveHighlight();
                const blastWeight = hasBlastRadius
                  ? Math.min(
                      highlightRule!.getWeight(source.id, 'node'),
                      highlightRule!.getWeight(target.id, 'node')
                    )
                  : 0;
                const isInBlastRadius = hasBlastRadius && blastWeight > 0;
                const isDimmedByBlast = hasBlastRadius && !isInBlastRadius && !isActive;

                // Graduated blast radius fill colors (red-orange heat map matching impact mode)
                const blastFill = isInBlastRadius && !isActive
                  ? blastWeight >= 1   ? 'rgba(239,68,68,0.35)'   // origin — red
                  : blastWeight >= 0.8 ? 'rgba(249,115,22,0.28)'  // direct — orange
                  : blastWeight >= 0.5 ? 'rgba(234,179,8,0.20)'   // second — yellow
                  :                      'rgba(234,179,8,0.12)'    // third — faint yellow
                  : null;

                const cellFill = isSelected
                  ? archTheme.surface.active
                  : isHovered
                    ? 'rgba(6,182,212,0.15)'
                    : blastFill ?? archTheme.surface.card;
                const cellStroke = isSelected
                  ? archTheme.indicator.activeBorder
                  : isHovered
                    ? 'rgba(34,211,238,0.4)'
                    : isInBlastRadius
                      ? blastWeight >= 0.8 ? 'rgba(249,115,22,0.4)' : 'rgba(234,179,8,0.25)'
                      : 'transparent';
                const cellStrokeWidth = isActive || isInBlastRadius ? 1 : 0;
                const cellOpacity = isDimmedByBlast ? 0.3 : 1;

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
                    style={{ cursor: cellData ? 'pointer' : 'default', opacity: cellOpacity, transition: 'opacity 200ms ease-in-out' }}
                  >
                    <rect
                      x={labelOffset + globalCol * cellSize}
                      y={0}
                      width={cellSize - 2}
                      height={cellSize - 2}
                      fill={cellFill}
                      stroke={cellStroke}
                      strokeWidth={cellStrokeWidth}
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
                              opacity={isActive ? 1 : isInBlastRadius ? 0.9 : 0.7}
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
