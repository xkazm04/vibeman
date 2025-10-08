'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Calendar, Cpu, Zap, Database, X } from 'lucide-react';
import { useTooltipStore } from '../stores/tooltipStore';

const GlobalTooltip = () => {
  const {
    isVisible,
    context,
    groupColor,
    hideTooltip
  } = useTooltipStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!context || !mounted) return null;

  const tooltipContent = (
    <div className="global-tooltip-container">
      <AnimatePresence>
        {isVisible && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="global-tooltip-backdrop bg-black/30 backdrop-blur-sm"
              onClick={hideTooltip}
            />

            {/* Centered Tooltip */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
              className="global-tooltip-content bg-gradient-to-br from-gray-900 via-indigo-900/30 to-purple-900/40 border-2 rounded-2xl shadow-2xl p-6 backdrop-blur-xl"
              style={{
                maxWidth: '32rem',
                width: 'calc(100vw - 2rem)',
                maxHeight: '90vh',
                overflow: 'auto',
                borderColor: `${groupColor}60`,
                boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px ${groupColor}40`
              }}
            >
              {/* Close Button */}
              <motion.button
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={hideTooltip}
                className="absolute top-3 right-3 p-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-full transition-colors z-10"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-4 h-4 text-gray-400 hover:text-white" />
              </motion.button>

              {/* Neural Background Effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-indigo-500/5 to-purple-500/5 rounded-2xl" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent rounded-2xl" />

              {/* Animated Grid Pattern */}
              <motion.div
                className="absolute inset-0 opacity-5 rounded-2xl"
                style={{
                  backgroundImage: `
                  linear-gradient(${groupColor}30 1px, transparent 1px),
                  linear-gradient(90deg, ${groupColor}30 1px, transparent 1px)
                `,
                  backgroundSize: '8px 8px'
                }}
                animate={{
                  backgroundPosition: ['0px 0px', '8px 8px'],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />

              {/* Floating Particles */}
              {Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full"
                  style={{
                    backgroundColor: `${groupColor}60`,
                    left: `${20 + i * 25}%`,
                    top: `${15 + i * 20}%`,
                  }}
                  animate={{
                    y: [0, -8, 0],
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    repeat: Infinity,
                    delay: i * 0.4,
                  }}
                />
              ))}

              <div className="relative">
                {/* Neural Header */}
                <div className="flex items-center space-x-4 mb-5">
                  <motion.div
                    className="p-3 rounded-xl backdrop-blur-sm border"
                    style={{
                      backgroundColor: `${groupColor}20`,
                      borderColor: `${groupColor}40`
                    }}
                    animate={{
                      boxShadow: [`0 0 0 ${groupColor}00`, `0 0 20px ${groupColor}40`, `0 0 0 ${groupColor}00`]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Cpu className="w-5 h-5" style={{ color: groupColor }} />
                  </motion.div>
                  <div className="flex-1">
                    <motion.h4
                      className="text-xl font-bold font-mono bg-gradient-to-r bg-clip-text text-transparent"
                      style={{
                        backgroundImage: `linear-gradient(to right, ${groupColor}, ${groupColor}80)`
                      }}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      {context.name}
                    </motion.h4>
                    <motion.div
                      className="flex items-center space-x-4 mt-2 text-sm text-gray-400 font-mono"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="flex items-center space-x-1">
                        <FileText className="w-4 h-4" style={{ color: groupColor }} />
                        <span>{context.filePaths?.length || 0} neural links</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" style={{ color: groupColor }} />
                        <span>{context.createdAt ? new Date(context.createdAt).toLocaleDateString() : 'Unknown'}</span>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Neural Description */}
                {context.description && (
                  <motion.div
                    className="mb-5 p-3 rounded-xl bg-gradient-to-r from-gray-800/40 to-gray-700/40 backdrop-blur-sm border border-gray-600/30"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <Database className="w-4 h-4" style={{ color: groupColor }} />
                      <p className="text-sm font-medium text-gray-300 font-mono">Neural Description:</p>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed font-mono">{context.description}</p>
                  </motion.div>
                )}

                {/* Neural Data Matrix */}
                <motion.div
                  className="border-t border-gray-600/30 pt-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="flex items-center space-x-2 mb-3">
                    <Zap className="w-4 h-4" style={{ color: groupColor }} />
                    <p className="text-sm font-medium text-gray-300 font-mono">Data Matrix:</p>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {(context.filePaths || []).map((path, index) => (
                      <motion.div
                        key={index}
                        className="flex items-center space-x-3 p-2 rounded-lg bg-gray-800/30 backdrop-blur-sm border border-gray-700/20 hover:border-gray-600/40 transition-colors"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                      >
                        <motion.div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: groupColor }}
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.6, 1, 0.6]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: index * 0.2
                          }}
                        />
                        <div className="text-sm text-gray-300 font-mono truncate flex-1" title={path}>
                          {path}
                        </div>
                      </motion.div>
                    ))}

                    {(!context.filePaths || context.filePaths.length === 0) && (
                      <motion.div
                        className="text-center py-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        <p className="text-xs text-gray-500 font-mono">No neural links detected</p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Corner Reinforcements */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: groupColor }} />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: groupColor }} />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: groupColor }} />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: groupColor }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );

  return createPortal(tooltipContent, document.body);
};

export default GlobalTooltip;