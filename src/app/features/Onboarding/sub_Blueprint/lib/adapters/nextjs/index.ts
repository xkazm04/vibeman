/**
 * NextJS Scan Adapters
 *
 * Collection of scan adapters specifically designed for Next.js projects.
 */

export { NextJSBuildAdapter } from './NextJSBuildAdapter';
export { NextJSStructureAdapter } from './NextJSStructureAdapter';
export { NextJSContextsAdapter } from './NextJSContextsAdapter';

import { NextJSBuildAdapter } from './NextJSBuildAdapter';
import { NextJSStructureAdapter } from './NextJSStructureAdapter';
import { NextJSContextsAdapter } from './NextJSContextsAdapter';
import { ScanAdapter } from '../types';

/**
 * Get all NextJS adapters as an array
 */
export function getAllNextJSAdapters(): ScanAdapter[] {
  return [new NextJSBuildAdapter(), new NextJSStructureAdapter(), new NextJSContextsAdapter()];
}
