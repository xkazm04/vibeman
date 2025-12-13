/**
 * Architecture Evolution Feature Module
 * Living Architecture Evolution Graph
 */

// Main component
export { default as ArchitectureEvolution } from './ArchitectureEvolution';

// Sub-components
export { default as ArchitectureGraph } from './components/ArchitectureGraph';
export { default as NodeDetailPanel } from './components/NodeDetailPanel';
export { default as DriftsList } from './components/DriftsList';
export { default as SuggestionsList } from './components/SuggestionsList';

// Note: Server-only functions (analyzeProjectArchitecture, generateArchitectureSuggestions, etc.)
// are NOT exported here to avoid client-side bundling of Node.js modules (fs, path).
// Import directly from './lib/graphAnalyzer' or './lib/suggestionGenerator' in API routes only.
