import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Globe, Save } from 'lucide-react';
import { Project } from '@/types';
import RunnerSettingPath from './RunnerSettingPath';
import RunnerSettingGit from './RunnerSettingGit';

interface Props {
  project: Project;
  projectData: Project | undefined;
  onProjectChange: (projectId: string, field: keyof Project | string, value: unknown) => void;
  onSaveProject: (projectId: string) => void;
  onResetProject: (projectId: string) => void;
}

const RunnerSettingForm = React.memo<Props>(({
  project,
  projectData,
  onProjectChange,
  onSaveProject,
  onResetProject
}: Props) => {
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());

  // Track original values for comparison
  const originalValues = useMemo(() => ({
    name: project.name,
    port: project.port,
    path: project.path,
    description: project.description,
    gitRepository: project.git?.repository || '',
    gitBranch: project.git?.branch || '',
    gitAutoSync: project.git?.autoSync || false,
  }), [project]);

  // Check if specific fields have changed
  const fieldChanges = useMemo(() => ({
    name: projectData?.name !== originalValues.name,
    port: projectData?.port !== originalValues.port,
    path: projectData?.path !== originalValues.path,
    description: projectData?.description !== originalValues.description,
    gitRepository: (projectData?.git?.repository || '') !== originalValues.gitRepository,
    gitBranch: (projectData?.git?.branch || '') !== originalValues.gitBranch,
    gitAutoSync: (projectData?.git?.autoSync || false) !== originalValues.gitAutoSync,
  }), [projectData, originalValues]);

  // Enhanced save function with temporary save button hiding
  const handleSaveWithFeedback = useCallback(async (projectId: string, fieldName?: string) => {
    if (fieldName) {
      setSavingFields(prev => new Set(prev).add(fieldName));
    }
    
    try {
      await onSaveProject(projectId);
      
      // Hide save button temporarily after successful save
      if (fieldName) {
        setTimeout(() => {
          setSavingFields(prev => {
            const newSet = new Set(prev);
            newSet.delete(fieldName);
            return newSet;
          });
        }, 1000); // Hide for 1 second to show success feedback
      }
    } catch (error) {
      console.error('Save failed:', error);
      if (fieldName) {
        setSavingFields(prev => {
          const newSet = new Set(prev);
          newSet.delete(fieldName);
          return newSet;
        });
      }
    }
  }, [onSaveProject]);

  const handleSave = useCallback(() => {
    handleSaveWithFeedback(project.id);
  }, [handleSaveWithFeedback, project.id]);

  return (
    <div className="p-6 space-y-6">
      {/* Basic Info Grid with Enhanced Styling */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide">
            PROJECT NAME
          </label>
          <div className="relative">
            <input
              type="text"
              value={projectData?.name || ''}
              onChange={(e) => onProjectChange(project.id, 'name', e.target.value)}
              className="w-full px-4 py-3 pr-12 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-slate-600/50 rounded-xl text-white text-sm focus:outline-none focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/20 transition-all duration-200 backdrop-blur-sm"
            />
            {fieldChanges.name && !savingFields.has('name') && (
              <button
                onClick={() => handleSaveWithFeedback(project.id, 'name')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-all duration-200"
                title="Save Changes"
              >
                <Save className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-400 mb-2 tracking-wide flex items-center space-x-1">
            <Globe className="w-3 h-3" />
            <span>PORT</span>
          </label>
          <div className="relative">
            <input
              type="number"
              value={projectData?.port || 3000}
              onChange={(e) => onProjectChange(project.id, 'port', parseInt(e.target.value))}
              className="w-full px-4 py-3 pr-12 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-slate-600/50 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/20 transition-all duration-200 backdrop-blur-sm"
            />
            {fieldChanges.port && !savingFields.has('port') && (
              <button
                onClick={() => handleSaveWithFeedback(project.id, 'port')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-all duration-200"
                title="Save Changes"
              >
                <Save className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Path Configuration Component */}
      <RunnerSettingPath
        project={project}
        projectData={projectData}
        onProjectChange={onProjectChange}
        onSaveProject={onSaveProject}
        fieldChanges={{ path: fieldChanges.path }}
      />

      {/* Enhanced Description */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide">
          DESCRIPTION
        </label>
        <div className="relative">
          <textarea
            value={projectData?.description || ''}
            onChange={(e) => onProjectChange(project.id, 'description', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 pr-12 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-slate-600/50 rounded-xl text-white text-sm focus:outline-none focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/20 transition-all duration-200 resize-none backdrop-blur-sm"
            placeholder="Optional project description..."
          />
          {fieldChanges.description && !savingFields.has('description') && (
            <button
              onClick={() => handleSaveWithFeedback(project.id, 'description')}
              className="absolute right-2 top-3 p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-all duration-200"
              title="Save Changes"
            >
              <Save className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Git Configuration Component */}
      <RunnerSettingGit
        project={project}
        projectData={projectData}
        onProjectChange={onProjectChange}
        onSaveProject={onSaveProject}
        fieldChanges={{
          gitRepository: fieldChanges.gitRepository,
          gitBranch: fieldChanges.gitBranch,
          gitAutoSync: fieldChanges.gitAutoSync,
        }}
      />

      {/* Manual Reset Button (only show when there are changes) */}
      {(fieldChanges.name || fieldChanges.port || fieldChanges.path || fieldChanges.description || fieldChanges.gitRepository || fieldChanges.gitBranch || fieldChanges.gitAutoSync) && (
        <div className="flex justify-end pt-4 border-t border-slate-700/30">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onResetProject(project.id)}
            className="px-4 py-2 bg-gradient-to-r from-slate-700/50 to-slate-600/50 hover:from-slate-700/70 hover:to-slate-600/70 border border-slate-600/50 text-slate-300 rounded-xl transition-all duration-200 flex items-center space-x-2 font-medium backdrop-blur-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Changes</span>
          </motion.button>
        </div>
      )}
    </div>
  );
});

RunnerSettingForm.displayName = 'RunnerSettingForm';

export default RunnerSettingForm; 