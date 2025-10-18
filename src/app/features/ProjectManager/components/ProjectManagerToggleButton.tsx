'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, X } from 'lucide-react';

interface ProjectManagerToggleButtonProps {
  isExpanded: boolean;
  onToggle: () => void;
}

const ProjectManagerToggleButton = React.memo(({ isExpanded, onToggle }: ProjectManagerToggleButtonProps) => {
  return (
    <motion.button
      onClick={onToggle}
      className="fixed top-4 right-4 z-50 p-3 bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-blue-900/30 backdrop-blur-xl border border-gray-700/40 rounded-2xl shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Neural Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-slate-500/5 to-blue-500/5 rounded-2xl" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent rounded-2xl" />
      
      {/* Animated Grid Pattern */}
      <motion.div
        className="absolute inset-0 opacity-5 rounded-2xl"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '8px 8px'
        }}
        animate={{
          backgroundPosition: ['0px 0px', '8px 8px'],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear"
        }}
      />

      <div className="relative flex items-center justify-center">
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {isExpanded ? (
            <X className="w-5 h-5 text-cyan-400" />
          ) : (
            <Activity className="w-5 h-5 text-cyan-400" />
          )}
        </motion.div>
      </div>

      {/* Floating Particles */}
      {Array.from({ length: 3 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-cyan-400/40 rounded-full"
          style={{
            left: `${20 + i * 20}%`,
            top: `${30 + i * 15}%`,
          }}
          animate={{
            y: [0, -10, 0],
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.5,
          }}
        />
      ))}
    </motion.button>
  );
});

ProjectManagerToggleButton.displayName = 'ProjectManagerToggleButton';

export default ProjectManagerToggleButton;