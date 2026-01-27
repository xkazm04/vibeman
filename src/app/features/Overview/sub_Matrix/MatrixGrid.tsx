'use client';

import React from 'react';
import type { WorkspaceProjectNode, CrossProjectRelationship, IntegrationType } from '../sub_WorkspaceArchitecture/lib/types';
import { TIER_CONFIG, INTEGRATION_COLORS } from '../sub_WorkspaceArchitecture/lib/types';
import { MATRIX_CONSTANTS } from '../sub_WorkspaceArchitecture/lib/matrixLayoutUtils';

interface MatrixGridProps {
  sortedNodes: WorkspaceProjectNode[];
  matrix: Map<string, CrossProjectRelationship[]>;
  filterTypes: Set<IntegrationType>;
  selectedCell: { sourceId: string; targetId: string } | null;
  hoveredCell: { sourceId: string; targetId: string } | null;
  onCellHover: (cell: { sourceId: string; targetId: string } | null) => void;
  onCellSelect: (cell: { sourceId: string; targetId: string } | null) => void;
  contentWidth: number;
  contentHeight: number;
}

export default function MatrixGrid({
  sortedNodes,
  matrix,
  filterTypes,
  selectedCell,
  hoveredCell,
  onCellHover,
  onCellSelect,
  contentWidth,
  contentHeight,
}: MatrixGridProps) {
  const { cellSize, labelOffset, headerHeight } = MATRIX_CONSTANTS;

  return (
    <div className="overflow-auto bg-zinc-900/30 rounded-lg border border-zinc-800/50 -p-2">
      <svg width={contentWidth} height={contentHeight}>
        {/* Column headers (rotated) */}
        {sortedNodes.map((node, i) => (
          <g
            key={`col-${node.id}`}
            transform={`translate(${labelOffset + i * cellSize + cellSize / 2}, ${headerHeight - 8})`}
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
        ))}

        {/* Row headers and cells */}
        {sortedNodes.map((source, row) => (
          <g key={`row-${source.id}`} transform={`translate(0, ${headerHeight + row * cellSize})`}>
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

            {/* Cells */}
            {sortedNodes.map((target, col) => {
              if (source.id === target.id) {
                return (
                  <rect
                    key={`cell-${source.id}-${target.id}`}
                    x={labelOffset + col * cellSize}
                    y={0}
                    width={cellSize - 2}
                    height={cellSize - 2}
                    fill="#1a1a1a"
                    rx={3}
                  />
                );
              }

              const connections = matrix.get(`${source.id}-${target.id}`) || [];
              const filtered =
                filterTypes.size === 0
                  ? connections
                  : connections.filter((c) => filterTypes.has(c.integrationType));
              const hasConnection = filtered.length > 0;
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
                  style={{ cursor: hasConnection ? 'pointer' : 'default' }}
                >
                  <rect
                    x={labelOffset + col * cellSize}
                    y={0}
                    width={cellSize - 2}
                    height={cellSize - 2}
                    fill={isActive ? '#1e293b' : '#141418'}
                    stroke={isActive ? '#3b82f6' : 'transparent'}
                    strokeWidth={isActive ? 1.5 : 0}
                    rx={3}
                  />
                  {hasConnection && (
                    <>
                      {[...new Set(filtered.map((c) => c.integrationType))]
                        .slice(0, 3)
                        .map((type, i) => (
                          <circle
                            key={type}
                            cx={labelOffset + col * cellSize + cellSize / 2 - 5 + i * 5}
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
        ))}
      </svg>
    </div>
  );
}
