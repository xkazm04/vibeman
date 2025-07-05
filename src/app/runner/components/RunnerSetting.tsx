import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, RotateCcw, Trash2, Folder, Globe, GitBranch, Link, AlertCircle, CheckCircle } from 'lucide-react';
import { Project } from '@/types';

interface RunnerSettingProps {
  project: Project;
  projectData: Project | undefined;
  projectHasChanges: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onProjectChange: (projectId: string, field: keyof Project | string, value: any) => void;
  onSaveProject: (projectId: string) => void;
  onResetProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

export const RunnerSetting: React.FC<RunnerSettingProps> = React.memo(({
  project,
  projectData,
  projectHasChanges,
  isExpanded,
  onToggleExpanded,
  onProjectChange,
  onSaveProject,
  onResetProject,
  onDeleteProject
}) => {
  const [pathValidation, setPathValidation] = useState<{
    isValid: boolean;
    message: string;
  }>({ isValid: true, message: '' });

  const formatPath = useCallback((inputPath: string): string => {
    if (!inputPath) return inputPath;
    
    // Common path corrections
    let formattedPath = inputPath.trim();
    
    // Convert forward slashes to backslashes on Windows
    if (typeof window !== 'undefined' || process.platform === 'win32') {
      formattedPath = formattedPath.replace(/\//g, '\\');
    }
    
    // Handle common user input patterns
    if (formattedPath.toLowerCase().includes('mk') && !formattedPath.includes('C:\\Users\\kazda\\mk')) {
      // Extract the part after 'mk'
      const mkIndex = formattedPath.toLowerCase().indexOf('mk');
      let afterMk = formattedPath.substring(mkIndex + 2);
      
      // Remove leading slash/backslash if present
      afterMk = afterMk.replace(/^[\\\/]+/, '');
      
      // If there's content after mk, construct the full path
      if (afterMk) {
        formattedPath = `C:\\Users\\kazda\\mk\\${afterMk}`;
      } else {
        formattedPath = `C:\\Users\\kazda\\mk`;
      }
    }
    
    // Handle case where user types just the project name
    if (!formattedPath.includes('\\') && !formattedPath.includes('/')) {
      // Assume it's a project name in the mk directory
      formattedPath = `C:\\Users\\kazda\\mk\\${formattedPath}`;
    }
    
    // Handle case where user provides relative path starting with mk
    if (formattedPath.startsWith('mk\\') || formattedPath.startsWith('mk/')) {
      formattedPath = `C:\\Users\\kazda\\${formattedPath}`;
    }
    
    // Remove trailing slashes/backslashes
    formattedPath = formattedPath.replace(/[\\\/]+$/, '');
    
    return formattedPath;
  }, []);

  const validatePath = useCallback((path: string): { isValid: boolean; message: string } => {
    if (!path) {
      return { isValid: false, message: 'Path is required' };
    }
    
    // Check for common issues
    if (path.includes('//') || path.includes('\\\\')) {
      return { isValid: false, message: 'Path contains double slashes' };
    }
    
    // More lenient validation for Windows paths
    if (typeof window !== 'undefined' || process.platform === 'win32') {
      // Check if it's a valid Windows path format
      if (!path.match(/^[A-Za-z]:[\\\/]/) && !path.startsWith('\\\\')) {
        return { isValid: false, message: 'Windows path should start with drive letter (e.g., C:\\)' };
      }
    }
    
    // Check if path looks like it's in the expected workspace
    if (!path.toLowerCase().includes('mk')) {
      return { isValid: false, message: 'Path should be in the mk workspace directory' };
    }
    
    // Check for valid project directory names
    const pathParts = path.split(/[\\\/]/);
    const projectName = pathParts[pathParts.length - 1];
    if (projectName && !projectName.match(/^[a-zA-Z0-9_-]+$/)) {
      return { isValid: false, message: 'Project name should contain only letters, numbers, hyphens, and underscores' };
    }
    
    return { isValid: true, message: 'Path looks valid' };
  }, []);

  const handlePathChange = useCallback((path: string) => {
    const formattedPath = formatPath(path);
    const validation = validatePath(formattedPath);
    
    // Debug logging
    console.log('Path change:', { 
      input: path, 
      formatted: formattedPath, 
      isValid: validation.isValid,
      message: validation.message 
    });
    
    setPathValidation(validation);
    onProjectChange(project.id, 'path', formattedPath);
  }, [formatPath, validatePath, onProjectChange, project.id]);

  const handlePathBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const currentPath = e.target.value;
    const formattedPath = formatPath(currentPath);
    if (formattedPath !== currentPath) {
      onProjectChange(project.id, 'path', formattedPath);
    }
  }, [formatPath, onProjectChange, project.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden"
    >
      {/* Project Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-slate-700/30 transition-colors"
        onClick={onToggleExpanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-slate-600"></div>
            <h3 className="text-lg font-medium text-white">{projectData?.name || project.name}</h3>
            <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
              :{projectData?.port || project.port}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {projectHasChanges && (
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" title="Unsaved changes"></div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteProject(project.id);
              }}
              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
              title="Delete Project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-slate-700/50"
          >
            <div className="p-4 space-y-4">
              {/* Basic Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide">
                    PROJECT NAME
                  </label>
                  <input
                    type="text"
                    value={projectData?.name || ''}
                    onChange={(e) => onProjectChange(project.id, 'name', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide flex items-center space-x-1">
                    <Globe className="w-3 h-3" />
                    <span>PORT</span>
                  </label>
                  <input
                    type="number"
                    value={projectData?.port || 3000}
                    onChange={(e) => onProjectChange(project.id, 'port', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Path with validation */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide flex items-center space-x-1">
                  <Folder className="w-3 h-3" />
                  <span>PROJECT PATH</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={projectData?.path || ''}
                    onChange={(e) => handlePathChange(e.target.value)}
                    onBlur={handlePathBlur}
                    className={`w-full px-3 py-2 pr-8 bg-slate-700/50 border rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 transition-all ${
                      pathValidation.isValid 
                        ? 'border-slate-600/50 focus:border-slate-500/50 focus:ring-slate-500/20'
                        : 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
                    }`}
                    placeholder="simple, mk\simple, or C:\Users\kazda\mk\simple"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    {pathValidation.isValid ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </div>
                {pathValidation.message && (
                  <p className={`text-xs mt-1 ${pathValidation.isValid ? 'text-green-400' : 'text-red-400'}`}>
                    {pathValidation.message}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  Smart formatting: Type "simple" and it becomes "C:\Users\kazda\mk\simple"
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide">
                  DESCRIPTION
                </label>
                <textarea
                  value={projectData?.description || ''}
                  onChange={(e) => onProjectChange(project.id, 'description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/20 transition-all resize-none"
                  placeholder="Optional project description..."
                />
              </div>

              {/* Git Configuration */}
              <div className="border-t border-slate-700/30 pt-4">
                <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center space-x-2">
                  <GitBranch className="w-4 h-4" />
                  <span>Git Configuration</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide flex items-center space-x-1">
                      <Link className="w-3 h-3" />
                      <span>REPOSITORY URL</span>
                    </label>
                    <input
                      type="text"
                      value={projectData?.git?.repository || ''}
                      onChange={(e) => onProjectChange(project.id, 'git.repository', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/20 transition-all"
                      placeholder="https://github.com/user/repo.git"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide flex items-center space-x-1">
                      <GitBranch className="w-3 h-3" />
                      <span>BRANCH</span>
                    </label>
                    <input
                      type="text"
                      value={projectData?.git?.branch || ''}
                      onChange={(e) => onProjectChange(project.id, 'git.branch', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/20 transition-all"
                      placeholder="main"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="flex items-center space-x-2 text-sm text-slate-300">
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

              {/* Action Buttons */}
              {projectHasChanges && (
                <div className="flex space-x-2 pt-4 border-t border-slate-700/30">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSaveProject(project.id)}
                    className="flex-1 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 text-green-400 rounded-lg transition-colors flex items-center justify-center space-x-2 font-medium"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onResetProject(project.id)}
                    className="flex-1 px-4 py-2 bg-slate-700/50 hover:bg-slate-700/70 border border-slate-600/50 text-slate-300 rounded-lg transition-colors flex items-center justify-center space-x-2 font-medium"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset</span>
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}); 