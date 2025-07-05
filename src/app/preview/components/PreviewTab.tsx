import React from 'react';
import { motion } from 'framer-motion';
import { Project } from '@/types';
import { useAnalysisStore } from '@/stores/analysisStore';

interface PreviewTabProps {
  project: Project;
  isActive: boolean;
  onTabClick: (projectId: string) => void;
  disabled?: boolean;
}

export const PreviewTab: React.FC<PreviewTabProps> = ({
  project,
  isActive,
  onTabClick,
  disabled = false
}) => {
  const { isActive: analysisActive } = useAnalysisStore();

  const handleTabClick = () => {
    if (!analysisActive && !disabled) {
      onTabClick(project.id);
    }
  };

  const isDisabled = analysisActive || disabled;

  return (
    <motion.div
      whileHover={{ scale: !isDisabled ? 1.02 : 1 }}
      whileTap={{ scale: !isDisabled ? 0.98 : 1 }}
      onClick={handleTabClick}
      className={`flex items-center gap-2 px-4 py-3 rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
        isDisabled 
          ? 'cursor-not-allowed opacity-50' 
          : 'cursor-pointer'
      } ${
        isActive
          ? 'bg-gray-800 border-cyan-500 text-cyan-400'
          : 'bg-gray-900/50 border-transparent text-gray-500 hover:bg-gray-800 hover:text-gray-300'
      } ${
        disabled && !analysisActive
          ? 'border-purple-500/30 bg-purple-900/20'
          : ''
      }`}
      title={
        analysisActive 
          ? "Tab switching disabled during analysis" 
          : disabled 
            ? "Tab switching disabled in prototype mode"
            : undefined
      }
    >
      <div className={`w-2 h-2 rounded-full ${
        analysisActive 
          ? 'bg-purple-500/50 animate-pulse' 
          : disabled && !isActive
            ? 'bg-purple-500/30'
            : isActive 
              ? 'bg-cyan-500 animate-pulse' 
              : 'bg-gray-600'
      }`} />
      
      <span className="font-medium">
        {project.name}
      </span>
      <span className="text-xs opacity-70">:{project.port}</span>
      
      {disabled && !analysisActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-1 h-1 bg-purple-400 rounded-full"
        />
      )}
    </motion.div>
  );
}; 