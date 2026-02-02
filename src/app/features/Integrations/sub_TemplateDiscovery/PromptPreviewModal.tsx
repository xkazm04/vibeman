/**
 * Prompt Preview Modal
 * Full-screen modal for viewing generated research prompt in Monaco editor
 */

'use client';

import { useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Lazy load Monaco Editor to avoid initial bundle bloat
const MonacoEditor = dynamic(() => import('@/components/editor/LazyMonacoEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[500px] bg-gray-900">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-gray-400">Loading editor...</span>
      </div>
    </div>
  ),
});

interface PromptPreviewModalProps {
  isOpen: boolean;
  content: string;
  onClose: () => void;
  onConfirmGenerate: () => void;
}

export function PromptPreviewModal({
  isOpen,
  content,
  onClose,
  onConfirmGenerate,
}: PromptPreviewModalProps) {
  // Handle escape key to close modal
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-4xl max-h-[80vh] mx-4 bg-gray-800 border border-gray-700 rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100">Prompt Preview</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 overflow-hidden" style={{ height: '500px' }}>
          <MonacoEditor
            value={content}
            language="markdown"
            readOnly={true}
            height="500px"
            options={{
              minimap: { enabled: false },
              lineNumbers: 'off',
              folding: true,
              wordWrap: 'on',
              scrollBeyondLastLine: false,
            }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-300 hover:text-gray-100 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmGenerate();
              onClose();
            }}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors"
          >
            Generate File
          </button>
        </div>
      </div>
    </div>
  );
}
