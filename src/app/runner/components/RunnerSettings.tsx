import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings } from 'lucide-react';
import { Project } from '@/types';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { RunnerSetting } from './RunnerSetting';

interface RunnerSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => void;
}

export const RunnerSettings: React.FC<RunnerSettingsProps> = React.memo(({
  isOpen,
  onClose,
  projects,
  onUpdateProject,
  onDeleteProject
}) => {
  const { updateProject } = useProjectConfigStore();
  const [editedProjects, setEditedProjects] = useState<Record<string, Project>>({});
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({});
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const handleProjectChange = useCallback((projectId: string, field: keyof Project | string, value: any) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const currentEdited = editedProjects[projectId] || project;
    
    // Handle nested git properties
    if (field.startsWith('git.')) {
      const gitField = field.replace('git.', '');
      const updatedProject: Project = {
        ...currentEdited,
        git: {
          repository: currentEdited.git?.repository || '',
          branch: currentEdited.git?.branch || '',
          autoSync: currentEdited.git?.autoSync || false,
          ...currentEdited.git,
          [gitField]: value
        }
      };
      setEditedProjects(prev => ({
        ...prev,
        [projectId]: updatedProject
      }));
    } else {
      setEditedProjects(prev => ({
        ...prev,
        [projectId]: { ...currentEdited, [field]: value }
      }));
    }
    
    setHasChanges(prev => ({
      ...prev,
      [projectId]: true
    }));
  }, [projects, editedProjects]);

  const handleSaveProject = useCallback((projectId: string) => {
    const editedProject = editedProjects[projectId];
    if (editedProject) {
      updateProject(projectId, editedProject);
      onUpdateProject(projectId, editedProject);
      setHasChanges(prev => ({
        ...prev,
        [projectId]: false
      }));
    }
  }, [editedProjects, updateProject, onUpdateProject]);

  const handleResetProject = useCallback((projectId: string) => {
    const originalProject = projects.find(p => p.id === projectId);
    if (originalProject) {
      setEditedProjects(prev => ({
        ...prev,
        [projectId]: originalProject
      }));
      setHasChanges(prev => ({
        ...prev,
        [projectId]: false
      }));
    }
  }, [projects]);

  const handleToggleExpanded = useCallback((projectId: string) => {
    setExpandedProject(prev => prev === projectId ? null : projectId);
  }, []);

  const handleClose = useCallback(() => {
    setEditedProjects({});
    setHasChanges({});
    setExpandedProject(null);
    onClose();
  }, [onClose]);

  const getProjectData = useCallback((projectId: string) => {
    return editedProjects[projectId] || projects.find(p => p.id === projectId);
  }, [editedProjects, projects]);

  // Memoize project settings to prevent unnecessary re-renders
  const projectSettings = useMemo(() => {
    return projects.map(project => {
      const projectData = getProjectData(project.id);
      const projectHasChanges = hasChanges[project.id] || false;
      const isExpanded = expandedProject === project.id;

      return {
        project,
        projectData,
        projectHasChanges,
        isExpanded,
        key: `${project.id}-${projectHasChanges}-${isExpanded}`
      };
    });
  }, [projects, getProjectData, hasChanges, expandedProject]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12"
      >
        <div className="relative w-full max-w-4xl max-h-[85vh] bg-slate-900/95 border border-slate-700/40 rounded-xl overflow-hidden backdrop-blur-xl shadow-2xl">
          {/* Header */}
          <div className="p-6 border-b border-slate-700/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-slate-800/60 to-slate-900/60 rounded-lg border border-slate-600/30">
                  <Settings className="w-5 h-5 text-slate-300" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white tracking-wide">Project Settings</h2>
                  <p className="text-xs text-slate-400 font-medium">Configure your development projects</p>
                </div>
              </div>
              
              <button
                onClick={handleClose}
                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {projects.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-slate-400">No projects to configure</p>
                <p className="text-xs text-slate-500 mt-2">Add projects to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {projectSettings.map(({ project, projectData, projectHasChanges, isExpanded, key }) => (
                  <RunnerSetting
                    key={key}
                    project={project}
                    projectData={projectData}
                    projectHasChanges={projectHasChanges}
                    isExpanded={isExpanded}
                    onToggleExpanded={() => handleToggleExpanded(project.id)}
                    onProjectChange={handleProjectChange}
                    onSaveProject={handleSaveProject}
                    onResetProject={handleResetProject}
                    onDeleteProject={onDeleteProject}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}); 