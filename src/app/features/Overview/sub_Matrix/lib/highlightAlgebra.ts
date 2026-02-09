/**
 * Declarative Highlight Algebra
 *
 * Determines visual emphasis in graph visualizations based on selection state.
 */

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
