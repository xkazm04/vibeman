'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Folder, Clock, File } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import ContextSelector, { Context, ContextGroup } from '@/components/ContextSelector';
import MarkdownViewer from '@/components/markdown/MarkdownViewer';

export default function DocsContextsLayout() {
  const { activeProject } = useActiveProjectStore();
  const [contexts, setContexts] = useState<Context[]>([]);
  const [contextGroups, setContextGroups] = useState<ContextGroup[]>([]);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Selected context object
  const selectedContext = selectedContextId
    ? contexts.find(c => c.id === selectedContextId)
    : undefined;

  const selectedGroup = selectedContext?.groupId
    ? contextGroups.find(g => g.id === selectedContext.groupId)
    : undefined;

  // Fetch contexts and groups when active project changes
  useEffect(() => {
    const fetchContexts = async () => {
      if (!activeProject) {
        setContexts([]);
        setContextGroups([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/contexts?projectId=${activeProject.id}`);

        if (!response.ok) {
          throw new Error('Failed to fetch contexts');
        }

        const data = await response.json();

        if (data.success) {
          setContexts(data.data.contexts || []);
          setContextGroups(data.data.groups || []);
        }
      } catch (error) {
        // Error fetching contexts
        setContexts([]);
        setContextGroups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContexts();
  }, [activeProject]);

  // Handle context selection
  const handleSelectContext = (contextId: string | null) => {
    setSelectedContextId(contextId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading contexts...</p>
        </div>
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Folder className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-50" />
          <p className="text-lg text-gray-400">No active project</p>
          <p className="text-sm text-gray-500 mt-2">Select a project to view its documentation</p>
        </div>
      </div>
    );
  }

  if (contexts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-50" />
          <p className="text-lg text-gray-400">No contexts found</p>
          <p className="text-sm text-gray-500 mt-2">Create contexts to organize your project documentation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Context Selector */}
      <ContextSelector
        contexts={contexts}
        contextGroups={contextGroups}
        selectedContext={selectedContext}
        onSelectContext={handleSelectContext}
        showFullProjectButton={false}
      />

      {/* Context Details */}
      <AnimatePresence mode="wait">
        {selectedContext ? (
          <motion.div
            key={selectedContext.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 rounded-2xl border border-gray-700/40 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-700/40">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white font-mono mb-2">
                    {selectedContext.name}
                  </h2>
                  {selectedGroup && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: selectedGroup.color }}
                      />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: selectedGroup.color }}
                      >
                        {selectedGroup.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-6 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <File className="w-4 h-4" />
                    <span>{selectedContext.filePaths.length} files</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-6 space-y-6">
              {/* Description as Markdown */}
              {selectedContext.description ? (
                <div className="bg-gray-800/40 rounded-xl p-6 border border-gray-700/30">
                  <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Description
                  </h3>
                  <div className="prose prose-invert max-w-none">
                    <MarkdownViewer content={selectedContext.description} />
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800/40 rounded-xl p-6 border border-gray-700/30">
                  <div className="text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No description available</p>
                  </div>
                </div>
              )}

              {/* File Paths */}
              <div className="bg-gray-800/40 rounded-xl p-6 border border-gray-700/30">
                <h3 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                  <Folder className="w-5 h-5" />
                  Files ({selectedContext.filePaths.length})
                </h3>
                <div className="space-y-2">
                  {selectedContext.filePaths.map((filePath, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 px-3 py-2 bg-gray-900/40 rounded-lg border border-gray-700/20"
                    >
                      <File className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm text-gray-300 font-mono break-all">
                        {filePath}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="no-selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center h-64 bg-gray-800/20 rounded-2xl border border-gray-700/20 border-dashed"
          >
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-600 opacity-50" />
              <p className="text-lg text-gray-400">Select a context to view documentation</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
