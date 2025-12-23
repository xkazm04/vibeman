// Editor Components - MonacoEditor is lazy-loaded to reduce initial bundle size (~10MB)
export { default as MonacoEditor } from './LazyMonacoEditor';
export { default as MonacoDiffEditor } from './MonacoDiffEditor';
export { default as MultiFileEditor } from './MultiFileEditor';
export { default as FileTab } from './FileTab';

// Editor Utilities
export * from './editorUtils';

// Types
export type { EditorInstance } from './MonacoEditor';