/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useEffect, useState } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import { defineVibemanTheme, clearErrorMarkers, setupMarkerClearer } from './editorTheme';

interface MonacoEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  theme?: 'vs-dark' | 'light' | 'vs';
  readOnly?: boolean;
  height?: string | number;
  width?: string | number;
  options?: any;
  onMount?: (editor: any, monaco: any) => void;
  loading?: React.ReactNode;
  className?: string;
}

export default function MonacoEditor({
  value,
  onChange,
  language = 'typescript',
  theme = 'vs-dark',
  readOnly = false,
  height = '100%',
  width = '100%',
  options = {},
  onMount,
  loading,
  className = '',
}: MonacoEditorProps) {
  const editorRef = useRef<any>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  // Default editor options with best practices
  const defaultOptions: any = {
    minimap: { enabled: true },
    fontSize: 14,
    fontFamily: 'JetBrains Mono, Fira Code, Monaco, Consolas, monospace',
    lineNumbers: 'on',
    roundedSelection: false,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'on',
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true,
    },
    suggest: {
      showKeywords: true,
      showSnippets: true,
    },
    quickSuggestions: {
      other: true,
      comments: true,
      strings: true,
    },
    folding: true,
    foldingHighlight: true,
    showFoldingControls: 'always',
    matchBrackets: 'always',
    renderWhitespace: 'selection',
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    smoothScrolling: true,
    readOnly,
    // Disable error highlighting and diagnostics
    glyphMargin: false,
    renderValidationDecorations: 'off',
    ...options,
  };

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    setIsEditorReady(true);

    // Configure Monaco themes
    defineVibemanTheme(monacoInstance);
    if (theme === 'vs-dark') {
      monacoInstance.editor.setTheme('vibeman-dark');
    }

    // Disable error markers and diagnostics
    const model = editor.getModel();
    if (model) {
      clearErrorMarkers(monacoInstance, model);
      setupMarkerClearer(monacoInstance, model);
    }

    // Focus the editor
    editor.focus();

    // Call custom onMount if provided
    if (onMount) {
      onMount(editor, monacoInstance);
    }
  };

  const handleEditorChange: OnChange = (value) => {
    if (onChange && value !== undefined) {
      onChange(value);
    }
  };

  // Expose editor instance through ref
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };
  }, []);

  // Ensure minimum height for visibility
  const editorHeight = height === '100%' ? '100%' : height;
  const containerStyle = {
    height: editorHeight,
    width,
    minHeight: '400px' // Ensure minimum visible height
  };

  return (
    <div className={`monaco-editor-container ${className}`} style={containerStyle}>
      <Editor
        height={editorHeight}
        width={width}
        language={language}
        value={value}
        theme={theme === 'vs-dark' ? 'vibeman-dark' : theme}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={defaultOptions}
        loading={loading || (
          <div className="flex items-center justify-center h-full bg-gray-900">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-400">Loading editor...</span>
            </div>
          </div>
        )}
      />
    </div>
  );
}

// Export the editor instance type for external use
export type EditorInstance = any;