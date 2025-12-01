'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Circle, FolderOpen, Zap } from 'lucide-react';
import { groupIdeasByProjectAndContext } from '../lib/groupIdeasByProjectAndContext';

interface ConstellationViewProps {
  groupedData: ReturnType<typeof groupIdeasByProjectAndContext>;
  onToggleMode: () => void;
  onFocusProject: (projectId: string) => void;
}

export function ConstellationView({ groupedData, onToggleMode, onFocusProject }: ConstellationViewProps) {
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);

  return (
    <motion.div
      className="relative min-h-[600px] bg-gradient-to-br from-gray-900 via-purple-900/20 to-blue-900/20
                 rounded-xl border border-purple-500/30 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      data-testid="constellation-view"
    >
      {/* Background particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 p-6 border-b border-purple-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/40"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <Circle className="w-5 h-5 text-purple-400" />
            </motion.div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Constellation View
              </h2>
              <p className="text-sm text-gray-400">
                Interactive project universe
              </p>
            </div>
          </div>
          <motion.button
            onClick={onToggleMode}
            className="px-4 py-2 bg-gray-800/60 border border-gray-700/40 rounded-lg
                       text-gray-300 hover:bg-gray-800/80 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            data-testid="toggle-standard-view"
          >
            Standard View
          </motion.button>
        </div>
      </div>

      {/* Constellation Grid */}
      <div className="relative z-10 p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groupedData.projects.map((project, index) => (
          <motion.div
            key={project.projectId}
            className="relative"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: index * 0.1,
              type: 'spring',
              stiffness: 200,
              damping: 15
            }}
            onMouseEnter={() => setHoveredProject(project.projectId)}
            onMouseLeave={() => setHoveredProject(null)}
          >
            {/* Project Node */}
            <motion.div
              className="relative bg-gradient-to-br from-purple-500/20 to-blue-500/20
                         border-2 border-purple-500/40 rounded-xl p-6 cursor-pointer
                         backdrop-blur-sm"
              whileHover={{
                scale: 1.05,
                boxShadow: '0 0 40px rgba(168, 85, 247, 0.4)',
                borderColor: 'rgba(168, 85, 247, 0.8)'
              }}
              onClick={() => onFocusProject(project.projectId)}
              data-testid={`constellation-project-${project.projectId}`}
            >
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-blue-500/30
                           rounded-xl blur-xl -z-10"
                animate={{
                  opacity: hoveredProject === project.projectId ? 0.8 : 0.3,
                  scale: hoveredProject === project.projectId ? 1.2 : 1,
                }}
              />

              <div className="text-center space-y-3">
                <motion.div
                  className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-400 to-blue-400
                             rounded-full flex items-center justify-center"
                  animate={{
                    boxShadow: hoveredProject === project.projectId
                      ? '0 0 20px rgba(168, 85, 247, 0.6)'
                      : '0 0 0px rgba(168, 85, 247, 0)'
                  }}
                >
                  <FolderOpen className="w-8 h-8 text-white" />
                </motion.div>

                <h3 className="text-lg font-bold text-purple-300">
                  {project.projectName}
                </h3>

                <div className="flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-2xl font-bold text-yellow-400">
                    {project.totalIdeas}
                  </span>
                </div>

                {/* Context orbs */}
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {project.contexts.slice(0, 5).map((context, ctxIndex) => (
                    <motion.div
                      key={context.contextId || ctxIndex}
                      className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
                      style={{
                        backgroundColor: `${context.contextColor || '#6B7280'}40`,
                        borderColor: context.contextColor || '#6B7280',
                      }}
                      animate={{
                        y: hoveredProject === project.projectId
                          ? [0, -10, 0]
                          : 0,
                      }}
                      transition={{
                        duration: 1,
                        delay: ctxIndex * 0.1,
                        repeat: hoveredProject === project.projectId ? Infinity : 0,
                      }}
                    >
                      <span className="text-sm font-semibold text-white">
                        {context.count}
                      </span>
                    </motion.div>
                  ))}
                  {project.contexts.length > 5 && (
                    <div className="w-8 h-8 rounded-full border-2 border-gray-500
                                    bg-gray-700/40 flex items-center justify-center">
                      <span className="text-sm font-semibold text-gray-300">
                        +{project.contexts.length - 5}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
