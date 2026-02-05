'use client';

import React, { useMemo } from 'react';
import { Grid3X3 } from 'lucide-react';
import type { WorkspaceProjectNode, CrossProjectRelationship, TierConfig } from '../sub_WorkspaceArchitecture/lib/types';
import type { GraphEdge } from '../sub_WorkspaceArchitecture/lib/Graph';
import MatrixConnectionLine from './MatrixConnectionLine';
import MatrixNode from './MatrixNode';
import MatrixTierAggregate from './MatrixTierAggregate';
import { ZoomableCanvas, type ZoomTransform } from '@/components/ZoomableCanvas';
import { HighlightRule, isHighlighted, isDimmed, type HighlightRule as HighlightRuleType } from './lib/highlightAlgebra';
import { getDetailFlagsFromScale, calculateTierAggregates } from './lib/semanticZoom';

interface MatrixDiagramViewProps {
  nodes: WorkspaceProjectNode[];
  /** Legacy: Raw connections (requires O(n) node lookup) */
  connections: CrossProjectRelationship[];
  /** Resolved edges with direct node references (O(1) access - preferred) */
  resolvedEdges?: GraphEdge[];
  tierConfigs: TierConfig[];
  width: number;
  height: number;
  selectedCell: { sourceId: string; targetId: string } | null;
  hoveredCell: { sourceId: string; targetId: string } | null;
  showMatrixButton: boolean;
  onShowMatrix: () => void;
  /** Optional custom highlight rule for advanced highlighting scenarios */
  highlightRule?: HighlightRuleType;
}

export default function MatrixDiagramView({
  nodes,
  connections,
  resolvedEdges,
  tierConfigs,
  width,
  height,
  selectedCell,
  hoveredCell,
  showMatrixButton,
  onShowMatrix,
  highlightRule: customHighlightRule,
}: MatrixDiagramViewProps) {
  // Prefer resolved edges for O(1) node access, fall back to legacy connections
  const useResolvedEdges = resolvedEdges && resolvedEdges.length > 0;

  /**
   * Declarative highlight rule based on selection state.
   * Uses the highlight algebra to compute visual emphasis for elements.
   * Custom rules can be passed in for advanced scenarios (e.g., path highlighting).
   */
  const highlightRule = useMemo(() => {
    if (customHighlightRule) return customHighlightRule;

    // Active cell from selection or hover (selection takes precedence)
    const activeCell = selectedCell || hoveredCell;
    return HighlightRule.fromSelection(activeCell);
  }, [selectedCell, hoveredCell, customHighlightRule]);

  // Pre-calculate tier aggregates for low zoom rendering
  const tierAggregates = useMemo(
    () => calculateTierAggregates(nodes, tierConfigs),
    [nodes, tierConfigs]
  );

  // Background elements (outside zoom transform)
  const background = (
    <>
      <defs>
        <pattern id="matrix-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="0.5" fill="#1a1a20" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="#0a0a0c" />
      <rect width="100%" height="100%" fill="url(#matrix-grid)" />
    </>
  );

  return (
    <div className="flex-1 relative z-10">
      {showMatrixButton && (
        <button
          onClick={onShowMatrix}
          className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 bg-zinc-900/90 hover:bg-cyan-900/50 rounded-lg border border-cyan-500/30 text-sm text-zinc-300 transition-all duration-200 shadow-lg hover:shadow-cyan-500/20 hover:border-cyan-400/50 backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 group"
        >
          <Grid3X3 className="w-4 h-4 group-hover:text-cyan-400 transition-colors duration-200" />
          <span className="group-hover:text-white transition-colors duration-200">Show Matrix</span>
        </button>
      )}

      <ZoomableCanvas
        width={width}
        height={height}
        background={background}
        config={{ minScale: 0.3, maxScale: 2.5 }}
      >
        {(transform: ZoomTransform) => {
          // Get semantic zoom detail flags based on current scale
          const detailFlags = getDetailFlagsFromScale(transform.k);

          return (
            <>
              {/* Tier backgrounds - always shown */}
              {tierConfigs.map((config) => (
                <g key={config.id}>
                  <rect
                    x={0}
                    y={config.y}
                    width={width / transform.k}
                    height={config.height}
                    fill={config.bgColor}
                  />
                  {/* Tier label - shown at medium+ zoom or as part of aggregate at low zoom */}
                  {!detailFlags.showTierAggregates && (
                    <text
                      x={16}
                      y={config.y + 14}
                      fill={config.color}
                      fontSize={10}
                      fontWeight={600}
                      opacity={0.6}
                      style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
                    >
                      {config.label}
                    </text>
                  )}
                </g>
              ))}

              {/* LOW ZOOM: Tier aggregates instead of individual nodes */}
              {detailFlags.showTierAggregates && tierAggregates.map((aggregate) => {
                const tierConfig = tierConfigs.find(t => t.id === aggregate.tierId);
                if (!tierConfig) return null;
                return (
                  <MatrixTierAggregate
                    key={aggregate.tierId}
                    aggregate={aggregate}
                    tierY={tierConfig.y}
                    tierHeight={tierConfig.height}
                    canvasWidth={width / transform.k}
                  />
                );
              })}

              {/* MEDIUM+ ZOOM: Connection lines */}
              {detailFlags.showConnections && (
                useResolvedEdges
                  ? resolvedEdges!.map((edge) => (
                      <MatrixConnectionLine
                        key={edge.id}
                        edge={edge}
                        isHighlighted={isHighlighted(highlightRule, edge.sourceProjectId, 'connection', edge.targetProjectId)}
                        isDimmed={isDimmed(highlightRule, edge.sourceProjectId, 'connection', edge.targetProjectId)}
                      />
                    ))
                  : connections.map((conn) => (
                      <MatrixConnectionLine
                        key={conn.id}
                        connection={conn}
                        nodes={nodes}
                        isHighlighted={isHighlighted(highlightRule, conn.sourceProjectId, 'connection', conn.targetProjectId)}
                        isDimmed={isDimmed(highlightRule, conn.sourceProjectId, 'connection', conn.targetProjectId)}
                      />
                    ))
              )}

              {/* MEDIUM+ ZOOM: Individual nodes with progressive detail */}
              {detailFlags.showNodes && nodes.map((node) => (
                <MatrixNode
                  key={node.id}
                  node={node}
                  isHighlighted={isHighlighted(highlightRule, node.id, 'node')}
                  detailFlags={detailFlags}
                />
              ))}
            </>
          );
        }}
      </ZoomableCanvas>
    </div>
  );
}
