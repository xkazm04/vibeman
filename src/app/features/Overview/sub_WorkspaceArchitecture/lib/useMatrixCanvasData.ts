import { useMemo } from 'react';
import type { IntegrationType } from './types';
import { useArchitectureData } from './useArchitectureData';
import { Graph, type GraphEdge } from './Graph';

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

  // Create filtered graph based on selected integration types
  const filteredGraph = useMemo(
    () => graph.filterByIntegrationType(filterTypes),
    [graph, filterTypes]
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
    matrixContentWidth: matrixProjection.dimensions.contentWidth,
    matrixContentHeight: matrixProjection.dimensions.contentHeight,
    matrixPanelWidth: matrixProjection.dimensions.panelWidth,

    // Diagram view data (from graph.toDiagram())
    nodes: diagramProjection.nodes,
    tierConfigs: diagramProjection.tierConfigs,

    // Filtered connections for diagram view (legacy - raw relationships)
    filteredConnections: filteredGraph.edges as typeof data.relationships,

    // Resolved edges with direct node references (optimized - O(1) access)
    filteredResolvedEdges,

    // Integration type filter options
    availableIntegrationTypes,
  };
}
