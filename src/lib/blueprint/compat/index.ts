/**
 * Backward Compatibility Wrappers
 *
 * These wrappers provide the old function-based API on top of the new
 * class-based scan components. This allows existing consumers to continue
 * working without changes while we migrate to the new architecture.
 *
 * Usage:
 * ```typescript
 * // Old imports (still work)
 * import { executeVisionScan, buildVisionDecisionData } from '@/lib/blueprint/compat';
 *
 * // New imports (recommended)
 * import { VisionScan } from '@/lib/blueprint';
 * const scan = new VisionScan(config);
 * const result = await scan.execute();
 * const decision = scan.buildDecision(result);
 * ```
 */

// Vision scan compat
export {
  executeVisionScan,
  buildVisionDecisionData,
  type VisionScanResultData,
} from './visionScanCompat';

// Photo scan compat
export {
  executePhotoScan,
  buildPhotoDecisionData,
  type PhotoScanResultData,
} from './photoScanCompat';

// Re-export scan classes for convenience
export { TestScan } from './testScanCompat';
export { SeparatorScan } from './separatorScanCompat';
export { TestDesignScan } from './testDesignScanCompat';
export { ScreenCoverageScan } from './screenCoverageScanCompat';
export { FeatureContextsScan } from './contextsScanCompat';
export { UnusedScan } from './unusedScanCompat';
export { BuildScan } from './buildScanCompat';
