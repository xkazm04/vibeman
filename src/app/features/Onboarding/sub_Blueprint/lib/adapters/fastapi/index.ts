/**
 * FastAPI Scan Adapters
 *
 * Collection of scan adapters specifically designed for FastAPI projects.
 * These adapters are EXAMPLES to demonstrate the plugin architecture.
 */

export { FastAPIStructureAdapter } from './FastAPIStructureAdapter';
export { FastAPIBuildAdapter } from './FastAPIBuildAdapter';

import { FastAPIStructureAdapter } from './FastAPIStructureAdapter';
import { FastAPIBuildAdapter } from './FastAPIBuildAdapter';
import { ScanAdapter } from '../types';

/**
 * Get all FastAPI adapters as an array
 */
export function getAllFastAPIAdapters(): ScanAdapter[] {
  return [
    new FastAPIBuildAdapter(),
    new FastAPIStructureAdapter(),
    // TODO: Add more FastAPI adapters
    // new FastAPIDependencyAdapter(),
    // new FastAPIContextsAdapter(),
  ];
}
