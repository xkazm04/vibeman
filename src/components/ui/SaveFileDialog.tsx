import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Folder, FileText, AlertCircle } from 'lucide-react';
import FolderSelector from '../FolderSelector';

interface SaveFileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (folderPath: string, fileName: string) => Promise<void>;
  title: string;
  description?: string;
  defaultFileName?: string;
  defaultFolder?: string;
  fileExtension?: string;
}

export default function SaveFileDialog({
  isOpen,
  onClose,
  onSave,
  title,
  description,
  defaultFileName = 'document.md',
  defaultFolder = 'docs',
  fileExtension = '.md'
}: SaveFileDialogProps) {
  const [selectedFolder, setSelectedFolder] = useState<string>(defaultFolder);
  const [fileName, setFileName] = useState(defaultFileName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!selectedFolder) {
      setError('Please select a folder');
      return;
    }

    if (!fileName.trim()) {
      setError('Please enter a file name');
      return;
    }

    // Ensure the file name ends with the correct extension
    const finalFileName = fileName.endsWith(fileExtension) ? fileName : `${fileName}${fileExtension}`;

    setSaving(true);
    setError(null);

    try {
      await onSave(selectedFolder, finalFileName);
      // Close dialog after successful save
      handleClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (selectedFolder && fileName.trim() && !saving) {
        handleSave();
      }
    }
  };

  const handleClose = () => {
    if (!saving) {
      setSelectedFolder(defaultFolder);
      setFileName(defaultFileName);
      setError(null);
      onClose();
    }
  };

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
          className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50">
            <div className="flex items-center space-x-3">
              <Save className="w-5 h-5 text-cyan-400" />
              <div>
                <h2 className="text-lg font-semibold text-white font-mono">
                  {title}
                </h2>
                {description && (
                  <p className="text-sm text-gray-400">
                    {description}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleClose}
              disabled={saving}
              className="p-1 hover:bg-gray-700 rounded-sm transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Error Display */}
            {error && (
              <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-red-400 text-sm">{error}</span>
              </div>
            )}

            {/* File Name Input */}
            <form onSubmit={handleSave} className="p-4 border-b border-gray-700">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                File Name
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={saving}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50"
                  placeholder="Enter file name..."
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                File will be saved as: <span className="font-mono text-cyan-400">{fileName.endsWith(fileExtension) ? fileName : `${fileName}${fileExtension}`}</span>
              </p>
            </form>

            {/* Folder Selection */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-4 pb-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Folder
                </label>
              </div>
              
              <div className="flex-1 overflow-hidden px-4">
                <FolderSelector
                  onSelect={setSelectedFolder}
                  selectedPath={selectedFolder}
                  className="h-full custom-scrollbar"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700 bg-gray-800/30">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                {selectedFolder ? (
                  <span>
                    Saving to: <span className="font-mono text-cyan-400">{selectedFolder}/{fileName.endsWith(fileExtension) ? fileName : `${fileName}${fileExtension}`}</span>
                  </span>
                ) : (
                  <span>Select a folder to continue</span>
                )}
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleClose}
                  disabled={saving}
                  className="px-4 py-2 text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleSave}
                  disabled={!selectedFolder || !fileName.trim() || saving}
                  className="flex items-center space-x-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save File</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}