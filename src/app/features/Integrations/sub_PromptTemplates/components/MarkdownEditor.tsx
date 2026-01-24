'use client';

/**
 * MarkdownEditor
 * Wrapper for @uiw/react-md-editor with dark theme styling
 */

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

// Dynamic import to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  disabled?: boolean;
  previewMode?: 'edit' | 'live' | 'preview';
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write your content here...',
  height = 300,
  disabled = false,
  previewMode = 'live',
}: MarkdownEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="w-full rounded-lg bg-gray-900/80 border border-gray-700/50 animate-pulse"
        style={{ height }}
      />
    );
  }

  return (
    <div data-color-mode="dark" className="markdown-editor-wrapper">
      <MDEditor
        value={value}
        onChange={(val) => onChange(val || '')}
        height={height}
        preview={previewMode}
        textareaProps={{
          placeholder,
          disabled,
        }}
        visibleDragbar={false}
        hideToolbar={disabled}
      />
      <style jsx global>{`
        .markdown-editor-wrapper .w-md-editor {
          background: rgba(17, 24, 39, 0.8) !important;
          border: 1px solid rgba(75, 85, 99, 0.5) !important;
          border-radius: 0.5rem !important;
          box-shadow: none !important;
        }
        .markdown-editor-wrapper .w-md-editor:focus-within {
          border-color: rgba(139, 92, 246, 0.5) !important;
        }
        .markdown-editor-wrapper .w-md-editor-toolbar {
          background: rgba(31, 41, 55, 0.6) !important;
          border-bottom: 1px solid rgba(75, 85, 99, 0.3) !important;
          padding: 4px 8px !important;
        }
        .markdown-editor-wrapper .w-md-editor-toolbar li > button {
          color: #9ca3af !important;
        }
        .markdown-editor-wrapper .w-md-editor-toolbar li > button:hover {
          color: #fff !important;
          background: rgba(75, 85, 99, 0.5) !important;
        }
        .markdown-editor-wrapper .w-md-editor-text-input {
          color: #e5e7eb !important;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
          font-size: 0.875rem !important;
        }
        .markdown-editor-wrapper .w-md-editor-text-input::placeholder {
          color: #6b7280 !important;
        }
        .markdown-editor-wrapper .w-md-editor-preview {
          background: rgba(17, 24, 39, 0.5) !important;
          padding: 12px !important;
        }
        .markdown-editor-wrapper .wmde-markdown {
          background: transparent !important;
          color: #e5e7eb !important;
          font-size: 0.875rem !important;
        }
        .markdown-editor-wrapper .wmde-markdown code {
          background: rgba(139, 92, 246, 0.15) !important;
          color: #c4b5fd !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
        }
        .markdown-editor-wrapper .wmde-markdown pre {
          background: rgba(31, 41, 55, 0.8) !important;
          border: 1px solid rgba(75, 85, 99, 0.3) !important;
        }
        .markdown-editor-wrapper .w-md-editor-bar {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
