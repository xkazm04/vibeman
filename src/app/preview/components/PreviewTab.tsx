import React from 'react';
import { motion } from 'framer-motion';
import { Play, Square } from 'lucide-react';
import { Project, ProcessInfo } from '@/types';

interface PreviewTabProps {
  project: Project;
  status: ProcessInfo | null;
  isRunning: boolean;
  isActive: boolean;
  onTabClick: (projectId: string) => void;
  onStartServer: (projectId: string) => void;
  onStopServer: (projectId: string) => void;
}

export const PreviewTab: React.FC<PreviewTabProps> = ({
  project,
  status,
  isRunning,
  isActive,
  onTabClick,
  onStartServer,
  onStopServer
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onTabClick(project.id)}
      className={`flex items-center gap-2 px-4 py-3 rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
        isActive
          ? 'bg-gray-800 border-blue-500 text-blue-400'
          : isRunning
          ? 'bg-gray-800/50 border-transparent text-gray-300 hover:bg-gray-800 hover:text-gray-100'
          : 'bg-gray-900/50 border-transparent text-gray-500'
      }`}
    >
      <div className={`w-2 h-2 rounded-full ${
        isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-600'
      }`} />
      
      <span className="font-medium">{project.name}</span>
      <span className="text-xs opacity-70">:{project.port}</span>
      
      {isRunning && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onStopServer(project.id);
          }}
          className="p-1 hover:bg-red-600/20 rounded text-red-400"
        >
          <Square size={12} />
        </motion.button>
      )}
      
      {!isRunning && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onStartServer(project.id);
          }}
          className="p-1 hover:bg-green-600/20 rounded text-green-400"
        >
          <Play size={12} />
        </motion.button>
      )}
    </motion.div>
  );
}; 