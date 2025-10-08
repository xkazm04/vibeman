import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project } from '@/types';
import { useAnalysisStore } from '@/stores/analysisStore';
import ProjectTabMenu from './ProjectTabMenu';

interface PreviewTabProps {
  project: Project;
  isActive: boolean;
  onTabClick: (projectId: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export const PreviewTab: React.FC<PreviewTabProps> = ({
  project,
  isActive,
  onTabClick,
  disabled = false,
  compact = false
}) => {
  const { isActive: analysisActive } = useAnalysisStore();
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const handleTabClick = () => {
    if (!analysisActive && !disabled) {
      onTabClick(project.id);
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!disabled && !analysisActive) {
      setMenuPosition({ x: e.clientX, y: e.clientY });
      setShowMenu(true);
    }
  };

  const isDisabled = analysisActive || disabled;

  return (
    <>
      <motion.div
        whileTap={{ scale: !isDisabled ? 0.98 : 1 }}
        onClick={handleTabClick}
        onContextMenu={handleRightClick}
        className={`flex items-center gap-2 ${
          compact ? 'px-2 py-1.5' : 'px-4 py-3'
        } ${
          compact ? 'rounded-md' : 'rounded-t-lg border-b-2'
        } transition-all whitespace-nowrap ${
          isDisabled 
            ? 'cursor-not-allowed opacity-50' 
            : 'cursor-pointer'
        } ${
          isActive
            ? 'bg-cyan-600/10 hover:brightness-125 text-cyan-400'
            : 'bg-gray-900/50 border-transparent text-gray-500 hover:bg-gray-800 hover:text-gray-300'
        } ${
          disabled && !analysisActive
            ? 'border-blue-500/30 bg-blue-900/20'
            : ''
        }`}
        title={
          analysisActive 
            ? "Tab switching disabled during analysis" 
            : disabled 
              ? "Tab switching disabled in prototype mode"
              : "Right-click for options"
        }
      >
        <div className={`${compact ? 'w-1.5 h-1.5' : 'w-2 h-2'} rounded-full ${
          analysisActive 
            ? 'bg-blue-500/50 animate-pulse' 
            : disabled && !isActive
              ? 'bg-blue-500/30'
              : isActive 
                ? 'bg-cyan-500 animate-pulse' 
                : 'bg-gray-600'
        }`} />
        
        <span className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
          {project.name}
        </span>
        <span className={`${compact ? 'text-xs' : 'text-xs'} opacity-70`}>
          :{project.port}
        </span>
        
        {disabled && !analysisActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-1 h-1 bg-blue-400 rounded-full"
          />
        )}
      </motion.div>

      {/* Context Menu */}
      <ProjectTabMenu
        project={project}
        isVisible={showMenu}
        position={menuPosition}
        onClose={() => setShowMenu(false)}
      />
    </>
  );
}; 