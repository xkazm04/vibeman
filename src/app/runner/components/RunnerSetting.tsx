import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, RotateCcw, Trash2, Folder, Globe, GitBranch, Link, AlertCircle, CheckCircle, Clock, Check } from 'lucide-react';
import { Project } from '@/types';

interface Props {
  project: Project;
  projectData: Project | undefined;
  projectHasChanges: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onProjectChange: (projectId: string, field: keyof Project | string, value: unknown) => void;
  onSaveProject: (projectId: string) => void;
  onResetProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
}

const RunnerSetting = React.memo<Props>(({
  project,
  projectData,
  projectHasChanges,
  isExpanded,
  onToggleExpanded,
  onProjectChange,
  onSaveProject,
  onResetProject,
  onDeleteProject
}: Props) => {
  const [pathValidation, setPathValidation] = useState<{
    isValid: boolean;
    message: string;
  }>({ isValid: true, message: '' });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save functionality with debouncing
  const handleAutoSave = useCallback(async () => {
    if (!projectHasChanges) return;

    setSaveStatus('saving');
    try {
      onSaveProject(project.id);
      setSaveStatus('saved');
      setLastSaved(new Date());
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    }
  }, [projectHasChanges, onSaveProject, project.id]);

  useEffect(() => {
    if (projectHasChanges && saveStatus === 'idle') {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout for auto-save
      saveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 2000); // 2 second delay
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [projectHasChanges, saveStatus, handleAutoSave]);

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

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return <Clock className="w-4 h-4 text-yellow-400 animate-spin" />;
      case 'saved':
        return <Check className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Saved';
      case 'error':
        return 'Save failed';
      default:
        return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-gradient-to-br from-slate-800/40 via-slate-800/30 to-slate-700/40 border border-slate-700/50 rounded-xl overflow-hidden backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
    >
      {/* Enhanced Header with Gradient */}
      <div 
        className="relative p-4 cursor-pointer hover:bg-gradient-to-r hover:from-slate-700/30 hover:to-slate-600/30 transition-all duration-200"
        onClick={onToggleExpanded}
      >
        {/* Header Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/5 to-transparent" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-slate-500 to-slate-600 shadow-sm"></div>
            <h3 className="text-lg font-medium text-white bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
              {projectData?.name || project.name}
            </h3>
            <span className="text-xs text-slate-400 bg-gradient-to-r from-slate-700/60 to-slate-600/60 px-2 py-1 rounded-lg border border-slate-600/30">
              :{projectData?.port || project.port}
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Auto-save Status Indicator */}
            <AnimatePresence>
              {projectHasChanges && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center space-x-2 text-xs"
                >
                  {getSaveStatusIcon()}
                  <span className={`text-xs ${
                    saveStatus === 'saving' ? 'text-yellow-400' :
                    saveStatus === 'saved' ? 'text-green-400' :
                    saveStatus === 'error' ? 'text-red-400' : 'text-slate-400'
                  }`}>
                    {getSaveStatusText()}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Manual Save Button (only show when there are changes) */}
            {projectHasChanges && saveStatus === 'idle' && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAutoSave();
                }}
                className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-all duration-200 border border-transparent hover:border-green-400/30"
                title="Save Changes"
              >
                <Save className="w-4 h-4" />
              </motion.button>
            )}

            {/* Delete Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteProject(project.id);
              }}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all duration-200 border border-transparent hover:border-red-400/30"
              title="Delete Project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-t border-slate-700/50 bg-gradient-to-b from-slate-800/20 to-slate-700/10"
          >
            <div className="p-6 space-y-6">
              {/* Basic Info Grid with Enhanced Styling */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide">
                    PROJECT NAME
                  </label>
                  <input
                    type="text"
                    value={projectData?.name || ''}
                    onChange={(e) => onProjectChange(project.id, 'name', e.target.value)}
                    className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-slate-600/50 rounded-xl text-white text-sm focus:outline-none focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/20 transition-all duration-200 backdrop-blur-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide flex items-center space-x-1">
                    <Globe className="w-3 h-3" />
                    <span>PORT</span>
                  </label>
                  <input
                    type="number"
                    value={projectData?.port || 3000}
                    onChange={(e) => onProjectChange(project.id, 'port', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-slate-600/50 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/20 transition-all duration-200 backdrop-blur-sm"
                  />
                </div>
              </div>

              {/* Enhanced Path Input with Validation */}
              <div className="space-y-2">
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
                    className={`w-full px-4 py-3 pr-10 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 transition-all duration-200 backdrop-blur-sm ${
                      pathValidation.isValid 
                        ? 'border-slate-600/50 focus:border-slate-500/50 focus:ring-slate-500/20'
                        : 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
                    }`}
                    placeholder="simple, mk\simple, or C:\Users\kazda\mk\simple"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {pathValidation.isValid ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                </div>
                {pathValidation.message && (
                  <p className={`text-xs mt-2 ${pathValidation.isValid ? 'text-green-400' : 'text-red-400'}`}>
                    {pathValidation.message}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  Smart formatting: Type &quot;simple&quot; and it becomes &quot;C:\Users\kazda\mk\simple&quot;
                </p>
              </div>

              {/* Enhanced Description */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide">
                  DESCRIPTION
                </label>
                <textarea
                  value={projectData?.description || ''}
                  onChange={(e) => onProjectChange(project.id, 'description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-slate-600/50 rounded-xl text-white text-sm focus:outline-none focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/20 transition-all duration-200 resize-none backdrop-blur-sm"
                  placeholder="Optional project description..."
                />
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
                    <input
                      type="text"
                      value={projectData?.git?.repository || ''}
                      onChange={(e) => onProjectChange(project.id, 'git.repository', e.target.value)}
                      className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-slate-600/50 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/20 transition-all duration-200 backdrop-blur-sm"
                      placeholder="https://github.com/user/repo.git"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-400 mb-2 tracking-wide flex items-center space-x-1">
                      <GitBranch className="w-3 h-3" />
                      <span>BRANCH</span>
                    </label>
                    <input
                      type="text"
                      value={projectData?.git?.branch || ''}
                      onChange={(e) => onProjectChange(project.id, 'git.branch', e.target.value)}
                      className="w-full px-4 py-3 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-slate-600/50 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-slate-500/50 focus:ring-2 focus:ring-slate-500/20 transition-all duration-200 backdrop-blur-sm"
                      placeholder="main"
                    />
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
              {projectHasChanges && (
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Optimized comparison function for React.memo
  if (
    prevProps.project.id !== nextProps.project.id ||
    prevProps.projectHasChanges !== nextProps.projectHasChanges ||
    prevProps.isExpanded !== nextProps.isExpanded
  ) {
    return false;
  }

  // Shallow comparison of projectData - only check key properties that might change
  const prevData = prevProps.projectData;
  const nextData = nextProps.projectData;
  
  if (prevData === nextData) return true;
  if (!prevData || !nextData) return prevData === nextData;
  
  // Compare only the properties that actually matter for rendering
  return (
    prevData.name === nextData.name &&
    prevData.port === nextData.port &&
    prevData.path === nextData.path &&
    prevData.description === nextData.description &&
    prevData.git?.repository === nextData.git?.repository &&
    prevData.git?.branch === nextData.git?.branch &&
    prevData.git?.autoSync === nextData.git?.autoSync
  );
});

RunnerSetting.displayName = 'RunnerSetting';

export default RunnerSetting; 