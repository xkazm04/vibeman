'use client';

/**
 * Matrix + Diagram Hybrid Architecture Visualization
 * - Split view: Matrix on left, Diagram on right
 * - Matrix shows all connections at a glance with colored dots
 * - Click matrix cell to highlight path in diagram
 * - Filter by integration type
 */

import React, { useRef, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { IntegrationType } from '../lib/types';
import { useMatrixCanvasData } from '../lib/useMatrixCanvasData';
import { useWorkspaceStore } from '@/stores/workspaceStore';

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
  const [selectedCell, setSelectedCell] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [filterTypes, setFilterTypes] = useState<Set<IntegrationType>>(new Set());
  const [showMatrix, setShowMatrix] = useState(true);

  const { workspaces } = useWorkspaceStore();
  const activeWorkspace = workspaceId && workspaceId !== 'default'
    ? workspaces.find((ws) => ws.id === workspaceId) ?? null
    : null;

  const {
    data, loading, error, refresh,
    sortedNodes, matrix, filteredConnections,
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

  return (
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
            onCellHover={setHoveredCell}
            onCellSelect={setSelectedCell}
          />
        )}
      </AnimatePresence>
      <MatrixDiagramView
        nodes={nodes}
        connections={filteredConnections}
        tierConfigs={tierConfigs}
        width={diagramWidth}
        height={dimensions.height}
        selectedCell={selectedCell}
        hoveredCell={hoveredCell}
        showMatrixButton={!showMatrix}
        onShowMatrix={() => setShowMatrix(true)}
      />
    </div>
  );
}
