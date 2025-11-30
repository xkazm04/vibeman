/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { defineVibemanTheme, clearErrorMarkers, setupMarkerClearer } from './editorTheme';

type Theme = 'vs-dark' | 'light' | 'vs' | 'vibeman-dark';

export interface MonacoDiffEditorProps {
  original: string;
  modified: string;
  language?: string;
  theme?: Theme;
  height?: string | number;
  width?: string | number;
  readOnly?: boolean;
  renderSideBySide?: boolean;
  options?: any;
  onChange?: (value: string) => void; // modified content stream
  onMount?: (editor: any, monacoApi: any) => void;
  className?: string;
  loading?: React.ReactNode;
}

export default function MonacoDiffEditor({
  original,
  modified,
  language = 'typescript',
  theme = 'vs-dark',
  height = '100%',
  width = '100%',
  readOnly = false,
  renderSideBySide = true,
  options,
  onChange,
  onMount,
  className = '',
  loading,
}: MonacoDiffEditorProps) {
  const editorRef = useRef<any>(null);
  const disposersRef = useRef<any[]>([]);

  useEffect(() => {
    return () => {
      disposersRef.current.forEach(d => d.dispose());
      if (editorRef.current) editorRef.current.dispose();
    };
  }, []);

  const handleMount = (editor: any, monacoApi: any) => {
    editorRef.current = editor;

    // Configure theme
    defineVibemanTheme(monacoApi);
    if (theme === 'vs-dark') {
      monacoApi.editor.setTheme('vibeman-dark');
    }

    // Disable error markers for both editors
    const originalModel = editor.getOriginalEditor().getModel();
    const modifiedModel = editor.getModifiedEditor().getModel();

    if (originalModel) {
      clearErrorMarkers(monacoApi, originalModel);
    }

    if (modifiedModel) {
      clearErrorMarkers(monacoApi, modifiedModel);
      const disposable = setupMarkerClearer(monacoApi, modifiedModel);
      disposersRef.current.push(disposable);
    }

    if (onChange && modifiedModel) {
      const disp = modifiedModel.onDidChangeContent(() => {
        onChange(editor.getModifiedEditor().getValue());
      });
      disposersRef.current.push(disp);
    }

    // Smooth UX
    editor.getOriginalEditor().updateOptions({
      readOnly: true,
      mouseWheelZoom: true,
    });
    editor.getModifiedEditor().updateOptions({
      readOnly,
      mouseWheelZoom: true,
    });

    if (onMount) onMount(editor, monacoApi);
  };

  const diffOpts: any = {
    renderSideBySide,
    readOnly,
    originalEditable: false,
    enableSplitViewResizing: true,
    ignoreTrimWhitespace: true,
    diffAlgorithm: 'advanced',
    automaticLayout: true,
    minimap: { enabled: true },
    renderMarginRevertIcon: true,
    // Disable error highlighting and diagnostics
    glyphMargin: false,
    renderValidationDecorations: 'off',
    ...options,
  };

  // Ensure minimum height for visibility
  const editorHeight = height === '100%' ? '100%' : height;
  const containerStyle = {
    height: editorHeight,
    width,
    minHeight: '400px' // Ensure minimum visible height
  };

  return (
    <div className={`monaco-diff-editor-container ${className}`} style={containerStyle}>
      <DiffEditor
        height={editorHeight}
        width={width}
        language={language}
        theme={theme === 'vs-dark' ? 'vibeman-dark' : theme}
        original={original}
        modified={modified}
        onMount={handleMount}
        options={diffOpts}
        loading={loading || (
          <div className="flex items-center justify-center h-full bg-gray-900">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-400">Loading diff...</span>
            </div>
          </div>
        )}
      />
    </div>
  );
}