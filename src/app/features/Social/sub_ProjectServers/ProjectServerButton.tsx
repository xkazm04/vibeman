'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Power } from 'lucide-react';
import type { Project, ProcessInfo } from '@/types';

interface ProjectServerButtonProps {
  project: Project;
  status: ProcessInfo | null;
  onToggle: (projectId: string, isRunning: boolean) => Promise<void>;
}

export default function ProjectServerButton({
  project,
  status,
  onToggle,
}: ProjectServerButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const isRunning = status?.status === 'running';
  const isError = status?.status === 'error';

  const handleClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onToggle(project.id, isRunning);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={isLoading}
      className={`
        relative group flex flex-col items-center justify-center
        min-w-[120px] h-[80px] px-4 py-3
        rounded-xl border backdrop-blur-md
        transition-all duration-300
        ${isRunning
          ? 'bg-emerald-500/10 border-emerald-500/40 hover:bg-emerald-500/20'
          : isError
            ? 'bg-red-500/10 border-red-500/40 hover:bg-red-500/20'
            : 'bg-gray-800/40 border-gray-700/40 hover:bg-gray-700/50 hover:border-gray-600/50'
        }
        ${isLoading ? 'cursor-wait' : 'cursor-pointer'}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      title={isRunning ? `Stop ${project.name} (port ${project.port})` : `Start ${project.name}`}
    >
      {/* Port indicator */}
      <div className={`
        absolute top-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded
        ${isRunning
          ? 'bg-emerald-500/20 text-emerald-400'
          : 'bg-gray-700/50 text-gray-500'
        }
      `}>
        :{project.port}
      </div>

      {/* Status indicator */}
      <div className="absolute top-2 left-2">
        {isLoading ? (
          <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
        ) : isRunning ? (
          <motion.div
            className="w-2 h-2 rounded-full bg-emerald-400"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        ) : isError ? (
          <div className="w-2 h-2 rounded-full bg-red-400" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-gray-600" />
        )}
      </div>

      {/* Project name */}
      <span className={`
        text-sm font-medium truncate max-w-full text-center
        ${isRunning ? 'text-emerald-300' : isError ? 'text-red-300' : 'text-gray-300'}
      `}>
        {project.name}
      </span>

      {/* Power icon on hover */}
      <div className={`
        absolute inset-0 flex items-center justify-center
        opacity-0 group-hover:opacity-100 transition-opacity duration-200
        bg-black/30 rounded-xl backdrop-blur-sm
      `}>
        <Power className={`w-6 h-6 ${isRunning ? 'text-red-400' : 'text-emerald-400'}`} />
      </div>

      {/* Running glow effect */}
      {isRunning && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-emerald-500/5"
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(16, 185, 129, 0)',
              '0 0 20px 2px rgba(16, 185, 129, 0.2)',
              '0 0 0 0 rgba(16, 185, 129, 0)'
            ]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}
    </motion.button>
  );
}
