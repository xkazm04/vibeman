'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Calendar } from 'lucide-react';
import { useTooltipStore } from '@/stores/tooltipStore';
import MarkdownViewer from '@/components/markdown/MarkdownViewer';
import ContextPreviewManager from './ContextPreviewManager';
import AdvisorPanel from './AdvisorPanel';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

const ContextOverview = () => {
  const {
    isVisible,
    context,
    groupColor,
    hideTooltip
  } = useTooltipStore();

  const { activeProjectId } = useActiveProjectStore();
  const [mounted, setMounted] = useState(false);
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Array<{ path: string; content: string }>>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (context) {
      setCurrentPreview(context.preview || null);
      // Load file contents for AI analysis
      loadFileContents();
    }
  }, [context]);

  const loadFileContents = async () => {
    if (!context?.filePaths || context.filePaths.length === 0 || !activeProjectId) {
      setFileContents([]);
      return;
    }

    try {
      const contents = await Promise.all(
        context.filePaths.slice(0, 10).map(async (filePath) => {
          try {
            const response = await fetch('/api/disk/read-file', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filePath,
                projectId: activeProjectId
              }),
            });

            if (response.ok) {
              const data = await response.json();
              return { path: filePath, content: data.content || '' };
            }
          } catch (error) {
            console.error(`Failed to load file ${filePath}:`, error);
          }
          return null;
        })
      );

      setFileContents(contents.filter((c): c is { path: string; content: string } => c !== null));
    } catch (error) {
      console.error('Error loading file contents:', error);
      setFileContents([]);
    }
  };

  if (!context || !mounted) return null;

  const tooltipContent = (
    <div className="context-overview-container">
      <AnimatePresence>
        {isVisible && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50"
              onClick={hideTooltip}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative bg-gradient-to-br from-gray-900/95 via-slate-900/20 to-blue-900/30 border border-gray-700/50 rounded-3xl shadow-2xl w-full max-h-[90vh] overflow-hidden backdrop-blur-xl">
                {/* Neural Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-slate-500/5 to-blue-500/5" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent" />

                {/* Floating Neural Particles */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full"
                    style={{
                      backgroundColor: `${groupColor}40`,
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                      y: [0, -50, 0],
                      x: [0, Math.random() * 30 - 15, 0],
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0],
                    }}
                    transition={{
                      duration: 3 + Math.random() * 3,
                      repeat: Infinity,
                      delay: Math.random() * 2,
                      ease: "easeInOut"
                    }}
                  />
                ))}

                {/* Header */}
                <div className="relative flex items-center justify-between px-8 py-6 border-b border-gray-700/30">
                  <div className="flex items-center gap-4">
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
                      <FileText className="w-6 h-6" style={{ color: groupColor }} />
                    </motion.div>
                    <div className="flex-1">
                      <motion.h4
                        className="text-2xl font-bold font-mono bg-gradient-to-r bg-clip-text text-transparent"
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
                          <span>{context.filePaths?.length || 0} files</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" style={{ color: groupColor }} />
                          <span>{context.createdAt ? new Date(context.createdAt).toLocaleDateString() : 'Unknown'}</span>
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* Close Button */}
                  <motion.button
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={hideTooltip}
                    className="p-2 bg-gray-800/80 hover:bg-gray-700/80 rounded-full transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-5 h-5 text-gray-400 hover:text-white" />
                  </motion.button>
                </div>

                {/* Content */}
                <div className="relative p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                  {/* Preview Manager Section */}
                  <ContextPreviewManager
                    contextId={context.id}
                    currentPreview={currentPreview}
                    contextName={context.name}
                    groupColor={groupColor}
                    onPreviewUpdated={setCurrentPreview}
                  />

                  {/* Neural Description with Markdown Viewer */}
                  {context.description && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="p-6 rounded-2xl bg-gradient-to-r from-gray-800/40 to-gray-700/40 backdrop-blur-sm border border-gray-600/30"
                    >
                      <div className="flex items-center space-x-2 mb-4">
                        <FileText className="w-5 h-5" style={{ color: groupColor }} />
                        <h5 className="text-lg font-semibold text-gray-300 font-mono">Neural Description</h5>
                      </div>
                      <div className="markdown-content">
                        <MarkdownViewer content={context.description} />
                      </div>
                    </motion.div>
                  )}

                  {/* AI Advice Section */}
                  <AdvisorPanel
                    contextDescription={context.description || ''}
                    filePaths={context.filePaths || []}
                    fileContents={fileContents}
                    groupColor={groupColor}
                  />
                </div>

                {/* Footer */}
                <div className="relative flex items-center justify-between px-8 py-4 border-t border-gray-700/30 bg-gray-900/50">
                  <div className="text-sm text-gray-400 font-mono">
                    Last updated: {context.updatedAt ? new Date(context.updatedAt).toLocaleString() : 'Unknown'}
                  </div>

                  <motion.button
                    onClick={hideTooltip}
                    className="px-6 py-2 bg-gray-700/50 text-gray-300 hover:text-white rounded-xl transition-all font-mono border border-gray-600/50 hover:border-gray-500/50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Close
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );

  return createPortal(tooltipContent, document.body);
};

export default ContextOverview;
