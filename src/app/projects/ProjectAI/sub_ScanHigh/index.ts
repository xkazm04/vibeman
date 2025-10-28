// Export all components from sub_ScanHigh module
export { default as AIDocsDisplay } from './components/AIDocsDisplay';
export { default as ScanHighModalContent } from './components/ScanHighModalContent';
export { default as LoadingAnimation } from './components/LoadingAnimation';

// NEW: Redesigned high-level docs components
export { default as HighLevelDocsModal } from './components/HighLevelDocsModal';
export { default as DocsViewer } from './components/DocsViewer';
export { default as DocsGenerator } from './components/DocsGenerator';

// Export hooks
export { useGenerateAIDocs } from './hooks/useGenerateAIDocs';
export { useHighLevelDocs } from './hooks/useHighLevelDocs';

// Export lib functions (generateAIReview moved to server-side API)
export {
  saveGeneratedContent,
  validateMarkdownContent,
  prepareContentForSave
} from './lib/fileOperations';
export type { SaveFileRequest, SaveFileResponse } from './lib/fileOperations';

// Export improved prompt builder
export { buildHighLevelDocsPrompt } from './lib/improvedPrompt';