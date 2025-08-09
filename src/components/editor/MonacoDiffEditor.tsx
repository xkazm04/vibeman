import React, { useEffect, useRef } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

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
  options?: monaco.editor.IDiffEditorConstructionOptions;
  onChange?: (value: string) => void; // modified content stream
  onMount?: (editor: monaco.editor.IStandaloneDiffEditor, monacoApi: typeof monaco) => void;
  className?: string;
  loading?: React.ReactNode;
}

function ensureVibemanTheme(m: typeof monaco, pickedTheme?: Theme) {
  if ((m as any).__vibemanThemeDefined) {
    if (pickedTheme === 'vs-dark') m.editor.setTheme('vibeman-dark');
    return;
  }
  m.editor.defineTheme('vibeman-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'keyword', foreground: '569CD6' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'type', foreground: '4EC9B0' },
      { token: 'class', foreground: '4EC9B0' },
      { token: 'function', foreground: 'DCDCAA' },
      { token: 'variable', foreground: '9CDCFE' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editor.lineHighlightBackground': '#2d2d30',
      'editor.selectionBackground': '#264f78',
      'editor.inactiveSelectionBackground': '#3a3d41',
      'editorCursor.foreground': '#aeafad',
      'editorWhitespace.foreground': '#404040',
      'editorIndentGuide.background': '#404040',
      'editorIndentGuide.activeBackground': '#707070',
      'diffEditor.insertedTextBackground': '#2b5a2b55',
      'diffEditor.removedTextBackground': '#7a2b2b55',
    },
  });
  (m as any).__vibemanThemeDefined = true;
  if (pickedTheme === 'vs-dark') m.editor.setTheme('vibeman-dark');
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
  const editorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
  const disposersRef = useRef<monaco.IDisposable[]>([]);

  useEffect(() => {
    return () => {
      disposersRef.current.forEach(d => d.dispose());
      if (editorRef.current) editorRef.current.dispose();
    };
  }, []);

  const handleMount = (editor: monaco.editor.IStandaloneDiffEditor, monacoApi: typeof monaco) => {
    editorRef.current = editor;
    ensureVibemanTheme(monacoApi, theme);

    if (onChange) {
      const modifiedModel = editor.getModifiedEditor().getModel();
      if (modifiedModel) {
        const disp = modifiedModel.onDidChangeContent(() => {
          onChange(editor.getModifiedEditor().getValue());
        });
        disposersRef.current.push(disp);
      }
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

  const diffOpts: monaco.editor.IDiffEditorConstructionOptions = {
    renderSideBySide,
    readOnly,
    originalEditable: false,
    enableSplitViewResizing: true,
    ignoreTrimWhitespace: true,
    diffAlgorithm: 'advanced',
    automaticLayout: true,
    minimap: { enabled: true },
    renderMarginRevertIcon: true,
    ...options,
  };

  return (
    <div className={`monaco-diff-editor-container ${className}`} style={{ height, width }}>
      <DiffEditor
        height={height}
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