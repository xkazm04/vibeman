import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Loader2, FolderPlus } from 'lucide-react';
import ProjectForm from './ProjectForm';
import type { ProjectFormData } from '../../sub_ProjectForm';

interface ProjectAddProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectAdded: () => void;
}

export default function ProjectAdd({ isOpen, onClose, onProjectAdded }: ProjectAddProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (data: ProjectFormData) => {
    setLoading(true);
    setError('');

    try {
      // Step 1: Save project to database
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        // Step 2: Initialize Claude Code folder structure
        try {
          const initResponse = await fetch('/api/claude-code/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectPath: data.path,
              projectName: data.name,
              projectId: data.id,
              projectType: data.type,
            }),
          });

          const initResult = await initResponse.json();

          if (!initResponse.ok) {
            // Log warning but don't fail the project creation
            console.warn('Claude Code initialization failed:', initResult.error);
          }
        } catch (initError) {
          // Log error but continue - project was created successfully
          console.error('Claude Code initialization error:', initError);
        }

        onProjectAdded();
        onClose();
      } else {
        setError(result.error || 'Failed to add project');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add project');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = useCallback(() => {
    if (!loading) {
      onClose();
    }
  }, [loading, onClose]);

  // Handle backdrop click - only close if clicking directly on backdrop
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  // Prevent any click inside modal from bubbling to backdrop
  const handleModalClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);

  // Prevent mousedown from closing modal (fixes input focus issues)
  const handleModalMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleBackdropClick}
        onMouseDown={handleBackdropClick}
      >
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-gray-900 border border-gray-700/60 rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
          onClick={handleModalClick}
          onMouseDown={handleModalMouseDown}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-gray-900/80">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <FolderPlus className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-base font-medium text-white">Add New Project</h2>
                <p className="text-xs text-gray-500">Configure and register a project</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4 text-gray-500 hover:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-5">
              <ProjectForm
                onSubmit={handleSubmit}
                loading={loading}
                error={error}
                isEdit={false}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-800 bg-gray-900/50">
            <p className="text-xs text-gray-600">
              * Required fields
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="project-form"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium border border-cyan-500/30"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Add Project</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}