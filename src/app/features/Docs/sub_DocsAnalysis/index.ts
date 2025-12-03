/**
 * DocsAnalysis Component Index
 * Export all components for the documentation analysis module
 */

export { default as DocsAnalysisLayout } from './DocsAnalysisLayout';
export { default as SystemMap } from './components/SystemMap';
export { default as ModuleExplorer } from './components/ModuleExplorer';
export { default as ContextDocumentation } from './components/ContextDocumentation';

// X-Ray Mode components for real-time data flow visualization
export { XRayModeToggle, XRaySystemMap, XRayHotPathsPanel } from '../sub_XRay';

// Re-export types
export * from './lib/types';
export * from './lib/xrayTypes';

// Re-export navigation hook (reusable for other exploratory modules)
export { useArchitectureNavigation, ZOOM_CONFIGS } from './lib/useArchitectureNavigation';
export type { UseArchitectureNavigationReturn } from './lib/useArchitectureNavigation';
