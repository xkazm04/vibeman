'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { SimpleSpinner } from '@/components/ui';

// Lazy load Monaco Editor - this prevents the ~10MB bundle from loading on initial page load
const MonacoEditor = dynamic(() => import('./MonacoEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full min-h-[400px] bg-gray-900">
      <div className="flex flex-col items-center space-y-3">
        <SimpleSpinner size="lg" color="cyan" />
        <span className="text-sm text-gray-400">Loading editor...</span>
      </div>
    </div>
  ),
});

// Re-export all props types
export type { EditorInstance } from './MonacoEditor';

// Export the lazy-loaded component as the default
export default MonacoEditor;
