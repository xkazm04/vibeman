/**
 * Scan Strategy Plugin System
 *
 * This module provides a plugin-based architecture for scanning different
 * technology stacks. Each tech stack has its own strategy implementation
 * with custom file patterns, ignore rules, and refactoring opportunity detection.
 *
 * Usage:
 * ```typescript
 * import { getScanStrategy } from '@/lib/scan';
 *
 * const strategy = await getScanStrategy(projectPath, 'nextjs');
 * const files = await strategy.scanProjectFiles(projectPath);
 * const opportunities = strategy.detectOpportunities(files);
 * ```
 */

// Export main interfaces and types
export type {
  ScanStrategy,
  ProjectType,
  ScanStrategyMetadata,
} from './ScanStrategy';

export { BaseScanStrategy } from './ScanStrategy';

// Export factory and convenience functions
export {
  ScanStrategyFactory,
  getScanStrategy,
  getAllScanStrategies,
  registerScanStrategy,
} from './ScanStrategyFactory';

// Export concrete strategy implementations
export { NextJSScanStrategy } from './strategies/NextJSScanStrategy';
export { FastAPIScanStrategy } from './strategies/FastAPIScanStrategy';
export { ExpressScanStrategy } from './strategies/ExpressScanStrategy';
export { ReactNativeScanStrategy } from './strategies/ReactNativeScanStrategy';
