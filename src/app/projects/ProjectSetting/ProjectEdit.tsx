import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Loader2 } from 'lucide-react';
import ProjectForm from './ProjectForm';
import { Project } from '@/types';

interface ProjectEditProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectUpdated: () => void;
  project: Project | null;
}

interface ProjectFormData {
  id?: string;
  name: string;
  path: string;
  port: number;
  git_repository?: string;
  git_branch?: string;
  run_script?: string;
}

export default function ProjectEdit({ isOpen, onClose, onProjectUpdated, project }: ProjectEditProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (data: ProjectFormData) => {
    if (!project) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          updates: {
            name: data.name,
            port: data.port,
            git_repository: data.git_repository,
            git_branch: data.git_branch,
            run_script: data.run_script
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        onProjectUpdated();
        onClose();
      } else {
        setError(result.error || 'Failed to update project');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError('');
      onClose();
    }
  };

  if (!isOpen || !project) return null;

  const initialData: ProjectFormData = {
    id: project.id,
    name: project.name,
    path: project.path,
    port: project.port,
    git_repository: project.git?.repository,
    git_branch: project.git?.branch || 'main',
    run_script: 'npm run dev' // Default since we don't store this in the current Project type
  };

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
          className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50">
            <div className="flex items-center space-x-3">
              <Edit3 className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white font-mono">Edit Project</h2>
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
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <ProjectForm
              initialData={initialData}
              onSubmit={handleSubmit}
              loading={loading}
              error={error}
              isEdit={true}
            />
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
              type="submit"
              form="project-form"
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-md hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-mono"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3 h-3" />
                  <span>Update Project</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}