import React from 'react';
import { motion } from 'framer-motion';
import { Project } from '@/types';
import { useAnalysisStore } from '@/stores/analysisStore';

interface PreviewTabProps {
  project: Project;
  isActive: boolean;
  onTabClick: (projectId: string) => void;
}

export const PreviewTab: React.FC<PreviewTabProps> = ({
  project,
  isActive,
  onTabClick
}) => {
  const { isActive: analysisActive } = useAnalysisStore();

  const handleTabClick = () => {
    if (!analysisActive) {
      onTabClick(project.id);
    }
  };

  return (
    <motion.div
      whileHover={{ scale: !analysisActive ? 1.02 : 1 }}
      whileTap={{ scale: !analysisActive ? 0.98 : 1 }}
      onClick={handleTabClick}
      className={`flex items-center gap-2 px-4 py-3 rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
        analysisActive 
          ? 'cursor-not-allowed opacity-50' 
          : 'cursor-pointer'
      } ${
        isActive
          ? 'bg-gray-800 border-cyan-500 text-cyan-400'
          : 'bg-gray-900/50 border-transparent text-gray-500 hover:bg-gray-800 hover:text-gray-300'
      }`}
      title={analysisActive ? "Tab switching disabled during analysis" : undefined}
    >
      <div className={`w-2 h-2 rounded-full ${
        analysisActive 
          ? 'bg-purple-500/50 animate-pulse' 
          : isActive 
            ? 'bg-cyan-500 animate-pulse' 
            : 'bg-gray-600'
      }`} />
      
      <span className="font-medium">
        {project.name}
      </span>
      <span className="text-xs opacity-70">:{project.port}</span>
    </motion.div>
  );
}; 