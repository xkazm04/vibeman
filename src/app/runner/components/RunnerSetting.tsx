import React from 'react';
import { motion } from 'framer-motion';
import { Save, Folder, Globe, X, Trash2 } from 'lucide-react';
import { Project } from '@/types';
import { useProjectConfigStore } from '@/stores/projectConfigStore';

interface RunnerSettingProps {
  project: Project;
  projectData: Project | undefined;
  projectHasChanges: boolean;
  onProjectChange: (projectId: string, field: keyof Project, value: string | number) => void;
  onSaveProject: (projectId: string) => void;
  onResetProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

export const RunnerSetting: React.FC<RunnerSettingProps> = ({
  project,
  projectData,
  projectHasChanges,
  onProjectChange,
  onSaveProject,
  onResetProject,
  onDeleteProject
}) => {
  const { updateProject } = useProjectConfigStore();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4 space-y-4"
    >
      {/* Project Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">{project.name}</h3>
        <button
          onClick={() => onDeleteProject(project.id)}
          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
          title="Delete Project"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Form Fields */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Project Name
          </label>
          <input
            type="text"
            value={projectData?.name || ''}
            onChange={(e) => onProjectChange(project.id, 'name', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center space-x-1">
            <Folder className="w-4 h-4" />
            <span>Project Path</span>
          </label>
          <input
            type="text"
            value={projectData?.path || ''}
            onChange={(e) => onProjectChange(project.id, 'path', e.target.value)}
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center space-x-1">
            <Globe className="w-4 h-4" />
            <span>Port</span>
          </label>
          <input
            type="number"
            value={projectData?.port || 3000}
            onChange={(e) => onProjectChange(project.id, 'port', parseInt(e.target.value))}
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={projectData?.description || ''}
            onChange={(e) => onProjectChange(project.id, 'description', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all resize-none"
            placeholder="Optional project description..."
          />
        </div>
      </div>

      {/* Action Buttons */}
      {projectHasChanges && (
        <div className="flex space-x-2 pt-2 border-t border-gray-700/30">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              // Save to localStorage via config store
              if (projectData) {
                updateProject(project.id, projectData);
              }
              // Also call the parent's save handler for UI state management
              onSaveProject(project.id);
            }}
            className="flex-1 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 text-green-400 rounded-lg transition-colors flex items-center justify-center space-x-1"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onResetProject(project.id)}
            className="flex-1 px-3 py-2 bg-gray-700/50 hover:bg-gray-700/70 border border-gray-600/50 text-gray-300 rounded-lg transition-colors flex items-center justify-center space-x-1"
          >
            <X className="w-4 h-4" />
            <span>Reset</span>
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}; 