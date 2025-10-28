import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, AlertCircle } from 'lucide-react';
import { useContextStore, ContextGroup } from '../../../../stores/contextStore';

interface ContextSaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFilePaths: string[];
  projectId: string;
  availableGroups: ContextGroup[];
}

export default function ContextSaveModal({ isOpen, onClose, selectedFilePaths, projectId, availableGroups }: ContextSaveModalProps) {
  const { addContext, contexts, loading } = useContextStore();
  const [contextName, setContextName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [error, setError] = useState('');

  // Set default group when groups are available
  React.useEffect(() => {
    if (availableGroups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(availableGroups[0].id);
    }
  }, [availableGroups, selectedGroupId]);

  const handleSave = async () => {
    if (!contextName.trim()) {
      setError('Context name is required');
      return;
    }

    if (!selectedGroupId) {
      setError('Please select a group');
      return;
    }

    if (contexts.some(ctx => ctx.name.toLowerCase() === contextName.toLowerCase())) {
      setError('A context with this name already exists');
      return;
    }

    try {
      await addContext({
        projectId,
        groupId: selectedGroupId,
        name: contextName.trim(),
        description: description.trim(),
        filePaths: selectedFilePaths,
      });

      // Reset form and close
      setContextName('');
      setDescription('');
      setSelectedGroupId('');
      setError('');
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save context');
    }
  };

  const handleClose = () => {
    setContextName('');
    setDescription('');
    setError('');
    onClose();
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
          className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-white font-mono">Save Context</h2>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-700 rounded-sm transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
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
              {availableGroups.length === 0 ? (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                  <p className="text-sm text-yellow-400">
                    No groups available. Create a group first to save contexts.
                  </p>
                </div>
              ) : (
                <select
                  value={selectedGroupId}
                  onChange={(e) => {
                    setSelectedGroupId(e.target.value);
                    setError('');
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                >
                  <option value="">Select a group...</option>
                  {availableGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              )}
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

            {/* Files Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Files ({selectedFilePaths.length})
              </label>
              <div className="max-h-32 overflow-y-auto bg-gray-900/50 border border-gray-600 rounded-md p-2">
                {selectedFilePaths.map((path, index) => (
                  <div key={index} className="text-sm text-gray-400 font-mono py-1">
                    {path}
                  </div>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-2 p-4 border-t border-gray-700">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || availableGroups.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-md hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-mono"
            >
              <Save className="w-3 h-3" />
              <span>{loading ? 'Saving...' : 'Save Context'}</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}