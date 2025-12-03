/**
 * DocsAnalysis Query Hooks - Barrel Export
 * Re-exports all query-related functionality
 */

// Query keys
export { docsAnalysisQueryKeys, prefetchQueryKeys } from './queryKeys';

// API client
export {
  fetchProjectContextData,
  fetchRelationships,
  updateGroupApi,
  createRelationshipApi,
  deleteRelationshipApi,
} from './apiClient';

// Data queries
export { useProjectContextData, useRelationships, useInvalidateDocsAnalysis } from './useDataQueries';

// Mutations
export { useUpdateGroup, useCreateRelationship, useDeleteRelationship } from './useMutations';

// Prefetch hooks
export {
  usePrefetchGroupContexts,
  usePrefetchContextDocumentation,
  useDocsAnalysisPrefetch,
} from './usePrefetch';
