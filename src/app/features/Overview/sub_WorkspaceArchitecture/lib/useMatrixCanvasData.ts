import { useMemo } from 'react';
import type { CrossProjectRelationship, IntegrationType } from './types';
import { useArchitectureData } from './useArchitectureData';
import { Graph, type GraphEdge } from './Graph';

export interface FilteredCellData {
  connections: CrossProjectRelationship[];
  types: IntegrationType[];
}

interface UseMatrixCanvasDataProps {
  workspaceId: string | null;
  filterTypes: Set<IntegrationType>;
  showMatrix: boolean;
  dimensionsWidth: number;
}

/**
 * Hook that provides unified graph data for both Matrix and Diagram views.
 *
 * Uses the Graph abstraction to project the same underlying data into
 * different visual representations (matrix adjacency and positioned node-link).
 */
export function useMatrixCanvasData({
  workspaceId,
  filterTypes,
  showMatrix,
  dimensionsWidth,
}: UseMatrixCanvasDataProps) {
  const { data, loading, error, refresh } = useArchitectureData(workspaceId);

  // Create the unified Graph from raw architecture data
  const graph = useMemo(
    () => new Graph(data.projects, data.relationships),
    [data.projects, data.relationships]
  );

  // Get all available integration types from the graph
  const availableIntegrationTypes = useMemo(
    () => graph.getIntegrationTypes(),
    [graph]
  );

  // Matrix projection - adjacency matrix representation
  const matrixProjection = useMemo(() => graph.toMatrix(), [graph]);

  // Calculate diagram width accounting for matrix panel
  const diagramWidth = useMemo(
    () => dimensionsWidth - (showMatrix ? matrixProjection.dimensions.panelWidth : 0),
    [dimensionsWidth, showMatrix, matrixProjection.dimensions.panelWidth]
  );

  // Diagram projection - positioned nodes with tier swimlanes
  // Uses the unfiltered graph for node positions (filtering only affects edges)
  const diagramProjection = useMemo(
    () => graph.toDiagram(diagramWidth),
    [graph, diagramWidth]
  );

  // Get resolved edges filtered by integration type (O(1) node access)
  const filteredResolvedEdges = useMemo(() => {
    // Filter the diagram projection's resolved edges
    if (filterTypes.size === 0) {
      return diagramProjection.resolvedEdges;
    }
    return diagramProjection.resolvedEdges.filter(e => filterTypes.has(e.integrationType));
  }, [diagramProjection.resolvedEdges, filterTypes]);

  // Pre-filtered matrix: single-pass over all edges, building per-cell filtered data
  // Eliminates O(cells * edges) per-cell filtering in MatrixGrid
  const filteredMatrix = useMemo(() => {
    const result = new Map<string, FilteredCellData>();
    for (const [key, connections] of matrixProjection.matrix) {
      const filtered = filterTypes.size === 0
        ? connections
        : connections.filter(c => filterTypes.has(c.integrationType));
      if (filtered.length > 0) {
        const typeSet = new Set<IntegrationType>();
        for (const c of filtered) typeSet.add(c.integrationType);
        result.set(key, {
          connections: filtered,
          types: [...typeSet].slice(0, 3),
        });
      }
    }
    return result;
  }, [matrixProjection.matrix, filterTypes]);

  return {
    // Raw data for components that need it
    data,
    loading,
    error,
    refresh,

    // The unified graph instance (for advanced use cases)
    graph,

    // Matrix view data (from graph.toMatrix())
    sortedNodes: matrixProjection.sortedNodes,
    matrix: matrixProjection.matrix,
    filteredMatrix,
    matrixContentWidth: matrixProjection.dimensions.contentWidth,
    matrixContentHeight: matrixProjection.dimensions.contentHeight,
    matrixPanelWidth: matrixProjection.dimensions.panelWidth,

    // Diagram view data (from graph.toDiagram())
    nodes: diagramProjection.nodes,
    tierConfigs: diagramProjection.tierConfigs,

    // Resolved edges with direct node references (O(1) access)
    filteredResolvedEdges,

    // Integration type filter options
    availableIntegrationTypes,
  };
}
