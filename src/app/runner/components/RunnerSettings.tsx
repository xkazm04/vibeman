import React, { useState, useCallback, useMemo } from 'react';
import { Settings, Folder, Save } from 'lucide-react';
import { Project } from '@/types';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useUserConfigStore } from '@/stores/userConfigStore';
import { UniversalModal } from '@/components/UniversalModal';
import RunnerSetting  from './RunnerSetting';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
  onDeleteProject: (projectId: string) => void;
}

const RunnerSettings = React.memo(function RunnerSettings({
  isOpen,
  onClose,
  projects,
  onUpdateProject,
  onDeleteProject
}: Props) {
  const { updateProject } = useProjectConfigStore();
  const { basePath, setBasePath } = useUserConfigStore();
  const [editedProjects, setEditedProjects] = useState<Record<string, Project>>({});
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({});
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [editingBasePath, setEditingBasePath] = useState(false);
  const [tempBasePath, setTempBasePath] = useState(basePath);

  const handleProjectChange = useCallback((projectId: string, field: keyof Project | string, value: unknown) => {
    setEditedProjects(prev => {
      const project = projects.find(p => p.id === projectId);
      if (!project) return prev;
      
      const currentEdited = prev[projectId] || project;
      
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
        return {
          ...prev,
          [projectId]: updatedProject
        };
      } else {
        return {
          ...prev,
          [projectId]: { ...currentEdited, [field]: value }
        };
      }
    });
    
    setHasChanges(prev => ({
      ...prev,
      [projectId]: true
    }));
  }, [projects]); // Keep projects dependency as it's needed for finding the original project

  const handleSaveProject = useCallback((projectId: string) => {
    setEditedProjects(prev => {
      const editedProject = prev[projectId];
      if (editedProject) {
        updateProject(projectId, editedProject);
        onUpdateProject(projectId, editedProject);
      }
      return prev;
    });
    
    setHasChanges(prev => ({
      ...prev,
      [projectId]: false
    }));
  }, [updateProject, onUpdateProject]);

  const handleResetProject = useCallback((projectId: string) => {
    setEditedProjects(prev => {
      const originalProject = projects.find(p => p.id === projectId);
      if (!originalProject) return prev;
      
      return {
        ...prev,
        [projectId]: originalProject
      };
    });
    
    setHasChanges(prev => ({
      ...prev,
      [projectId]: false
    }));
  }, [projects]);

  const handleToggleExpanded = useCallback((projectId: string) => {
    setExpandedProject(prev => prev === projectId ? null : projectId);
  }, []);

  const handleClose = useCallback(() => {
    setEditedProjects({});
    setHasChanges({});
    setExpandedProject(null);
    setEditingBasePath(false);
    setTempBasePath(basePath);
    onClose();
  }, [onClose, basePath]);

  const handleBasePathEdit = useCallback(() => {
    setEditingBasePath(true);
    setTempBasePath(basePath);
  }, [basePath]);

  const handleBasePathSave = useCallback(() => {
    setBasePath(tempBasePath);
    setEditingBasePath(false);
  }, [tempBasePath, setBasePath]);

  const handleBasePathCancel = useCallback(() => {
    setTempBasePath(basePath);
    setEditingBasePath(false);
  }, [basePath]);

  // Improved memoization with stable dependencies
  const projectSettings = useMemo(() => {
    const settings = projects.map((project, index) => {
      // Ensure project has a valid ID - use index as fallback
      if (!project.id || project.id.trim() === '') {
        console.warn('RunnerSettings: Project missing or empty ID, using index as fallback:', project, 'index:', index);
      }
      
      const safeId = (project.id && project.id.trim()) || `project-${index}`;
      const projectData = editedProjects[safeId] || project;
      const projectHasChanges = hasChanges[safeId] || false;
      const isExpanded = expandedProject === safeId;

      // Robust key generation with fallback and unique identifier
      const baseKey = `project-${safeId}-${projectHasChanges ? 'changed' : 'unchanged'}-${isExpanded ? 'expanded' : 'collapsed'}`;
      const uniqueKey = `${baseKey}-${index}`;
      const key = uniqueKey || `fallback-${index}-${Date.now()}`;
      
      // Final safety check
      if (!key || key === '') {
        console.error('RunnerSettings: Generated empty key! Using emergency fallback.');
        const emergencyKey = `emergency-${index}-${Math.random().toString(36).substr(2, 9)}`;
        console.log('RunnerSettings: Emergency key:', emergencyKey);
        
        return {
          project: { ...project, id: safeId },
          projectData,
          projectHasChanges,
          isExpanded,
          key: emergencyKey
        };
      }

      return {
        project: { ...project, id: safeId }, // Ensure project has the safe ID
        projectData,
        projectHasChanges,
        isExpanded,
        key
      };
    }).filter((setting): setting is NonNullable<typeof setting> => setting !== null);
    
    return settings;
  }, [projects, editedProjects, hasChanges, expandedProject]);

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
      {/* Base Path Configuration */}
      <div className="mb-6 p-4 bg-gradient-to-r from-slate-800/30 to-slate-700/30 rounded-xl border border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Folder className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-300">Base Path</span>
          </div>
          {!editingBasePath && (
            <button
              onClick={handleBasePathEdit}
              className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              Edit
            </button>
          )}
        </div>
        <div className="mt-2">
          {editingBasePath ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={tempBasePath}
                onChange={(e) => setTempBasePath(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/20"
                placeholder="C:\\Users\\kazda\\mk"
              />
              <button
                onClick={handleBasePathSave}
                className="p-2 text-green-400 hover:text-green-300 hover:bg-green-400/10 rounded-lg transition-all"
                title="Save"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={handleBasePathCancel}
                className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-400/10 rounded-lg transition-all"
                title="Cancel"
              >
                ×
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500 font-mono">{basePath}</p>
          )}
        </div>
      </div>
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
          {projectSettings.map(({ project, projectData, projectHasChanges, isExpanded, key }, index) => (
            <RunnerSetting
              key={key || `fallback-${index}`}
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

RunnerSettings.displayName = 'RunnerSettings';

export default RunnerSettings; 