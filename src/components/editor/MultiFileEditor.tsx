import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, RotateCcw, AlertCircle, FileText, Loader2 } from 'lucide-react';
import MonacoEditor from './MonacoEditor';
import FileTab from './FileTab';
import { getLanguageFromFilename, isBinaryFile } from './editorUtils';
import { loadFileContent } from './fileApi';

interface FileContent {
  path: string;
  content: string;
  originalContent: string;
  language: string;
  loading: boolean;
  error?: string;
}

interface MultiFileEditorProps {
  isOpen: boolean;
  onClose: () => void;
  filePaths: string[];
  title?: string;
  readOnly?: boolean;
  onSave?: (filePath: string, content: string) => Promise<void>;
}

export default function MultiFileEditor({
  isOpen,
  onClose,
  filePaths,
  title = 'File Editor',
  readOnly = false,
  onSave,
}: MultiFileEditorProps) {
  const [files, setFiles] = useState<Record<string, FileContent>>({});
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Initialize files when modal opens
  useEffect(() => {
    if (isOpen && filePaths.length > 0) {
      initializeFiles();
    }
  }, [isOpen, filePaths]);

  const initializeFiles = async () => {
    const newFiles: Record<string, FileContent> = {};
    
    for (const filePath of filePaths) {
      if (isBinaryFile(filePath)) {
        newFiles[filePath] = {
          path: filePath,
          content: '',
          originalContent: '',
          language: 'plaintext',
          loading: false,
          error: 'Binary file - cannot display content',
        };
      } else {
        newFiles[filePath] = {
          path: filePath,
          content: '',
          originalContent: '',
          language: getLanguageFromFilename(filePath),
          loading: true,
        };
      }
    }
    
    setFiles(newFiles);
    setActiveFile(filePaths[0]);
    
    // Load file contents
    for (const filePath of filePaths) {
      if (!isBinaryFile(filePath)) {
        loadFileContentForPath(filePath);
      }
    }
  };

  const loadFileContentForPath = async (filePath: string) => {
    try {
      const content = await loadFileContent(filePath);
      
      setFiles(prev => ({
        ...prev,
        [filePath]: {
          ...prev[filePath],
          content,
          originalContent: content,
          loading: false,
        },
      }));
    } catch (error) {
      console.error('Failed to load file:', error);
      setFiles(prev => ({
        ...prev,
        [filePath]: {
          ...prev[filePath],
          error: 'Failed to load file content',
          loading: false,
        },
      }));
    }
  };

  const handleFileChange = useCallback((filePath: string, newContent: string) => {
    setFiles(prev => ({
      ...prev,
      [filePath]: {
        ...prev[filePath],
        content: newContent,
      },
    }));
  }, []);

  const handleSaveFile = async (filePath: string) => {
    if (!onSave) return;
    
    setSaving(filePath);
    try {
      await onSave(filePath, files[filePath].content);
      
      // Update original content to mark as saved
      setFiles(prev => ({
        ...prev,
        [filePath]: {
          ...prev[filePath],
          originalContent: prev[filePath].content,
        },
      }));
    } catch (error) {
      console.error('Failed to save file:', error);
      // You could show a toast notification here
    } finally {
      setSaving(null);
    }
  };

  const handleRevertFile = (filePath: string) => {
    setFiles(prev => ({
      ...prev,
      [filePath]: {
        ...prev[filePath],
        content: prev[filePath].originalContent,
      },
    }));
  };

  const handleCloseFile = (filePath: string) => {
    const fileKeys = Object.keys(files);
    const currentIndex = fileKeys.indexOf(filePath);
    
    // Remove file from state
    setFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[filePath];
      return newFiles;
    });
    
    // Update active file if necessary
    if (activeFile === filePath) {
      const remainingFiles = fileKeys.filter(key => key !== filePath);
      if (remainingFiles.length > 0) {
        // Select next file or previous if at end
        const nextIndex = currentIndex < remainingFiles.length ? currentIndex : currentIndex - 1;
        setActiveFile(remainingFiles[nextIndex]);
      } else {
        setActiveFile(null);
      }
    }
  };

  const handleClose = () => {
    setFiles({});
    setActiveFile(null);
    setSaving(null);
    onClose();
  };

  const isDirty = (filePath: string): boolean => {
    const file = files[filePath];
    return file && file.content !== file.originalContent;
  };

  const hasUnsavedChanges = Object.keys(files).some(isDirty);
  const activeFileData = activeFile ? files[activeFile] : null;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-6xl h-[80vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white font-mono">{title}</h2>
              {hasUnsavedChanges && (
                <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full">
                  Unsaved changes
                </span>
              )}
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-700 rounded-sm transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* File Tabs */}
          {Object.keys(files).length > 0 && (
            <div className="flex bg-gray-900 border-b border-gray-700 overflow-x-auto">
              {Object.keys(files).map((filePath) => (
                <FileTab
                  key={filePath}
                  filename={filePath}
                  isActive={activeFile === filePath}
                  isDirty={isDirty(filePath)}
                  onSelect={() => setActiveFile(filePath)}
                  onClose={() => handleCloseFile(filePath)}
                />
              ))}
            </div>
          )}

          {/* Editor Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {!activeFileData ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No file selected</p>
                  <p className="text-sm">Select a file tab to view its content</p>
                </div>
              </div>
            ) : activeFileData.loading ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
                  <p className="text-sm">Loading file content...</p>
                </div>
              </div>
            ) : activeFileData.error ? (
              <div className="flex-1 flex items-center justify-center text-red-400">
                <div className="text-center">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">Cannot display file</p>
                  <p className="text-sm">{activeFileData.error}</p>
                </div>
              </div>
            ) : (
              <>
                {/* Editor Toolbar */}
                {!readOnly && (
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-800/30 border-b border-gray-700/50">
                    <div className="flex items-center space-x-2 text-xs text-gray-400">
                      <span>Language: {activeFileData.language}</span>
                      <span>•</span>
                      <span>Lines: {activeFileData.content.split('\n').length}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isDirty(activeFile!) && (
                        <button
                          onClick={() => handleRevertFile(activeFile!)}
                          className="flex items-center space-x-1 px-2 py-1 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-sm transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Revert</span>
                        </button>
                      )}
                      {onSave && (
                        <button
                          onClick={() => handleSaveFile(activeFile!)}
                          disabled={saving === activeFile || !isDirty(activeFile!)}
                          className="flex items-center space-x-1 px-2 py-1 text-xs bg-cyan-500/20 text-cyan-400 rounded-sm hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {saving === activeFile ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          <span>{saving === activeFile ? 'Saving...' : 'Save'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Monaco Editor */}
                <div className="flex-1">
                  <MonacoEditor
                    value={activeFileData.content}
                    onChange={(value) => handleFileChange(activeFile!, value)}
                    language={activeFileData.language}
                    readOnly={readOnly}
                    options={{
                      minimap: { enabled: Object.keys(files).length === 1 },
                      wordWrap: 'on',
                      automaticLayout: true,
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}