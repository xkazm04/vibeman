import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings } from 'lucide-react';
import { Project } from '@/types';
import { RunnerSetting } from './RunnerSetting';
import { useProjectConfigStore } from '@/stores/projectConfigStore';

interface RunnerSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => void;
}

export const RunnerSettings: React.FC<RunnerSettingsProps> = ({
  isOpen,
  onClose,
  projects,
  onUpdateProject,
  onDeleteProject
}) => {
  const [editedProjects, setEditedProjects] = useState<Record<string, Project>>({});
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({});

  const handleProjectChange = (projectId: string, field: keyof Project, value: string | number) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const currentEdited = editedProjects[projectId] || project;
    setEditedProjects({
      ...editedProjects,
      [projectId]: { ...currentEdited, [field]: value }
    });
    setHasChanges({
      ...hasChanges,
      [projectId]: true
    });
  };

  const handleSaveProject = (projectId: string) => {
    const editedProject = editedProjects[projectId];
    if (editedProject) {
      onUpdateProject(projectId, editedProject);
      setHasChanges({
        ...hasChanges,
        [projectId]: false
      });
    }
  };

  const handleResetProject = (projectId: string) => {
    const originalProject = projects.find(p => p.id === projectId);
    if (originalProject) {
      setEditedProjects({
        ...editedProjects,
        [projectId]: originalProject
      });
      setHasChanges({
        ...hasChanges,
        [projectId]: false
      });
    }
  };

  const getProjectData = (projectId: string) => {
    return editedProjects[projectId] || projects.find(p => p.id === projectId);
  };

  const handleClose = () => {
    setEditedProjects({});
    setHasChanges({});
    onClose();
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-6xl max-h-[90vh] bg-gray-950/90 border border-gray-700/30 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-gray-700/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg">
                      <Settings className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">Project Settings</h2>
                      <p className="text-sm text-gray-400">Manage all your project configurations</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {projects.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No projects to configure</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {projects.map((project) => {
                      const projectData = getProjectData(project.id);
                      const projectHasChanges = hasChanges[project.id];

                      return (
                        <RunnerSetting
                          key={project.id}
                          project={project}
                          projectData={projectData}
                          projectHasChanges={projectHasChanges}
                          onProjectChange={handleProjectChange}
                          onSaveProject={handleSaveProject}
                          onResetProject={handleResetProject}
                          onDeleteProject={onDeleteProject}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}; 