import { useMemo } from 'react';
import type { IntegrationType, CrossProjectRelationship } from './types';
import { buildAdjacencyMatrix } from './mockData';
import { sortNodesByTier, calculateMatrixDimensions, positionNodes } from './matrixLayoutUtils';
import { useArchitectureData } from './useArchitectureData';

interface UseMatrixCanvasDataProps {
  workspaceId: string | null;
  filterTypes: Set<IntegrationType>;
  showMatrix: boolean;
  dimensionsWidth: number;
}

export function useMatrixCanvasData({
  workspaceId,
  filterTypes,
  showMatrix,
  dimensionsWidth,
}: UseMatrixCanvasDataProps) {
  const { data, loading, error, refresh } = useArchitectureData(workspaceId);

  const sortedNodes = useMemo(() => sortNodesByTier(data.projects), [data.projects]);

  const { matrixContentWidth, matrixContentHeight, matrixPanelWidth } = useMemo(
    () => calculateMatrixDimensions(sortedNodes.length),
    [sortedNodes.length]
  );

  const matrix = useMemo(() => {
    if (!sortedNodes.length) return new Map<string, CrossProjectRelationship[]>();
    return buildAdjacencyMatrix(sortedNodes, data.relationships);
  }, [sortedNodes, data.relationships]);

  const filteredConnections = useMemo(() => {
    if (filterTypes.size === 0) return data.relationships;
    return data.relationships.filter((c) => filterTypes.has(c.integrationType));
  }, [data.relationships, filterTypes]);

  const { nodes, tierConfigs } = useMemo(() => {
    const diagramWidth = dimensionsWidth - (showMatrix ? matrixPanelWidth : 0);
    return positionNodes([...data.projects], data.relationships, diagramWidth);
  }, [data.projects, data.relationships, dimensionsWidth, showMatrix, matrixPanelWidth]);

  const availableIntegrationTypes = useMemo(() => {
    const types = new Set<IntegrationType>();
    data.relationships.forEach((r) => types.add(r.integrationType));
    return Array.from(types);
  }, [data.relationships]);

  return {
    data,
    loading,
    error,
    refresh,
    sortedNodes,
    matrix,
    filteredConnections,
    nodes,
    tierConfigs,
    availableIntegrationTypes,
    matrixContentWidth,
    matrixContentHeight,
    matrixPanelWidth,
  };
}
