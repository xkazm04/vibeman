'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, FileCode, Eye } from 'lucide-react';
import MonacoEditor from '@/components/editor/LazyMonacoEditor';
import FileErrorDisplay from './components/FileErrorDisplay';
import { classifyFileError } from './lib/fileOperationErrors';

interface FileOperationState {
  errorMessage: string | null;
  statusCode?: number;
  operation: 'read' | 'write';
}

interface CodePreviewModalProps {
  isOpen: boolean;
  filePath: string;
  onClose: () => void;
}

export default function CodePreviewModal({
  isOpen,
  filePath,
  onClose,
}: CodePreviewModalProps) {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [fileError, setFileError] = useState<FileOperationState | null>(null);

  // Load file content
  const loadFileContent = useCallback(async () => {
    if (!filePath) return;

    setIsLoading(true);
    setFileError(null);

    try {
      const res = await fetch('/api/disk/read-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath }),
      });

      const statusCode = res.status;
      const data = await res.json();

      if (data.success) {
        setContent(data.content || '');
        setOriginalContent(data.content || '');
        setHasChanges(false);
        setFileError(null);
      } else {
        setFileError({
          errorMessage: data.error || 'Failed to load file',
          statusCode,
          operation: 'read',
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load file';
      setFileError({
        errorMessage,
        operation: 'read',
      });
    } finally {
      setIsLoading(false);
    }
  }, [filePath]);

  useEffect(() => {
    if (!isOpen || !filePath) return;
    setIsReadOnly(false);
    loadFileContent();
  }, [isOpen, filePath, loadFileContent]);

  const handleSave = async () => {
    if (isReadOnly) return;

    setIsSaving(true);
    setFileError(null);

    try {
      const res = await fetch('/api/disk/write-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, content }),
      });

      const statusCode = res.status;
      const data = await res.json();

      if (data.success) {
        setOriginalContent(content);
        setHasChanges(false);
        setFileError(null);
      } else {
        setFileError({
          errorMessage: data.error || 'Failed to save file',
          statusCode,
          operation: 'write',
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save file';
      setFileError({
        errorMessage,
        operation: 'write',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetry = useCallback(() => {
    if (fileError?.operation === 'read') {
      loadFileContent();
    } else if (fileError?.operation === 'write') {
      handleSave();
    }
  }, [fileError, loadFileContent]);

  const handleDiscardChanges = useCallback(() => {
    setContent(originalContent);
    setHasChanges(false);
    setFileError(null);
  }, [originalContent]);

  const handleSwitchToReadOnly = useCallback(() => {
    setIsReadOnly(true);
    setFileError(null);
    // Reload the file to get the latest version
    loadFileContent();
  }, [loadFileContent]);

  const handleDismissError = useCallback(() => {
    setFileError(null);
  }, []);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(newContent !== originalContent);
  };

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Get file extension for syntax highlighting
  const getLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      json: 'json',
      md: 'markdown',
      py: 'python',
      css: 'css',
      scss: 'scss',
      html: 'html',
      xml: 'xml',
      yml: 'yaml',
      yaml: 'yaml',
      sh: 'shell',
      bash: 'shell',
      sql: 'sql',
      go: 'go',
      rs: 'rust',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      cs: 'csharp',
      php: 'php',
      rb: 'ruby',
    };
    return languageMap[ext] || 'plaintext';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            data-testid="code-preview-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            <div data-testid="code-preview-modal" className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-700/50 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <FileCode className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Code Preview</h2>
                    <p className="text-sm text-gray-400 font-mono truncate max-w-md">
                      {filePath}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isReadOnly && (
                    <span className="text-sm text-blue-400 flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 rounded-md border border-blue-500/20">
                      <Eye className="w-3.5 h-3.5" />
                      Read-only
                    </span>
                  )}
                  {hasChanges && !isReadOnly && (
                    <span className="text-sm text-amber-400 flex items-center gap-1">
                      <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                      Unsaved changes
                    </span>
                  )}
                  {!isReadOnly && (
                    <button
                      data-testid="code-preview-save-button"
                      onClick={handleSave}
                      disabled={!hasChanges || isSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save
                        </>
                      )}
                    </button>
                  )}
                  <button
                    data-testid="code-preview-close-button"
                    onClick={handleClose}
                    className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Error Display */}
              {fileError && (
                <div className="px-6 py-4 border-b border-gray-700/50">
                  <FileErrorDisplay
                    errorMessage={fileError.errorMessage || ''}
                    filePath={filePath}
                    operation={fileError.operation}
                    statusCode={fileError.statusCode}
                    onRetry={handleRetry}
                    onDismiss={handleDismissError}
                    onDiscardChanges={hasChanges ? handleDiscardChanges : undefined}
                    onSwitchToReadOnly={fileError.operation === 'write' ? handleSwitchToReadOnly : undefined}
                    hasUnsavedChanges={hasChanges}
                  />
                </div>
              )}

              {/* Editor */}
              <div className="flex-1 overflow-hidden">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
                      <p className="text-sm text-gray-400">Loading file...</p>
                    </div>
                  </div>
                ) : fileError?.operation === 'read' ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">Unable to display file content</p>
                  </div>
                ) : (
                  <MonacoEditor
                    height={'500px'}
                    value={content}
                    language={getLanguage(filePath)}
                    onChange={handleContentChange}
                    readOnly={isReadOnly}
                  />
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-gray-700/50 bg-gray-900/50">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-4">
                    <span>
                      Language: <span className="text-gray-400 font-mono">{getLanguage(filePath)}</span>
                    </span>
                    {isReadOnly && (
                      <span className="text-blue-400/70">
                        (Read-only mode)
                      </span>
                    )}
                  </div>
                  <div>
                    Lines: <span className="text-gray-400">{content.split('\n').length}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
