/**
 * DocsAnalysis Query Hooks - Re-export from modular structure
 * @deprecated Import from './queries' instead
 */

export {
  // Query keys
  docsAnalysisQueryKeys,
  prefetchQueryKeys,
  // Data queries
  useProjectContextData,
  useRelationships,
  useInvalidateDocsAnalysis,
  // Mutations
  useUpdateGroup,
  useCreateRelationship,
  useDeleteRelationship,
  // Prefetch hooks
  useDocsAnalysisPrefetch,
} from './queries';
