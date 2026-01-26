/**
 * Tier-Based Layout for Architecture Visualization
 * Positions projects in horizontal swimlanes by tier
 */

import type { WorkspaceProjectNode, CrossProjectRelationship, ProjectTier, TierConfig } from './types';
import { TIER_CONFIG } from './types';

// Tier order from top to bottom (removed 'integration')
const TIER_ORDER: ProjectTier[] = ['frontend', 'backend', 'external', 'shared'];

// Layout configuration
const LAYOUT_CONFIG = {
  tierPadding: 60,
  nodePadding: 40,
  nodeWidth: 180,
  nodeHeight: 80,
  leftMargin: 120,
  topMargin: 40,
  minTierHeight: 120,
};

/**
 * Calculate tier configurations with y positions and heights
 */
export function calculateTierConfigs(
  nodes: WorkspaceProjectNode[],
  canvasHeight: number
): TierConfig[] {
  const tierCounts = new Map<ProjectTier, number>();
  for (const node of nodes) {
    tierCounts.set(node.tier, (tierCounts.get(node.tier) || 0) + 1);
  }

  const activeTiers = TIER_ORDER.filter(tier => tierCounts.get(tier));
  if (activeTiers.length === 0) return [];

  const totalPadding = LAYOUT_CONFIG.topMargin + (activeTiers.length - 1) * LAYOUT_CONFIG.tierPadding;
  const availableHeight = canvasHeight - totalPadding - LAYOUT_CONFIG.topMargin;
  const tierHeight = Math.max(LAYOUT_CONFIG.minTierHeight, availableHeight / activeTiers.length);

  let currentY = LAYOUT_CONFIG.topMargin;
  const configs: TierConfig[] = [];

  for (const tierId of activeTiers) {
    const baseConfig = TIER_CONFIG[tierId];
    if (baseConfig) {
      configs.push({
        ...baseConfig,
        y: currentY,
        height: tierHeight,
      });
      currentY += tierHeight + LAYOUT_CONFIG.tierPadding;
    }
  }

  return configs;
}

/**
 * Run tier-based layout positioning
 */
export function runTierLayout(
  nodes: WorkspaceProjectNode[],
  canvasWidth: number,
  canvasHeight: number
): TierConfig[] {
  const tierConfigs = calculateTierConfigs(nodes, canvasHeight);

  const nodesByTier = new Map<ProjectTier, WorkspaceProjectNode[]>();
  for (const node of nodes) {
    const list = nodesByTier.get(node.tier) || [];
    list.push(node);
    nodesByTier.set(node.tier, list);
  }

  for (const config of tierConfigs) {
    const tierNodes = nodesByTier.get(config.id) || [];
    const nodeCount = tierNodes.length;
    if (nodeCount === 0) continue;

    const availableWidth = canvasWidth - LAYOUT_CONFIG.leftMargin - LAYOUT_CONFIG.nodePadding;
    const totalNodeWidth = nodeCount * LAYOUT_CONFIG.nodeWidth + (nodeCount - 1) * LAYOUT_CONFIG.nodePadding;
    const startX = LAYOUT_CONFIG.leftMargin + Math.max(0, (availableWidth - totalNodeWidth) / 2);

    tierNodes.forEach((node, index) => {
      node.width = LAYOUT_CONFIG.nodeWidth;
      node.height = LAYOUT_CONFIG.nodeHeight;
      node.x = startX + index * (LAYOUT_CONFIG.nodeWidth + LAYOUT_CONFIG.nodePadding);
      node.y = config.y + (config.height - LAYOUT_CONFIG.nodeHeight) / 2;
    });
  }

  return tierConfigs;
}

/**
 * Calculate connection path from source center to target center
 * Uses clean orthogonal routing (horizontal and vertical lines only)
 */
export function calculateOrthogonalPath(
  source: WorkspaceProjectNode,
  target: WorkspaceProjectNode,
  _offsetIndex: number = 0  // Ignored - always use center
): { path: string; points: Array<{ x: number; y: number }>; labelPoint: { x: number; y: number } } {
  // Always connect from center bottom to center top
  const sx = source.x + source.width / 2;
  const sy = source.y + source.height;
  const tx = target.x + target.width / 2;
  const ty = target.y;

  const midY = (sy + ty) / 2;

  const points = [
    { x: sx, y: sy },
    { x: sx, y: midY },
    { x: tx, y: midY },
    { x: tx, y: ty },
  ];

  const path = `M ${sx} ${sy} L ${sx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`;

  return {
    path,
    points,
    labelPoint: { x: (sx + tx) / 2, y: midY },
  };
}

/**
 * Calculate arrow head for connection endpoint
 */
export function calculateArrowHead(
  endX: number,
  endY: number,
  prevX: number,
  prevY: number,
  size: number = 8
): string {
  const dx = endX - prevX;
  const dy = endY - prevY;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return '';

  const nx = dx / len;
  const ny = dy / len;

  const tipX = endX;
  const tipY = endY;
  const baseX = endX - nx * size;
  const baseY = endY - ny * size;

  const perpX = -ny * size * 0.5;
  const perpY = nx * size * 0.5;

  return `M ${tipX} ${tipY} L ${baseX + perpX} ${baseY + perpY} L ${baseX - perpX} ${baseY - perpY} Z`;
}

// Legacy exports for backward compatibility
export function runForceLayout(
  nodes: WorkspaceProjectNode[],
  _connections: CrossProjectRelationship[],
  width: number,
  height: number
): void {
  runTierLayout(nodes, width, height);
}

export function calculateConnectionPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  _sourceRadius: number,
  _targetRadius: number
): { path: string; midX: number; midY: number } {
  const midY = (sourceY + targetY) / 2;
  return {
    path: `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`,
    midX: (sourceX + targetX) / 2,
    midY,
  };
}
