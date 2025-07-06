import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project } from '@/types';
import RunnerSettingHeader from './RunnerSettingHeader';
import RunnerSettingForm from './RunnerSettingForm';

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
  // Manual save mechanism - removed projectHasChanges dependency to prevent re-renders
  const handleSave = useCallback(async () => {
    try {
      onSaveProject(project.id);
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  }, [onSaveProject, project.id]);

  return (
    <motion.div
      className="relative bg-gradient-to-br from-slate-800/40 via-slate-800/30 to-slate-700/40 border border-slate-700/50 rounded-xl overflow-hidden backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
    >
      <RunnerSettingHeader
        project={project}
        projectData={projectData}
        projectHasChanges={projectHasChanges}
        onToggleExpanded={onToggleExpanded}
        onSave={handleSave}
        onDelete={() => onDeleteProject(project.id)}
      />

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="border-t border-slate-700/50 bg-gradient-to-b from-slate-800/20 to-slate-700/10"
          >
            <RunnerSettingForm
              project={project}
              projectData={projectData}
              onProjectChange={onProjectChange}
              onSaveProject={onSaveProject}
              onResetProject={onResetProject}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Optimized comparison function for React.memo
  // Only compare the essential props that actually affect rendering
  if (
    prevProps.project.id !== nextProps.project.id ||
    prevProps.projectHasChanges !== nextProps.projectHasChanges ||
    prevProps.isExpanded !== nextProps.isExpanded
  ) {
    return false;
  }

  // Compare projectData more efficiently - only if both exist
  const prevData = prevProps.projectData;
  const nextData = nextProps.projectData;
  
  // If both are undefined/null, they're equal
  if (!prevData && !nextData) return true;
  
  // If one is undefined and the other isn't, they're different
  if (!prevData || !nextData) return false;
  
  // Compare only the essential properties that affect display
  // Use strict equality for primitive values
  const fieldsToCompare = ['name', 'port', 'path', 'description'] as const;
  for (const field of fieldsToCompare) {
    if (prevData[field] !== nextData[field]) {
      return false;
    }
  }
  
  // Compare git properties if they exist
  const prevGit = prevData.git;
  const nextGit = nextData.git;
  
  if (!prevGit && !nextGit) return true;
  if (!prevGit || !nextGit) return false;
  
  return (
    prevGit.repository === nextGit.repository &&
    prevGit.branch === nextGit.branch &&
    prevGit.autoSync === nextGit.autoSync
  );
});

RunnerSetting.displayName = 'RunnerSetting';

export default RunnerSetting; 