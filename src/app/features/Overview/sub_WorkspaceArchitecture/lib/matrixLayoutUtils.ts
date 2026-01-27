/**
 * Layout utilities for Matrix Diagram Canvas
 * Handles node positioning, sorting, and matrix calculations
 */

import type { WorkspaceProjectNode, CrossProjectRelationship, TierConfig, ProjectTier } from './types';
import { TIER_CONFIG } from './types';

export const TIER_ORDER: ProjectTier[] = ['frontend', 'backend', 'external', 'shared'];

export const MATRIX_CONSTANTS = {
  cellSize: 26,
  labelOffset: 80,
  headerHeight: 70,
  nodeWidth: 160,
  nodeHeight: 60,
  tierPadding: 50,
  nodePadding: 24,
  rowPadding: 20,
  topMargin: 40,
  leftMargin: 100,
  gridColumns: 3,
  backendNodePadding: 72,
  backendRowPadding: 60,
} as const;

export function sortNodesByTier(projects: WorkspaceProjectNode[]): WorkspaceProjectNode[] {
  if (!projects.length) return [];
  return [...projects].sort((a, b) => {
    const tierOrder = { frontend: 0, backend: 1, external: 2, shared: 3 };
    return tierOrder[a.tier] - tierOrder[b.tier];
  });
}

export function calculateMatrixDimensions(nodeCount: number) {
  const { cellSize, labelOffset, headerHeight } = MATRIX_CONSTANTS;
  const matrixContentWidth = nodeCount * cellSize + labelOffset;
  const matrixContentHeight = nodeCount * cellSize + headerHeight;
  const matrixPanelWidth = Math.max(320, matrixContentWidth + 48);
  return { matrixContentWidth, matrixContentHeight, matrixPanelWidth };
}

interface PositionNodesResult {
  nodes: WorkspaceProjectNode[];
  tierConfigs: TierConfig[];
}

export function positionNodes(
  projects: WorkspaceProjectNode[],
  relationships: CrossProjectRelationship[],
  diagramWidth: number
): PositionNodesResult {
  if (!projects.length) return { nodes: [], tierConfigs: [] };

  const { nodeWidth, nodeHeight, tierPadding, nodePadding, topMargin, leftMargin, gridColumns,
    backendNodePadding, backendRowPadding } = MATRIX_CONSTANTS;

  const configs: TierConfig[] = [];
  const byTier = new Map<ProjectTier, WorkspaceProjectNode[]>();

  for (const p of projects) {
    const list = byTier.get(p.tier) || [];
    list.push(p);
    byTier.set(p.tier, list);
  }

  // Find backend services connected to frontend (for priority sorting)
  const frontendIds = new Set((byTier.get('frontend') || []).map(n => n.id));
  const connectedToFrontend = new Set<string>();
  for (const rel of relationships) {
    if (frontendIds.has(rel.sourceProjectId)) {
      connectedToFrontend.add(rel.targetProjectId);
    }
    if (frontendIds.has(rel.targetProjectId)) {
      connectedToFrontend.add(rel.sourceProjectId);
    }
  }

  let currentY = topMargin;
  for (const tierId of TIER_ORDER) {
    let tierNodes = byTier.get(tierId) || [];
    if (tierNodes.length === 0) continue;

    // Backend tier: use 3-column grid layout with connected services on top
    if (tierId === 'backend' && tierNodes.length > 3) {
      // Sort: connected to frontend first, then alphabetically
      tierNodes = [...tierNodes].sort((a, b) => {
        const aConnected = connectedToFrontend.has(a.id) ? 0 : 1;
        const bConnected = connectedToFrontend.has(b.id) ? 0 : 1;
        if (aConnected !== bConnected) return aConnected - bConnected;
        return a.name.localeCompare(b.name);
      });

      const numRows = Math.ceil(tierNodes.length / gridColumns);
      const tierHeight = numRows * nodeHeight + (numRows - 1) * backendRowPadding + 60;
      configs.push({ ...TIER_CONFIG[tierId], y: currentY, height: tierHeight });

      const gridWidth = gridColumns * nodeWidth + (gridColumns - 1) * backendNodePadding;
      const startX = leftMargin + Math.max(0, (diagramWidth - gridWidth) / 2);

      tierNodes.forEach((node, idx) => {
        const col = idx % gridColumns;
        const row = Math.floor(idx / gridColumns);
        node.width = nodeWidth;
        node.height = nodeHeight;
        node.x = startX + col * (nodeWidth + backendNodePadding);
        node.y = currentY + 30 + row * (nodeHeight + backendRowPadding);
      });

      currentY += tierHeight + tierPadding;
    } else {
      // Other tiers: single row layout
      const tierHeight = 100;
      configs.push({ ...TIER_CONFIG[tierId], y: currentY, height: tierHeight });

      const totalWidth = tierNodes.length * nodeWidth + (tierNodes.length - 1) * nodePadding;
      const startX = leftMargin + Math.max(0, (diagramWidth - totalWidth) / 2);

      tierNodes.forEach((node, idx) => {
        node.width = nodeWidth;
        node.height = nodeHeight;
        node.x = startX + idx * (nodeWidth + nodePadding);
        node.y = currentY + (tierHeight - nodeHeight) / 2;
      });

      currentY += tierHeight + tierPadding;
    }
  }

  return { nodes: projects, tierConfigs: configs };
}
