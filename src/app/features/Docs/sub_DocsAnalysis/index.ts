/**
 * DocsAnalysis Component Index
 * Export all components for the documentation analysis module
 */

export { default as DocsAnalysisLayout } from './DocsAnalysisLayout';
export { default as SystemMap } from './components/SystemMap';
export { default as ModuleExplorer } from './components/ModuleExplorer';
export { default as ContextDocumentation } from './components/ContextDocumentation';

// Re-export types
export * from './lib/types';

// Re-export mock data helpers (for testing/development)
export {
  systemModules,
  useCases,
  apisAndLibraries,
  dataSources,
  getModuleById,
  getUseCaseById,
  getUseCasesByModuleId,
  getApisForUseCase,
  getDataSourcesForUseCase,
  getModulesByLayer,
} from './lib/mockData';
