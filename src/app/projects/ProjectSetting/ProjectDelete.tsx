import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Project } from '@/types';

interface ProjectDeleteProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectDeleted: () => void;
  project: Project | null;
}

export default function ProjectDelete({ isOpen, onClose, onProjectDeleted, project }: ProjectDeleteProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    if (!project || confirmText !== project.name) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });

      const result = await response.json();

      if (result.success) {
        onProjectDeleted();
        onClose();
      } else {
        setError(result.error || 'Failed to delete project');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete project');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError('');
      setConfirmText('');
      onClose();
    }
  };

  if (!isOpen || !project) return null;

  const isConfirmValid = confirmText === project.name;

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
          className="bg-gray-800 border border-red-500/30 rounded-lg shadow-xl max-w-md w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-red-500/10">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-white font-mono">Delete Project</h2>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="p-1 hover:bg-gray-700 rounded-sm transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div className="text-center">
              <div className="text-red-400 text-sm font-medium mb-2">
                This action cannot be undone
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                You are about to permanently delete the project{' '}
                <span className="font-mono text-white bg-gray-700/50 px-2 py-1 rounded">
                  {project.name}
                </span>
                . This will remove it from your project list, but will not delete any files from your filesystem.
              </p>
            </div>

            {/* Project Info */}
            <div className="bg-gray-700/30 rounded-lg p-3 border border-gray-600/30">
              <div className="text-xs text-gray-400 mb-1">Project Details:</div>
              <div className="text-sm text-white font-mono">{project.name}</div>
              <div className="text-xs text-gray-400 font-mono">{project.path}</div>
              <div className="text-xs text-gray-400">Port: {project.port}</div>
            </div>

            {/* Confirmation Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Type the project name to confirm deletion:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => {
                  setConfirmText(e.target.value);
                  setError('');
                }}
                placeholder={project.name}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
                disabled={loading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-700 bg-gray-800/30">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading || !isConfirmValid}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-md hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-mono"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Project</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}