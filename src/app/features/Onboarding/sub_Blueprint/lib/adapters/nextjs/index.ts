/**
 * NextJS Scan Adapters
 *
 * Collection of scan adapters specifically designed for Next.js projects.
 */

export { NextJSBuildAdapter } from './NextJSBuildAdapter';
export { NextJSStructureAdapter } from './NextJSStructureAdapter';
export { NextJSContextsAdapter } from './NextJSContextsAdapter';
export { NextJSPhotoAdapter } from './NextJSPhotoAdapter';
export { NextJSVisionAdapter } from './NextJSVisionAdapter';
export { NextJSSelectorsAdapter } from './NextJSSelectorsAdapter';
export { NextJSUnusedAdapter } from './NextJSUnusedAdapter';

import { NextJSBuildAdapter } from './NextJSBuildAdapter';
import { NextJSStructureAdapter } from './NextJSStructureAdapter';
import { NextJSContextsAdapter } from './NextJSContextsAdapter';
import { NextJSPhotoAdapter } from './NextJSPhotoAdapter';
import { NextJSVisionAdapter } from './NextJSVisionAdapter';
import { NextJSSelectorsAdapter } from './NextJSSelectorsAdapter';
import { NextJSUnusedAdapter } from './NextJSUnusedAdapter';
import { ScanAdapter } from '../types';

/**
 * Get all NextJS adapters as an array
 */
export function getAllNextJSAdapters(): ScanAdapter[] {
  return [
    new NextJSBuildAdapter(),
    new NextJSStructureAdapter(),
    new NextJSContextsAdapter(),
    new NextJSPhotoAdapter(),
    new NextJSVisionAdapter(),
    new NextJSSelectorsAdapter(),
    new NextJSUnusedAdapter(),
  ];
}
