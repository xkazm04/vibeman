import React from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Monitor, AlertTriangle } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { useServerProjectStore } from '@/stores/serverProjectStore';

export const StandalonePreviewLever: React.FC = () => {
  const { activeProject, showPreview, togglePreview } = useActiveProjectStore();
  const { processes } = useServerProjectStore();

  const status = activeProject ? processes[activeProject.id] : null;
  const isRunning = status?.status === 'running';

  const handleTogglePreview = () => {
    togglePreview();
  };

  const getPreviewState = () => {
    if (!activeProject) return 'no-project';
    if (!isRunning) return 'server-off';
    if (showPreview) return 'previewing';
    return 'ready';
  };

  const previewState = getPreviewState();

  return (
    <div className="relative">
      {/* Special Preview Lever */}
      <motion.button
        onClick={handleTogglePreview}
        className="relative cursor-pointer w-10 h-20 bg-gradient-to-b from-gray-800 to-gray-900 rounded-xl border-2 border-gray-600 focus:outline-none shadow-lg"
        title={
          !activeProject ? 'No project selected' :
          !isRunning ? 'Start server first' :
          showPreview ? 'Hide Preview' : 'Show Preview'
        }
      >
        {/* Lever Track with gradient */}
        <div className="absolute inset-1 bg-gradient-to-b from-gray-900 to-black rounded-lg">
          {/* Lever Handle */}
          <motion.div
            animate={{
              y: showPreview ? 32 : 0,
              scale: showPreview ? 1.1 : 1
            }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
              duration: 0.4
            }}
            className="relative w-7 h-7 mx-auto"
          >
            {/* Main Preview Circle */}
            <div
              className={`w-7 h-7 rounded-full border-2 transition-all duration-300 relative overflow-hidden ${
                previewState === 'previewing'
                  ? 'bg-gradient-to-br from-blue-400 to-blue-500 border-blue-300 shadow-lg shadow-blue-500/50'
                  : previewState === 'ready'
                  ? 'bg-gradient-to-br from-cyan-400 to-blue-500 border-cyan-300 shadow-lg shadow-cyan-500/40'
                  : previewState === 'server-off'
                  ? 'bg-gradient-to-br from-orange-400 to-red-500 border-orange-300 shadow-lg shadow-orange-500/40'
                  : 'bg-gradient-to-br from-gray-500 to-gray-600 border-gray-400 shadow-lg shadow-gray-500/30'
              }`}
            >
              {/* Flowing background animation */}
              <motion.div
                animate={{
                  background: [
                    previewState === 'previewing' 
                      ? 'linear-gradient(45deg, #60a5fa, #a855f7, #3b82f6, #8b5cf6)'
                      : previewState === 'ready'
                      ? 'linear-gradient(45deg, #22d3ee, #3b82f6, #06b6d4, #1e40af)'
                      : previewState === 'server-off'
                      ? 'linear-gradient(45deg, #fb923c, #ef4444, #f97316, #dc2626)'
                      : 'linear-gradient(45deg, #6b7280, #4b5563, #9ca3af, #374151)',
                    previewState === 'previewing'
                      ? 'linear-gradient(135deg, #a855f7, #3b82f6, #8b5cf6, #60a5fa)'
                      : previewState === 'ready'
                      ? 'linear-gradient(135deg, #3b82f6, #06b6d4, #1e40af, #22d3ee)'
                      : previewState === 'server-off'
                      ? 'linear-gradient(135deg, #ef4444, #f97316, #dc2626, #fb923c)'
                      : 'linear-gradient(135deg, #4b5563, #9ca3af, #374151, #6b7280)',
                    previewState === 'previewing'
                      ? 'linear-gradient(225deg, #3b82f6, #8b5cf6, #60a5fa, #a855f7)'
                      : previewState === 'ready'
                      ? 'linear-gradient(225deg, #06b6d4, #1e40af, #22d3ee, #3b82f6)'
                      : previewState === 'server-off'
                      ? 'linear-gradient(225deg, #f97316, #dc2626, #fb923c, #ef4444)'
                      : 'linear-gradient(225deg, #9ca3af, #374151, #6b7280, #4b5563)',
                    previewState === 'previewing'
                      ? 'linear-gradient(315deg, #8b5cf6, #60a5fa, #a855f7, #3b82f6)'
                      : previewState === 'ready'
                      ? 'linear-gradient(315deg, #1e40af, #22d3ee, #3b82f6, #06b6d4)'
                      : previewState === 'server-off'
                      ? 'linear-gradient(315deg, #dc2626, #fb923c, #ef4444, #f97316)'
                      : 'linear-gradient(315deg, #374151, #6b7280, #4b5563, #9ca3af)'
                  ]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute inset-0 rounded-full opacity-90"
              />

              {/* Flowing overlay effect */}
              <motion.div
                animate={{
                  x: [-10, 10, -10],
                  y: [-5, 5, -5],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className={`absolute inset-0 rounded-full opacity-60 ${
                  previewState === 'previewing'
                    ? 'bg-gradient-to-tr from-blue-300/50 via-blue-300/50 to-blue-400/50'
                    : previewState === 'ready'
                    ? 'bg-gradient-to-tr from-cyan-300/50 via-blue-300/50 to-cyan-400/50'
                    : previewState === 'server-off'
                    ? 'bg-gradient-to-tr from-orange-300/50 via-red-300/50 to-orange-400/50'
                    : 'bg-gradient-to-tr from-gray-300/50 via-gray-400/50 to-gray-300/50'
                }`}
              />

              {/* Icon inside the circle */}
              <div className="absolute inset-0 flex items-center justify-center z-10">
                {previewState === 'previewing' ? (
                  <Eye className="w-4 h-4 text-white drop-shadow-lg" />
                ) : previewState === 'ready' ? (
                  <Monitor className="w-4 h-4 text-white drop-shadow-lg" />
                ) : previewState === 'server-off' ? (
                  <AlertTriangle className="w-4 h-4 text-white drop-shadow-lg" />
                ) : (
                  <EyeOff className="w-4 h-4 text-white opacity-50 drop-shadow-lg" />
                )}
              </div>

              {/* Animated inner glow */}
              {activeProject && (
                <motion.div
                  animate={{
                    opacity: [0.2, 0.5, 0.2],
                    scale: [0.7, 1.3, 0.7]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`absolute inset-1 rounded-full ${
                    previewState === 'previewing' ? 'bg-blue-200/40' :
                    previewState === 'ready' ? 'bg-cyan-200/40' :
                    previewState === 'server-off' ? 'bg-orange-200/40' : 'bg-gray-300/40'
                  }`}
                />
              )}
            </div>
          </motion.div>

          {/* Position Indicators */}
          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-gray-500 rounded-full" />
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-gray-500 rounded-full" />
        </div>

        {/* Outer Glow Effect */}
        <motion.div
          animate={{
            opacity: activeProject ? 0.8 : 0.3,
            scale: activeProject ? 1.3 : 1
          }}
          transition={{ duration: 0.4 }}
          className={`absolute inset-0 rounded-xl blur-md -z-10 ${
            previewState === 'previewing' ? 'bg-blue-500/30' :
            previewState === 'ready' ? 'bg-cyan-500/30' :
            previewState === 'server-off' ? 'bg-orange-500/30' : 'bg-gray-500/20'
          }`}
        />
      </motion.button>
    </div>
  );
}; 