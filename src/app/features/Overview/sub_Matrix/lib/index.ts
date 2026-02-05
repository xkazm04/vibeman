/**
 * Matrix visualization library exports
 */
export {
  HighlightRule,
  isHighlighted,
  isDimmed,
  createHighlightContext,
  createHighlightRule,
  type HighlightWeight,
  type HighlightElementType,
  type HighlightContext,
  type HighlightRule as HighlightRuleType,
} from './highlightAlgebra';

export {
  getSemanticZoomLevel,
  getZoomDetailFlags,
  getDetailFlagsFromScale,
  calculateTierAggregates,
  ZOOM_THRESHOLDS,
  type SemanticZoomLevel,
  type ZoomDetailFlags,
  type TierAggregate,
} from './semanticZoom';
