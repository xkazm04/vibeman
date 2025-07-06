import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { GitBranch, Link, Save, Zap } from 'lucide-react';
import { Project } from '@/types';

interface Props {
  project: Project;
  projectData: Project | undefined;
  onProjectChange: (projectId: string, field: keyof Project | string, value: unknown) => void;
  onSaveProject: (projectId: string) => void;
  fieldChanges: {
    gitRepository: boolean;
    gitBranch: boolean;
    gitAutoSync: boolean;
  };
}

const RunnerSettingGit = React.memo<Props>(({
  project,
  projectData,
  onProjectChange,
  onSaveProject,
  fieldChanges
}: Props) => {
  const [savingFields, setSavingFields] = useState<Set<string>>(new Set());

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

  const handleVectorize = useCallback(() => {
    // TODO: Implement vectorization logic
    console.log('Vectorizing repository...');
  }, []);

  return (
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
            {fieldChanges.gitRepository && !savingFields.has('gitRepository') && (
              <button
                onClick={() => handleSaveWithFeedback(project.id, 'gitRepository')}
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
            {fieldChanges.gitBranch && !savingFields.has('gitBranch') && (
              <button
                onClick={() => handleSaveWithFeedback(project.id, 'gitBranch')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-all duration-200"
                title="Save Changes"
              >
                <Save className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <label className="flex items-center space-x-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={projectData?.git?.autoSync || false}
            onChange={(e) => onProjectChange(project.id, 'git.autoSync', e.target.checked)}
            className="rounded border-slate-600 bg-slate-700 text-slate-400 focus:ring-slate-500 focus:ring-offset-0"
          />
          <span>Auto-sync on start</span>
        </label>
        
        {/* Vectorize Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleVectorize}
          className="group relative px-4 py-2 bg-gradient-to-r from-gray-600/80 to-slate-600/80 text-white rounded-lg transition-all duration-200 flex items-center space-x-2 font-medium backdrop-blur-sm shadow-lg hover:shadow-purple-500/25"
        >
          <div className="relative">
            <Zap className="w-4 h-4 transition-transform group-hover:scale-110" />
            <div className="absolute inset-0 bg-white/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
          <span className="text-sm">Vectorize</span>
          
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
        </motion.button>
      </div>
    </div>
  );
});

RunnerSettingGit.displayName = 'RunnerSettingGit';

export default RunnerSettingGit; 