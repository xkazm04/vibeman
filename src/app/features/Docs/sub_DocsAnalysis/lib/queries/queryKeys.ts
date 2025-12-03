/**
 * Query key factory for consistent cache keys
 * Used across all React Query hooks in DocsAnalysis
 */

// Query key factory for consistent cache keys
export const docsAnalysisQueryKeys = {
  all: ['docsAnalysis'] as const,
  contexts: () => [...docsAnalysisQueryKeys.all, 'contexts'] as const,
  contextsByProject: (projectId: string) =>
    [...docsAnalysisQueryKeys.contexts(), projectId] as const,
  groups: () => [...docsAnalysisQueryKeys.all, 'groups'] as const,
  groupsByProject: (projectId: string) => [...docsAnalysisQueryKeys.groups(), projectId] as const,
  relationships: () => [...docsAnalysisQueryKeys.all, 'relationships'] as const,
  relationshipsByProject: (projectId: string) =>
    [...docsAnalysisQueryKeys.relationships(), projectId] as const,
  projectData: (projectId: string) =>
    [...docsAnalysisQueryKeys.all, 'projectData', projectId] as const,
};

// Query key factories for prefetch-specific data
export const prefetchQueryKeys = {
  groupContexts: (groupId: string) =>
    [...docsAnalysisQueryKeys.all, 'prefetch', 'groupContexts', groupId] as const,
  contextDescription: (contextId: string) =>
    [...docsAnalysisQueryKeys.all, 'prefetch', 'contextDescription', contextId] as const,
};
