/**
 * Semantic Zoom Configuration
 * Defines zoom thresholds and detail levels for progressive disclosure
 *
 * Detail Levels:
 * - LOW: Show only tier groupings with aggregate connection counts (k < 0.7)
 * - MEDIUM: Show individual nodes with connection lines (0.7 <= k < 1.2)
 * - HIGH: Show full details - git branch, file counts, health indicators (k >= 1.2)
 */

export type SemanticZoomLevel = 'low' | 'medium' | 'high';

/**
 * Zoom thresholds for semantic detail levels
 * Based on scale factor (k) from ZoomTransform
 */
export const ZOOM_THRESHOLDS = {
  LOW_TO_MEDIUM: 0.7,   // Below this: show tier aggregates only
  MEDIUM_TO_HIGH: 1.2,  // Above this: show full details
} as const;

/**
 * Determine the semantic zoom level based on scale factor
 */
export function getSemanticZoomLevel(scale: number): SemanticZoomLevel {
  if (scale < ZOOM_THRESHOLDS.LOW_TO_MEDIUM) {
    return 'low';
  }
  if (scale < ZOOM_THRESHOLDS.MEDIUM_TO_HIGH) {
    return 'medium';
  }
  return 'high';
}

/**
 * Detail flags for each zoom level
 * Used by components to conditionally render content
 */
export interface ZoomDetailFlags {
  /** Show tier grouping aggregates instead of individual nodes */
  showTierAggregates: boolean;
  /** Show individual node cards */
  showNodes: boolean;
  /** Show connection lines between nodes */
  showConnections: boolean;
  /** Show node name (truncated at medium, full at high) */
  showNodeName: boolean;
  /** Show framework/technology label */
  showFramework: boolean;
  /** Show git branch status indicator */
  showGitBranch: boolean;
  /** Show context/file counts */
  showCounts: boolean;
  /** Show health indicators */
  showHealth: boolean;
  /** Show connection metadata on hover */
  showConnectionMetadata: boolean;
  /** Max name length before truncation (0 = no truncation) */
  maxNameLength: number;
}

/**
 * Get detail flags for a given zoom level
 */
export function getZoomDetailFlags(level: SemanticZoomLevel): ZoomDetailFlags {
  switch (level) {
    case 'low':
      return {
        showTierAggregates: true,
        showNodes: false,
        showConnections: false,
        showNodeName: false,
        showFramework: false,
        showGitBranch: false,
        showCounts: false,
        showHealth: false,
        showConnectionMetadata: false,
        maxNameLength: 0,
      };
    case 'medium':
      return {
        showTierAggregates: false,
        showNodes: true,
        showConnections: true,
        showNodeName: true,
        showFramework: true,
        showGitBranch: false,
        showCounts: false,
        showHealth: false,
        showConnectionMetadata: false,
        maxNameLength: 16,
      };
    case 'high':
      return {
        showTierAggregates: false,
        showNodes: true,
        showConnections: true,
        showNodeName: true,
        showFramework: true,
        showGitBranch: true,
        showCounts: true,
        showHealth: true,
        showConnectionMetadata: true,
        maxNameLength: 24,
      };
  }
}

/**
 * Convenience function: get detail flags directly from scale factor
 */
export function getDetailFlagsFromScale(scale: number): ZoomDetailFlags {
  return getZoomDetailFlags(getSemanticZoomLevel(scale));
}

/**
 * Hook-friendly: compute aggregate stats for tier groupings (low zoom)
 */
export interface TierAggregate {
  tierId: string;
  tierLabel: string;
  tierColor: string;
  nodeCount: number;
  totalConnections: number;
  incomingConnections: number;
  outgoingConnections: number;
}

/**
 * Calculate tier aggregates from nodes for low-zoom rendering
 */
export function calculateTierAggregates(
  nodes: Array<{ tier: string; connectionCount: number; incomingConnections?: unknown[]; outgoingConnections?: unknown[] }>,
  tierConfigs: Array<{ id: string; label: string; color: string; y: number; height: number }>
): TierAggregate[] {
  const tierMap = new Map<string, TierAggregate>();

  // Initialize from tier configs
  for (const config of tierConfigs) {
    tierMap.set(config.id, {
      tierId: config.id,
      tierLabel: config.label,
      tierColor: config.color,
      nodeCount: 0,
      totalConnections: 0,
      incomingConnections: 0,
      outgoingConnections: 0,
    });
  }

  // Aggregate node stats
  for (const node of nodes) {
    const aggregate = tierMap.get(node.tier);
    if (aggregate) {
      aggregate.nodeCount++;
      aggregate.totalConnections += node.connectionCount;
      aggregate.incomingConnections += node.incomingConnections?.length ?? 0;
      aggregate.outgoingConnections += node.outgoingConnections?.length ?? 0;
    }
  }

  return Array.from(tierMap.values());
}
