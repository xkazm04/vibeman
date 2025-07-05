import React, { useState, useCallback, useMemo } from 'react';
import { Settings } from 'lucide-react';
import { Project } from '@/types';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { UniversalModal } from '@/components/UniversalModal';
import { RunnerSettingEnhanced } from './RunnerSettingEnhanced';

interface RunnerSettingsEnhancedProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => void;
}

export const RunnerSettingsEnhanced: React.FC<RunnerSettingsEnhancedProps> = React.memo(({
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

  const handleProjectChange = useCallback((projectId: string, field: keyof Project | string, value: unknown) => {
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

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Project Settings"
      subtitle="Configure your development projects"
      icon={Settings}
      iconBgColor="from-blue-600/20 to-indigo-600/20"
      iconColor="text-blue-400"
      maxWidth="max-w-5xl"
    >
      {projects.length === 0 ? (
        <div className="text-center py-16">
          <div className="relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800/20 to-slate-700/20 rounded-2xl" />
            
            {/* Content */}
            <div className="relative p-8">
              <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-slate-700/50 to-slate-600/50 rounded-2xl flex items-center justify-center border border-slate-600/30">
                <Settings className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-300 mb-2">No Projects to Configure</h3>
              <p className="text-slate-500 text-sm">Add projects to get started with configuration</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {projectSettings.map(({ project, projectData, projectHasChanges, isExpanded, key }) => (
            <RunnerSettingEnhanced
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
    </UniversalModal>
  );
});

RunnerSettingsEnhanced.displayName = 'RunnerSettingsEnhanced'; 