'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Lazy load Monaco Editor - this prevents the ~10MB bundle from loading on initial page load
const MonacoEditor = dynamic(() => import('./MonacoEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full min-h-[400px] bg-gray-900">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-gray-400">Loading editor...</span>
      </div>
    </div>
  ),
});

// Re-export all props types
export type { EditorInstance } from './MonacoEditor';

// Export the lazy-loaded component as the default
export default MonacoEditor;
