'use client';

/**
 * Matrix + Diagram Hybrid Architecture Visualization
 *
 * Implements the LINKED VIEWS pattern from information visualization:
 * - Multiple views (Matrix, Diagram) of the same graph data
 * - Coordinated interaction: hover/select in one view highlights in all views
 * - Extensible: can add Table View, Timeline View, etc. without rewriting coordination
 *
 * Uses LinkedViewsContainer for shared selection state across child views.
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { IntegrationType } from '../lib/types';
import { useMatrixCanvasData } from '../lib/useMatrixCanvasData';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import {
  LinkedViewsContainer,
  useLocalFocusHighlight,
  focusTargetToCell,
} from '@/hooks/useFocusHighlight';

import MatrixLoadingState from '../../sub_Matrix/MatrixLoadingState';
import MatrixErrorState from '../../sub_Matrix/MatrixErrorState';
import MatrixEmptyState from '../../sub_Matrix/MatrixEmptyState';
import MatrixPanel from '../../sub_Matrix/MatrixPanel';
import MatrixDiagramView from '../../sub_Matrix/MatrixDiagramView';
import MatrixBackground from '../../sub_Matrix/MatrixBackground';

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
    sortedNodes, matrix, filteredConnections, filteredResolvedEdges,
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

  if (loading) return <MatrixLoadingState ref={containerRef} />;
  if (error) return <MatrixErrorState ref={containerRef} error={error} onRetry={refresh} />;
  if (data.projects.length === 0) {
    return (
      <MatrixEmptyState
        ref={containerRef}
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
            />
          )}
        </AnimatePresence>
        <MatrixDiagramView
          nodes={nodes}
          connections={filteredConnections}
          resolvedEdges={filteredResolvedEdges}
          tierConfigs={tierConfigs}
          width={diagramWidth}
          height={dimensions.height}
          selectedCell={selectedCell}
          hoveredCell={hoveredCell}
          showMatrixButton={!showMatrix}
          onShowMatrix={() => setShowMatrix(true)}
        />
      </div>
    </LinkedViewsContainer>
  );
}
