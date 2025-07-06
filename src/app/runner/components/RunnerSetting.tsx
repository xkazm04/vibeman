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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }} 
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