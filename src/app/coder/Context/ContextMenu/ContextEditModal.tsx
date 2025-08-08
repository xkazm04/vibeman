import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, AlertCircle, Zap } from 'lucide-react';
import { Context, ContextGroup, useContextStore } from '../../../../stores/contextStore';
import { useActiveProjectStore } from '../../../../stores/activeProjectStore';
import FileAdd from '../../../../components/ui/FileAdd';

interface ContextEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: Context;
  availableGroups: ContextGroup[];
  selectedFilePaths: string[]; // Currently selected files in the tree
}

export default function ContextEditModal({ 
  isOpen, 
  onClose, 
  context, 
  availableGroups, 
  selectedFilePaths 
}: ContextEditModalProps) {
  const { updateContext, loading } = useContextStore();
  const { activeProject } = useActiveProjectStore();
  const [contextName, setContextName] = useState(context.name);
  const [description, setDescription] = useState(context.description || '');
  const [filePaths, setFilePaths] = useState<string[]>(context.filePaths);
  const [selectedGroupId, setSelectedGroupId] = useState(context.groupId);
  const [error, setError] = useState('');
  const [backgroundProcessing, setBackgroundProcessing] = useState(false);

  // Reset form when context changes
  useEffect(() => {
    if (isOpen) {
      setContextName(context.name);
      setDescription(context.description || '');
      setFilePaths([...context.filePaths]);
      setSelectedGroupId(context.groupId);
      setError('');
    }
  }, [context, isOpen]);

  const handleSave = async () => {
    if (!contextName.trim()) {
      setError('Context name is required');
      return;
    }

    if (filePaths.length === 0) {
      setError('At least one file is required');
      return;
    }

    try {
      await updateContext(context.id, {
        name: contextName.trim(),
        description: description.trim(),
        filePaths: filePaths,
        groupId: selectedGroupId,
      });

      handleClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update context');
    }
  };

  const handleClose = () => {
    setContextName(context.name);
    setDescription(context.description || '');
    setFilePaths([...context.filePaths]);
    setSelectedGroupId(context.groupId);
    setError('');
    onClose();
  };

  const handleRemoveFile = (pathToRemove: string) => {
    setFilePaths(prev => prev.filter(path => path !== pathToRemove));
  };

  const handleAddSelectedFiles = () => {
    const newFiles = selectedFilePaths.filter(path => !filePaths.includes(path));
    if (newFiles.length > 0) {
      setFilePaths(prev => [...prev, ...newFiles]);
    }
  };

  const handleBackgroundGeneration = async () => {
    if (!contextName.trim()) {
      setError('Context name is required');
      return;
    }

    if (filePaths.length === 0) {
      setError('At least one file is required');
      return;
    }

    if (!activeProject) {
      setError('No active project selected');
      return;
    }

    setBackgroundProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/kiro/generate-context-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextId: context.id,
          contextName: contextName.trim(),
          filePaths: filePaths,
          projectPath: activeProject.path,
          projectId: activeProject.id
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to start background generation');
      }

      // Show success message and close modal
      setError('');
      handleClose();
      
      // Optionally show a toast or notification that background processing started
      console.log('Background context file generation started');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start background generation');
    } finally {
      setBackgroundProcessing(false);
    }
  };

  const availableFilesToAdd = selectedFilePaths.filter(path => !filePaths.includes(path));

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
          className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white font-mono">Edit Context</h2>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-700 rounded-sm transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
            {/* Context Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Context Name *
              </label>
              <input
                type="text"
                value={contextName}
                onChange={(e) => {
                  setContextName(e.target.value);
                  setError('');
                }}
                placeholder="e.g., Authentication Components"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                maxLength={50}
              />
            </div>

            {/* Group Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Group *
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => {
                  setSelectedGroupId(e.target.value);
                  setError('');
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
              >
                {availableGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this context..."
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none"
                maxLength={200}
              />
            </div>

            {/* File Management */}
            <FileAdd
              filePaths={filePaths}
              onRemoveFile={handleRemoveFile}
              availableFilesToAdd={availableFilesToAdd}
              onAddSelectedFiles={handleAddSelectedFiles}
            />

            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-700">
            <button
              onClick={handleBackgroundGeneration}
              disabled={backgroundProcessing || loading || filePaths.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-md hover:bg-purple-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-mono"
              title="Generate context file in background using AI"
            >
              <Zap className="w-3 h-3" />
              <span>{backgroundProcessing ? 'Processing...' : 'Generate in Background'}</span>
            </button>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-md hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-mono"
              >
                <Save className="w-3 h-3" />
                <span>{loading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}