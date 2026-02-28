'use client';

/**
 * Matrix + Diagram Hybrid Architecture Visualization
 *
 * Implements the LINKED VIEWS pattern from information visualization:
 * - Multiple views (Matrix, Diagram) of the same graph data
 * - Coordinated interaction: hover/select in one view highlights in all views
 * - Impact Mode: blast radius analysis from any node
 * - Extensible: can add Table View, Timeline View, etc. without rewriting coordination
 *
 * Uses LinkedViewsContainer for shared selection state across child views.
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import type { IntegrationType } from '../lib/types';
import { useMatrixCanvasData } from '../lib/useMatrixCanvasData';
import { computeBlastRadius, type BlastRadiusResult } from '../lib/blastRadiusEngine';
import { HighlightRule } from '../../sub_Matrix/lib/highlightAlgebra';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import {
  LinkedViewsContainer,
  useLocalFocusHighlight,
  focusTargetToCell,
} from '@/hooks/useFocusHighlight';

import MatrixState from '../../sub_Matrix/MatrixState';
import MatrixPanel from '../../sub_Matrix/MatrixPanel';
import MatrixDiagramView from '../../sub_Matrix/MatrixDiagramView';
import MatrixBackground from '../../sub_Matrix/MatrixBackground';
import BlastRadiusPanel from '../../sub_Matrix/BlastRadiusPanel';

interface MatrixDiagramCanvasProps {
  workspaceId: string | null;
  onProjectSelect?: (projectId: string) => void;
  onAnalysisPrompt?: (prompt: string, analysisId: string) => void;
  onBatchOnboarding?: (prompt: string, onboardingId: string) => void;
}

export default function MatrixDiagramCanvas({
  workspaceId,
  onBatchOnboarding,
}: MatrixDiagramCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [filterTypes, setFilterTypes] = useState<Set<IntegrationType>>(new Set());
  const [showMatrix, setShowMatrix] = useState(true);

  // Impact Mode state
  const [impactMode, setImpactMode] = useState(false);
  const [blastRadius, setBlastRadius] = useState<BlastRadiusResult | null>(null);
  const [impactOriginName, setImpactOriginName] = useState('');

  // Use the focus highlight system for coordinated hover/selection
  const focus = useLocalFocusHighlight();

  // Convert focus state to legacy cell format for child components
  const selectedCell = useMemo(() => focusTargetToCell(focus.state.selected), [focus.state.selected]);
  const hoveredCell = useMemo(() => focusTargetToCell(focus.state.hovered), [focus.state.hovered]);

  // Callback adapters for child components using legacy cell format
  const handleCellHover = useCallback(
    (cell: { sourceId: string; targetId: string } | null) => {
      if (cell) {
        focus.hover({ primaryId: cell.sourceId, secondaryId: cell.targetId });
      } else {
        focus.hover(null);
      }
    },
    [focus]
  );

  const handleCellSelect = useCallback(
    (cell: { sourceId: string; targetId: string } | null) => {
      if (cell) {
        focus.toggleSelect({ primaryId: cell.sourceId, secondaryId: cell.targetId });
      } else {
        focus.select(null);
      }
    },
    [focus]
  );

  const { workspaces } = useWorkspaceStore();
  const activeWorkspace = workspaceId && workspaceId !== 'default'
    ? workspaces.find((ws) => ws.id === workspaceId) ?? null
    : null;

  const {
    data, loading, error, refresh,
    graph,
    sortedNodes, matrix, filteredMatrix, filteredResolvedEdges,
    nodes, tierConfigs, availableIntegrationTypes,
    matrixContentWidth, matrixContentHeight, matrixPanelWidth,
  } = useMatrixCanvasData({ workspaceId, filterTypes, showMatrix, dimensionsWidth: dimensions.width });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDimensions({ width, height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const toggleFilter = (type: IntegrationType) => {
    setFilterTypes((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  // Impact Mode: compute blast radius when a node is clicked
  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (!impactMode) return;

      // If clicking the same origin, deactivate
      if (blastRadius?.originId === nodeId) {
        setBlastRadius(null);
        setImpactOriginName('');
        return;
      }

      const result = computeBlastRadius(graph, nodeId);
      const node = graph.getNode(nodeId);
      setBlastRadius(result);
      setImpactOriginName(node?.name || nodeId);
    },
    [impactMode, blastRadius?.originId, graph]
  );

  // Toggle impact mode
  const handleToggleImpactMode = useCallback(() => {
    setImpactMode((prev) => {
      if (prev) {
        // Turning off — clear blast radius
        setBlastRadius(null);
        setImpactOriginName('');
      }
      return !prev;
    });
  }, []);

  // Close impact panel
  const handleCloseImpact = useCallback(() => {
    setBlastRadius(null);
    setImpactOriginName('');
    setImpactMode(false);
  }, []);

  // Compute highlight rule from blast radius
  const blastRadiusHighlightRule = useMemo(() => {
    if (!blastRadius) return undefined;
    return HighlightRule.fromBlastRadius(blastRadius);
  }, [blastRadius]);

  if (loading) return <MatrixState ref={containerRef} variant="loading" />;
  if (error) return <MatrixState ref={containerRef} variant="error" error={error} onRetry={refresh} />;
  if (data.projects.length === 0) {
    return (
      <MatrixState
        ref={containerRef}
        variant="empty"
        activeWorkspace={activeWorkspace}
        onBatchOnboarding={onBatchOnboarding}
        onRefresh={refresh}
      />
    );
  }

  const diagramWidth = dimensions.width - (showMatrix ? matrixPanelWidth : 0);

  // Linked Views Pattern: Both Matrix and Diagram views share coordinated selection state
  // Future views (Table, Timeline) can be added here and automatically participate in coordination
  return (
    <LinkedViewsContainer
      className="relative w-full h-full overflow-hidden flex"
      initialActiveViews={['matrix', 'diagram']}
    >
      <div ref={containerRef} className="relative w-full h-full overflow-hidden flex">
        <MatrixBackground />
        <AnimatePresence>
          {showMatrix && (
            <MatrixPanel
              sortedNodes={sortedNodes}
              matrix={matrix}
              filteredMatrix={filteredMatrix}
              availableIntegrationTypes={availableIntegrationTypes}
              filterTypes={filterTypes}
              selectedCell={selectedCell}
              hoveredCell={hoveredCell}
              panelWidth={matrixPanelWidth}
              contentWidth={matrixContentWidth}
              contentHeight={matrixContentHeight}
              onClose={() => setShowMatrix(false)}
              onToggleFilter={toggleFilter}
              onCellHover={handleCellHover}
              onCellSelect={handleCellSelect}
              highlightRule={blastRadiusHighlightRule}
            />
          )}
        </AnimatePresence>
        <MatrixDiagramView
          nodes={nodes}
          resolvedEdges={filteredResolvedEdges}
          tierConfigs={tierConfigs}
          width={diagramWidth}
          height={dimensions.height}
          selectedCell={selectedCell}
          hoveredCell={hoveredCell}
          showMatrixButton={!showMatrix}
          onShowMatrix={() => setShowMatrix(true)}
          highlightRule={blastRadiusHighlightRule}
          impactMode={impactMode}
          onNodeClick={handleNodeClick}
        />

        {/* Impact Mode toggle button */}
        <button
          onClick={handleToggleImpactMode}
          className={`absolute bottom-4 right-4 z-10 flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all duration-200 shadow-lg backdrop-blur-sm focus:outline-none focus-visible:ring-2 group ${
            impactMode
              ? 'bg-red-950/80 border-red-500/40 text-red-300 hover:bg-red-900/80 shadow-red-500/10 focus-visible:ring-red-400/50'
              : 'bg-zinc-900/90 border-zinc-700/50 text-zinc-400 hover:bg-zinc-800/90 hover:text-zinc-200 hover:border-zinc-600/50 focus-visible:ring-zinc-400/50'
          }`}
          title={impactMode ? 'Exit Impact Mode' : 'Enter Impact Mode — click a node to see its blast radius'}
        >
          <Zap className={`w-4 h-4 ${impactMode ? 'text-red-400' : 'group-hover:text-amber-400'} transition-colors duration-200`} />
          <span className="group-hover:text-white transition-colors duration-200">
            {impactMode ? 'Impact Mode' : 'Impact'}
          </span>
        </button>

        {/* Blast Radius Panel */}
        {impactMode && (
          <BlastRadiusPanel
            result={blastRadius}
            originName={impactOriginName}
            onClose={handleCloseImpact}
            onNodeClick={handleNodeClick}
          />
        )}
      </div>
    </LinkedViewsContainer>
  );
}
