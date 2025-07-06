import React, { useState, useCallback, useMemo } from 'react';
import { Folder, AlertCircle, CheckCircle, Save } from 'lucide-react';
import { Project } from '@/types';
import { validatePath, constructFullPath, extractRelativePath } from '@/helpers/pathValidation';
import { useUserConfigStore } from '@/stores/userConfigStore';

interface Props {
  project: Project;
  projectData: Project | undefined;
  onProjectChange: (projectId: string, field: keyof Project | string, value: unknown) => void;
  onSaveProject: (projectId: string) => void;
  fieldChanges: {
    path: boolean;
  };
}

const RunnerSettingPath = React.memo<Props>(({
  project,
  projectData,
  onProjectChange,
  onSaveProject,
  fieldChanges
}: Props) => {
  const { basePath, useBasePath } = useUserConfigStore();
  const [pathValidation, setPathValidation] = useState<{
    isValid: boolean;
    message: string;
  }>({ isValid: true, message: '' });
  const [useCustomPath, setUseCustomPath] = useState(!useBasePath);
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());

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

  return (
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
        {fieldChanges.path && !savingFields.has('path') && (
          <button
            onClick={() => handleSaveWithFeedback(project.id, 'path')}
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
  );
});

RunnerSettingPath.displayName = 'RunnerSettingPath';

export default RunnerSettingPath; 