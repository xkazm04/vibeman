'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { Grid3X3 } from 'lucide-react';
import type { WorkspaceProjectNode, TierConfig } from '../sub_WorkspaceArchitecture/lib/types';
import type { GraphEdge } from '../sub_WorkspaceArchitecture/lib/Graph';
import MatrixConnectionLine from './MatrixConnectionLine';
import MatrixNode from './MatrixNode';
import MatrixTierAggregate from './MatrixTierAggregate';
import { ZoomableCanvas, type ZoomTransform } from '@/components/ZoomableCanvas';
import { HighlightRule, isHighlighted, isDimmed, getImpactLevel, type HighlightRule as HighlightRuleType } from './lib/highlightAlgebra';
import { getDetailFlagsFromScale, getSemanticZoomLevel, calculateTierAggregates, ZOOM_THRESHOLDS } from './lib/semanticZoom';
import { archTheme } from './lib/archTheme';

const ZOOM_LEVEL_LABELS: Record<string, string> = {
  low: 'Overview',
  medium: 'Standard',
  high: 'Detailed',
};

function getThresholdHint(scale: number): string | null {
  const margin = 0.1;
  if (scale < ZOOM_THRESHOLDS.LOW_TO_MEDIUM && scale >= ZOOM_THRESHOLDS.LOW_TO_MEDIUM - margin) {
    return 'Zoom in for node details';
  }
  if (scale >= ZOOM_THRESHOLDS.LOW_TO_MEDIUM && scale < ZOOM_THRESHOLDS.LOW_TO_MEDIUM + margin) {
    return 'Zoom out for overview';
  }
  if (scale < ZOOM_THRESHOLDS.MEDIUM_TO_HIGH && scale >= ZOOM_THRESHOLDS.MEDIUM_TO_HIGH - margin) {
    return 'Zoom in for full details';
  }
  if (scale >= ZOOM_THRESHOLDS.MEDIUM_TO_HIGH && scale < ZOOM_THRESHOLDS.MEDIUM_TO_HIGH + margin) {
    return 'Zoom out for simplified view';
  }
  return null;
}

interface MatrixDiagramViewProps {
  nodes: WorkspaceProjectNode[];
  resolvedEdges: GraphEdge[];
  tierConfigs: TierConfig[];
  width: number;
  height: number;
  selectedCell: { sourceId: string; targetId: string } | null;
  hoveredCell: { sourceId: string; targetId: string } | null;
  showMatrixButton: boolean;
  onShowMatrix: () => void;
  /** Optional custom highlight rule for advanced highlighting scenarios */
  highlightRule?: HighlightRuleType;
  /** Whether impact mode is active (enables node click for blast radius) */
  impactMode?: boolean;
  /** Click handler for nodes (used by impact mode) */
  onNodeClick?: (nodeId: string) => void;
}

export default function MatrixDiagramView({
  nodes,
  resolvedEdges,
  tierConfigs,
  width,
  height,
  selectedCell,
  hoveredCell,
  showMatrixButton,
  onShowMatrix,
  highlightRule: customHighlightRule,
  impactMode,
  onNodeClick,
}: MatrixDiagramViewProps) {
  const [currentScale, setCurrentScale] = useState(1);

  const handleTransformChange = useCallback((t: ZoomTransform) => {
    setCurrentScale(t.k);
  }, []);

  const zoomLevel = getSemanticZoomLevel(currentScale);
  const zoomLabel = ZOOM_LEVEL_LABELS[zoomLevel];
  const zoomPercent = Math.round(currentScale * 100);
  const thresholdHint = getThresholdHint(currentScale);
  const isNearThreshold = thresholdHint !== null;

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
          <circle cx="12" cy="12" r="0.5" fill={archTheme.surface.muted} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={archTheme.surface.canvas} />
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

      {/* Zoom level badge */}
      <div className="absolute top-4 right-[4.5rem] z-10 flex items-center gap-2 pointer-events-none select-none">
        <div
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 border backdrop-blur-sm transition-all duration-200 ${
            isNearThreshold
              ? 'border-cyan-400/50 shadow-md shadow-cyan-500/10 animate-pulse'
              : 'border-zinc-700/50'
          }`}
        >
          <span className="text-[11px] font-medium text-cyan-400">{zoomLabel}</span>
          <span className="text-[10px] text-zinc-500">{zoomPercent}%</span>
        </div>
        {thresholdHint && (
          <span className="text-[10px] text-cyan-400/70 whitespace-nowrap">{thresholdHint}</span>
        )}
      </div>

      <ZoomableCanvas
        width={width}
        height={height}
        background={background}
        config={{ minScale: 0.3, maxScale: 2.5 }}
        onTransformChange={handleTransformChange}
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
              <g style={{ opacity: detailFlags.showTierAggregates ? 1 : 0, transition: 'opacity 200ms ease-in-out' }}>
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
              </g>

              {/* MEDIUM+ ZOOM: Connection lines */}
              <g style={{ opacity: detailFlags.showConnections ? 1 : 0, transition: 'opacity 200ms ease-in-out' }}>
                {detailFlags.showConnections && resolvedEdges.map((edge) => (
                  <MatrixConnectionLine
                    key={edge.id}
                    edge={edge}
                    isHighlighted={isHighlighted(highlightRule, edge.sourceProjectId, 'connection', edge.targetProjectId)}
                    isDimmed={isDimmed(highlightRule, edge.sourceProjectId, 'connection', edge.targetProjectId)}
                  />
                ))}
              </g>

              {/* MEDIUM+ ZOOM: Individual nodes with progressive detail */}
              <g style={{ opacity: detailFlags.showNodes ? 1 : 0, transition: 'opacity 200ms ease-in-out' }}>
                {detailFlags.showNodes && nodes.map((node) => (
                  <MatrixNode
                    key={node.id}
                    node={node}
                    isHighlighted={isHighlighted(highlightRule, node.id, 'node')}
                    detailFlags={detailFlags}
                    impactLevel={customHighlightRule ? getImpactLevel(customHighlightRule, node.id) : null}
                    onClick={impactMode || customHighlightRule ? onNodeClick : undefined}
                  />
                ))}
              </g>
            </>
          );
        }}
      </ZoomableCanvas>
    </div>
  );
}
