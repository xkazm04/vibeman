import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit3, Loader2 } from 'lucide-react';
import ProjectForm from './ProjectForm';
import { Project, ProjectType } from '@/types';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import type { ProjectFormData } from '../../sub_ProjectForm';

interface ProjectEditProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectUpdated: () => void;
  project: Project | null;
}

/**
 * Normalize legacy project type 'other' to 'generic'
 */
function normalizeProjectType(type: string | undefined): ProjectType {
  if (!type || type === 'other') return 'generic';
  return type as ProjectType;
}

export default function ProjectEdit({ isOpen, onClose, onProjectUpdated, project }: ProjectEditProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { updateProject } = useProjectConfigStore();
  const { activeProject, setActiveProject } = useActiveProjectStore();

  // Handler for immediate type update with optimistic UI
  const handleTypeChange = async (newType: ProjectType) => {
    if (!project) return;

    try {
      // Optimistic update - update stores immediately
      const updates = { type: newType };

      // Update the project config store (this updates the projects list)
      await updateProject(project.id, updates);

      // If this is the active project, update it too
      if (activeProject?.id === project.id) {
        setActiveProject({ ...activeProject, ...updates });
      }

      // No need to call onProjectUpdated() - stores are already updated

    } catch (error) {
      setError('Failed to update project type');
      // Revert will happen automatically on next sync if needed
    }
  };

  const handleSubmit = async (data: ProjectFormData) => {
    if (!project) return;

    setLoading(true);
    setError('');

    try {
      const updates = {
        name: data.name,
        type: data.type,
        port: data.port, // Can be undefined for 'combined' type
        git_repository: data.git_repository,
        git_branch: data.git_branch,
        run_script: data.run_script
      };

      // Use store method for optimistic update
      await updateProject(project.id, updates);

      // If this is the active project, update it too
      if (activeProject?.id === project.id) {
        setActiveProject({
          ...activeProject,
          name: data.name,
          type: data.type,
          // Only update port if provided, keep existing otherwise
          ...(data.port !== undefined && { port: data.port }),
          runScript: data.run_script,
          git: data.git_repository ? {
            repository: data.git_repository,
            branch: data.git_branch || 'main',
            autoSync: activeProject.git?.autoSync || false
          } : activeProject.git
        });
      }

      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = useCallback(() => {
    if (!loading) {
      setError('');
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

  if (!isOpen || !project) return null;

  const initialData: ProjectFormData = {
    id: project.id,
    name: project.name,
    path: project.path,
    port: project.port,
    type: normalizeProjectType(project.type),
    git_repository: project.git?.repository,
    git_branch: project.git?.branch || 'main',
    run_script: project.runScript || 'npm run dev'
  };

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
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Edit3 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-medium text-white">Edit Project</h2>
                <p className="text-xs text-gray-500">Update project configuration</p>
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
                initialData={initialData}
                onSubmit={handleSubmit}
                onTypeChange={handleTypeChange}
                loading={loading}
                error={error}
                isEdit={true}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-800 bg-gray-900/50">
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
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium border border-blue-500/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4" />
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