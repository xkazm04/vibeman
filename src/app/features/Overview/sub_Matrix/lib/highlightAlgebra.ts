/**
 * Declarative Highlight Algebra
 *
 * Determines visual emphasis in graph visualizations based on selection state.
 * Supports graduated weights for multi-level emphasis (blast radius).
 *
 * Weight convention:
 *   0   = not highlighted
 *   1   = fully highlighted (selection, origin)
 *   0.8 = direct dependency (high risk)
 *   0.5 = second-order dependency (medium risk)
 *   0.3 = third-order+ dependency (low risk)
 */

import type { BlastRadiusResult, ImpactLevel } from '../../sub_WorkspaceArchitecture/lib/blastRadiusEngine';

export type HighlightElementType = 'node' | 'connection';

export interface HighlightRule {
  getWeight(id: string, type: HighlightElementType, targetId?: string): number;
  hasActiveHighlight(): boolean;
}

class BaseHighlightRule implements HighlightRule {
  constructor(
    private readonly evaluator: (id: string, type: HighlightElementType, targetId?: string) => number,
    private readonly hasActive: boolean
  ) {}

  getWeight(id: string, type: HighlightElementType, targetId?: string): number {
    return this.evaluator(id, type, targetId);
  }

  hasActiveHighlight(): boolean {
    return this.hasActive;
  }
}

/** Map impact level to graduated weight */
const IMPACT_WEIGHTS: Record<ImpactLevel, number> = {
  origin: 1,
  direct: 0.8,
  second: 0.5,
  third: 0.3,
};

export const HighlightRule = {
  none(): HighlightRule {
    return new BaseHighlightRule(() => 0, false);
  },

  fromSelection(activeCell: { sourceId: string; targetId: string } | null): HighlightRule {
    if (!activeCell) {
      return HighlightRule.none();
    }

    return new BaseHighlightRule(
      (id, type, targetId) => {
        if (type === 'node') {
          return activeCell.sourceId === id || activeCell.targetId === id ? 1 : 0;
        }
        return activeCell.sourceId === id && activeCell.targetId === targetId ? 1 : 0;
      },
      true
    );
  },

  /**
   * Create a highlight rule from a blast radius result.
   * Nodes in the blast radius get graduated weights based on distance.
   * Edges are highlighted if both endpoints are in the radius.
   */
  fromBlastRadius(result: BlastRadiusResult): HighlightRule {
    const { originId, impactMap, affectedEdges } = result;

    // Build set of affected edge keys for O(1) connection lookup
    const edgeKeys = new Set<string>();
    for (const edge of affectedEdges) {
      edgeKeys.add(`${edge.sourceProjectId}-${edge.targetProjectId}`);
    }

    return new BaseHighlightRule(
      (id, type, targetId) => {
        if (type === 'node') {
          if (id === originId) return IMPACT_WEIGHTS.origin;
          const node = impactMap.get(id);
          return node ? IMPACT_WEIGHTS[node.impactLevel] : 0;
        }
        // Connection: highlighted if edge is in the blast radius subgraph
        if (type === 'connection' && targetId) {
          return edgeKeys.has(`${id}-${targetId}`) ? 0.8 : 0;
        }
        return 0;
      },
      true
    );
  },
};

export function isHighlighted(
  rule: HighlightRule,
  id: string,
  type: HighlightElementType,
  targetId?: string
): boolean {
  return rule.getWeight(id, type, targetId) > 0;
}

export function isDimmed(
  rule: HighlightRule,
  id: string,
  type: HighlightElementType,
  targetId?: string
): boolean {
  return rule.hasActiveHighlight() && !isHighlighted(rule, id, type, targetId);
}

/**
 * Get the impact level for a node given a highlight rule.
 * Returns null if the node is not in the blast radius.
 */
export function getImpactLevel(
  rule: HighlightRule,
  nodeId: string,
): ImpactLevel | null {
  const weight = rule.getWeight(nodeId, 'node');
  if (weight >= 1) return 'origin';
  if (weight >= 0.8) return 'direct';
  if (weight >= 0.5) return 'second';
  if (weight >= 0.3) return 'third';
  return null;
}
