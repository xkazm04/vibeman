/**
 * Lazy Loading Components
 *
 * Provides infrastructure for lazy-loading feature modules with
 * performance tracking and visual loading states.
 */

export { FeatureSpinner } from '@/components/ui/Spinner';
export {
  createLazyFeature,
  useTrackMount,
  LazyFeaturePresets,
} from './LazyFeature';
export {
  createDeferredWidget,
  DeferredWidgetPresets,
} from './DeferredWidget';
