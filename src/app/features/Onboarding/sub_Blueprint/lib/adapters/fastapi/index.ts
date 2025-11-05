/**
 * FastAPI Scan Adapters
 *
 * Collection of scan adapters specifically designed for FastAPI projects.
 * These adapters are EXAMPLES to demonstrate the plugin architecture.
 */

export { FastAPIStructureAdapter } from './FastAPIStructureAdapter';

import { FastAPIStructureAdapter } from './FastAPIStructureAdapter';
import { ScanAdapter } from '../types';

/**
 * Get all FastAPI adapters as an array
 *
 * NOTE: These adapters are currently examples/stubs.
 * Implement full functionality as needed for FastAPI support.
 */
export function getAllFastAPIAdapters(): ScanAdapter[] {
  return [
    new FastAPIStructureAdapter(),
    // TODO: Add more FastAPI adapters
    // new FastAPIBuildAdapter(),
    // new FastAPIDependencyAdapter(),
  ];
}
