import React, { useRef, useEffect, useState } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

interface MonacoEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  theme?: 'vs-dark' | 'light' | 'vs';
  readOnly?: boolean;
  height?: string | number;
  width?: string | number;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
  onMount?: (editor: monaco.editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => void;
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
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  // Default editor options with best practices
  const defaultOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
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

    // Configure Monaco themes and languages
    configureMonaco(monacoInstance);

    // Disable error markers and diagnostics
    const model = editor.getModel();
    if (model) {
      // Disable all diagnostics for this model
      monacoInstance.editor.setModelMarkers(model, 'typescript', []);
      monacoInstance.editor.setModelMarkers(model, 'javascript', []);
      
      // Listen for marker changes and clear them
      const disposable = monacoInstance.editor.onDidChangeMarkers(() => {
        monacoInstance.editor.setModelMarkers(model, 'typescript', []);
        monacoInstance.editor.setModelMarkers(model, 'javascript', []);
      });
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

  // Configure Monaco with custom themes and language features
  const configureMonaco = (monacoInstance: typeof monaco) => {
    // Define custom dark theme
    monacoInstance.editor.defineTheme('vibeman-dark', {
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
      },
    });

    // Set the custom theme as default
    if (theme === 'vs-dark') {
      monacoInstance.editor.setTheme('vibeman-dark');
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
export type EditorInstance = monaco.editor.IStandaloneCodeEditor;