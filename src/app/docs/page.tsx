'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Compass, Folder, File } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import ContextSelector, { Context, ContextGroup } from '@/components/ContextSelector';
import MarkdownViewer from '@/components/markdown/MarkdownViewer';
import DocsAnalysisLayout from '../features/Docs/sub_DocsAnalysis/DocsAnalysisLayout';

type TabType = 'contexts' | 'analysis';

const TABS: { id: TabType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'contexts',
    label: 'Contexts',
    icon: <FileText className="w-4 h-4" />,
    description: 'Browse documentation by context'
  },
  {
    id: 'analysis',
    label: 'Architecture Explorer',
    icon: <Compass className="w-4 h-4" />,
    description: 'Interactive system architecture view'
  },
];

// Contexts Tab Content Component
function ContextsTabContent() {
  const { activeProject } = useActiveProjectStore();
  const [contexts, setContexts] = useState<Context[]>([]);
  const [contextGroups, setContextGroups] = useState<ContextGroup[]>([]);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedContext = selectedContextId
    ? contexts.find(c => c.id === selectedContextId)
    : undefined;

  const selectedGroup = selectedContext?.groupId
    ? contextGroups.find(g => g.id === selectedContext.groupId)
    : undefined;

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
        setContexts([]);
        setContextGroups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContexts();
  }, [activeProject]);

  const handleSelectContext = (contextId: string | null) => {
    setSelectedContextId(contextId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="docs-contexts-loading">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading contexts...</p>
        </div>
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="docs-no-project">
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
      <div className="flex items-center justify-center h-64" data-testid="docs-no-contexts">
        <div className="text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-50" />
          <p className="text-lg text-gray-400">No contexts found</p>
          <p className="text-sm text-gray-500 mt-2">Create contexts to organize your project documentation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="docs-contexts-content">
      <ContextSelector
        contexts={contexts}
        contextGroups={contextGroups}
        selectedContext={selectedContext}
        onSelectContext={handleSelectContext}
        showFullProjectButton={false}
      />

      <AnimatePresence mode="wait">
        {selectedContext ? (
          <motion.div
            key={selectedContext.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 rounded-2xl border border-gray-700/40 overflow-hidden"
            data-testid="docs-context-detail"
          >
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

                <div className="flex items-center gap-6 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <File className="w-4 h-4" />
                    <span>{selectedContext.filePaths.length} files</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
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
                      data-testid={`docs-file-item-${index}`}
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
            data-testid="docs-no-selection"
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

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('contexts');
  const { getThemeColors } = useThemeStore();
  const colors = getThemeColors();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8" data-testid="docs-page">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText className={`w-8 h-8 ${colors.textDark}`} />
            <h1 className="text-4xl font-bold text-white font-mono">Documentation</h1>
          </div>
          <p className="text-gray-400 text-sm">
            Browse and manage project documentation organized by contexts
          </p>
        </div>

        {/* Tab Menu */}
        <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-2 border border-gray-700/40 mb-6">
          <div className="flex items-center gap-2">
            {TABS.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? `${colors.bg} ${colors.text} border ${colors.borderHover}`
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/40'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title={tab.description}
                data-testid={`docs-tab-${tab.id}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className={`bg-gray-900/40 backdrop-blur-sm rounded-2xl border border-gray-700/40 overflow-hidden ${
          activeTab === 'analysis' ? 'h-[700px]' : ''
        }`} data-testid="docs-tab-content">
          {activeTab === 'contexts' && <ContextsTabContent />}
          {activeTab === 'analysis' && <DocsAnalysisLayout />}
        </div>
      </div>
    </div>
  );
}
