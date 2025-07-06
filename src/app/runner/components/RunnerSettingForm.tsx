import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Folder, Globe, GitBranch, Link, AlertCircle, CheckCircle, Save } from 'lucide-react';
import { Project } from '@/types';
import { validatePath, constructFullPath, extractRelativePath } from '@/helpers/pathValidation';
import { useUserConfigStore } from '@/stores/userConfigStore';

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
  const { basePath, useBasePath } = useUserConfigStore();
  const [pathValidation, setPathValidation] = useState<{
    isValid: boolean;
    message: string;
  }>({ isValid: true, message: '' });
  const [useCustomPath, setUseCustomPath] = useState(!useBasePath);

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

  // Get the display value for the path input
  const getPathDisplayValue = useCallback(() => {
    if (!projectData?.path) return '';
    
    if (useCustomPath) {
      return projectData.path;
    } else {
      return extractRelativePath(projectData.path, basePath);
    }
  }, [projectData?.path, useCustomPath, basePath]);

  // Get the full path for display in the comment
  const getFullPath = useCallback(() => {
    if (!projectData?.path) return '';
    
    if (useCustomPath) {
      return projectData.path;
    } else {
      const relativePath = extractRelativePath(projectData.path, basePath);
      return constructFullPath(basePath, relativePath);
    }
  }, [projectData?.path, useCustomPath, basePath]);

  const handlePathChange = useCallback((path: string) => {
    let finalPath: string;
    
    if (useCustomPath) {
      finalPath = path;
    } else {
      finalPath = constructFullPath(basePath, path);
    }
    
    const validation = validatePath(finalPath);
    setPathValidation(validation);
    onProjectChange(project.id, 'path', finalPath);
  }, [useCustomPath, basePath, onProjectChange, project.id]);

  const handlePathModeToggle = useCallback(() => {
    setUseCustomPath(!useCustomPath);
  }, [useCustomPath]);

  const handleSave = useCallback(() => {
    onSaveProject(project.id);
  }, [onSaveProject, project.id]);

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
            {fieldChanges.name && (
              <button
                onClick={handleSave}
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
            {fieldChanges.port && (
              <button
                onClick={handleSave}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-all duration-200"
                title="Save Changes"
              >
                <Save className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Path Input with Base Path Toggle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-slate-400 tracking-wide flex items-center space-x-1">
            <Folder className="w-3 h-3" />
            <span>PROJECT PATH</span>
          </label>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500">Base Path</span>
            <button
              onClick={handlePathModeToggle}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                !useCustomPath ? 'bg-slate-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  !useCustomPath ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs text-slate-500">Custom</span>
          </div>
        </div>
        <div className="relative">
          <input
            type="text"
            value={getPathDisplayValue()}
            onChange={(e) => handlePathChange(e.target.value)}
            className={`w-full px-4 py-3 pr-12 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 transition-all duration-200 backdrop-blur-sm ${
              pathValidation.isValid 
                ? 'border-slate-600/50 focus:border-slate-500/50 focus:ring-slate-500/20'
                : 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
            }`}
            placeholder={useCustomPath ? "C:\\Users\\kazda\\mk\\simple" : "simple"}
          />
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            {pathValidation.isValid ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
          </div>
          {fieldChanges.path && (
            <button
              onClick={handleSave}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-all duration-200"
              title="Save Changes"
            >
              <Save className="w-4 h-4" />
            </button>
          )}
        </div>
        {pathValidation.message && (
          <p className={`text-xs mt-2 ${pathValidation.isValid ? 'text-green-400' : 'text-red-400'}`}>
            {pathValidation.message}
          </p>
        )}
        <p className="text-xs text-slate-500 mt-2">
          {useCustomPath 
            ? 'Using custom path mode - enter full path'
            : `Full path: ${getFullPath()}`
          }
        </p>
      </div>

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
          {fieldChanges.description && (
            <button
              onClick={handleSave}
              className="absolute right-2 top-3 p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-all duration-200"
              title="Save Changes"
            >
              <Save className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Git Configuration */}
      <div className="border-t border-slate-700/30 pt-6">
        <h4 className="text-sm font-medium text-slate-300 mb-4 flex items-center space-x-2">
          <GitBranch className="w-4 h-4" />
          <span>Git Configuration</span>
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide flex items-center space-x-1">
              <Link className="w-3 h-3" />
              <span>REPOSITORY URL</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={projectData?.git?.repository || ''}
                onChange={(e) => onProjectChange(project.id, 'git.repository', e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-slate-600/50 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/20 transition-all duration-200 backdrop-blur-sm"
                placeholder="https://github.com/user/repo.git"
              />
              {fieldChanges.gitRepository && (
                <button
                  onClick={handleSave}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-all duration-200"
                  title="Save Changes"
                >
                  <Save className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide flex items-center space-x-1">
              <GitBranch className="w-3 h-3" />
              <span>BRANCH</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={projectData?.git?.branch || ''}
                onChange={(e) => onProjectChange(project.id, 'git.branch', e.target.value)}
                className="w-full px-4 py-3 pr-12 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-slate-600/50 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/20 transition-all duration-200 backdrop-blur-sm"
                placeholder="main"
              />
              {fieldChanges.gitBranch && (
                <button
                  onClick={handleSave}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-all duration-200"
                  title="Save Changes"
                >
                  <Save className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center space-x-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={projectData?.git?.autoSync || false}
              onChange={(e) => onProjectChange(project.id, 'git.autoSync', e.target.checked)}
              className="rounded border-slate-600 bg-slate-700 text-slate-400 focus:ring-slate-500 focus:ring-offset-0"
            />
            <span>Auto-sync on start</span>
          </label>
        </div>
      </div>

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