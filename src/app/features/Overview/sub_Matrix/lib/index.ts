/**
 * Matrix visualization library exports
 */
export {
  HighlightRule,
  isHighlighted,
  isDimmed,
  type HighlightElementType,
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

export { archTheme, type ArchTheme } from './archTheme';
