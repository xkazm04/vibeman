'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, FileCode } from 'lucide-react';
import MonacoEditor from '@/components/editor/MonacoEditor';

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
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load file content
  useEffect(() => {
    if (!isOpen || !filePath) return;

    setIsLoading(true);
    setError(null);

    fetch('/api/disk/read-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setContent(data.content || '');
          setOriginalContent(data.content || '');
          setHasChanges(false);
        } else {
          setError(data.error || 'Failed to load file');
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load file');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, filePath]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/disk/write-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, content }),
      });

      const data = await res.json();

      if (data.success) {
        setOriginalContent(content);
        setHasChanges(false);
      } else {
        setError(data.error || 'Failed to save file');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save file';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

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
            <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-700/50 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
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
                  {hasChanges && (
                    <span className="text-sm text-amber-400 flex items-center gap-1">
                      <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                      Unsaved changes
                    </span>
                  )}
                  <button
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
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/20">
                  <p className="text-sm text-red-400">{error}</p>
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
                ) : (
                  <MonacoEditor
                    height={'500px'}
                    value={content}
                    language={getLanguage(filePath)}
                    onChange={handleContentChange}
                    readOnly={false}
                  />
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-gray-700/50 bg-gray-900/50">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div>
                    Language: <span className="text-gray-400 font-mono">{getLanguage(filePath)}</span>
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
