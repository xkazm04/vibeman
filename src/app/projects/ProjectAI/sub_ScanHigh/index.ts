// Export all components from sub_ScanHigh module
export { default as AIDocsDisplay } from './components/AIDocsDisplay';
export { default as ScanHighModalContent } from './components/ScanHighModalContent';
export { default as LoadingAnimation } from './components/LoadingAnimation';

// Export hooks
export { useGenerateAIDocs } from './hooks/useGenerateAIDocs';

// Export lib functions (generateAIReview moved to server-side API)
export { 
  saveGeneratedContent, 
  validateMarkdownContent, 
  prepareContentForSave 
} from './lib/fileOperations';
export type { SaveFileRequest, SaveFileResponse } from './lib/fileOperations';