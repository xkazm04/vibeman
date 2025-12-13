'use client';

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  GitBranch,
  Lightbulb,
  Target,
  History,
  Play,
  RefreshCw,
  Camera,
  Settings,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { useArchitectureEvolutionStore, selectNodeById } from '@/stores/architectureEvolutionStore';
import ArchitectureGraph from './components/ArchitectureGraph';
import NodeDetailPanel from './components/NodeDetailPanel';
import DriftsList from './components/DriftsList';
import SuggestionsList from './components/SuggestionsList';

interface ArchitectureEvolutionProps {
  projectId: string;
}

export default function ArchitectureEvolution({ projectId }: ArchitectureEvolutionProps) {
  const {
    nodes,
    edges,
    drifts,
    suggestions,
    stats,
    settings,
    selection,
    analysis,
    activeTab,
    setActiveTab,
    selectNode,
    setHoveredNode,
    clearSelection,
    updateSettings,
    fetchAll,
    analyzeProject,
    updateDriftStatus,
    updateSuggestionStatus,
    createSnapshot,
  } = useArchitectureEvolutionStore();

  // Fetch data on mount
  useEffect(() => {
    fetchAll(projectId);
  }, [projectId, fetchAll]);

  // Get selected node
  const selectedNode = selection.selectedNodeId
    ? nodes.find((n) => n.id === selection.selectedNodeId) || null
    : null;

  // Handle analyze
  const handleAnalyze = useCallback(
    async (includeAI: boolean = false) => {
      try {
        await analyzeProject(projectId, includeAI);
      } catch (error) {
        console.error('Analysis failed:', error);
      }
    },
    [projectId, analyzeProject]
  );

  // Handle snapshot
  const handleSnapshot = useCallback(async () => {
    const name = `Snapshot ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    await createSnapshot(projectId, name);
  }, [projectId, createSnapshot]);

  // Tab configuration
  const tabs = [
    { id: 'graph', label: 'Graph', icon: GitBranch, count: nodes.length },
    { id: 'drifts', label: 'Drifts', icon: AlertTriangle, count: drifts.filter((d) => d.status === 'active').length },
    { id: 'suggestions', label: 'Suggestions', icon: Lightbulb, count: suggestions.filter((s) => s.status === 'pending').length },
    { id: 'ideals', label: 'Ideals', icon: Target, count: 0 },
    { id: 'history', label: 'History', icon: History, count: 0 },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-950" data-testid="architecture-evolution-container">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            <Layers className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Architecture Evolution</h1>
            <p className="text-xs text-gray-400">
              Living architecture model with dependency analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats summary */}
          <div className="flex items-center gap-4 px-4 py-2 bg-gray-900/50 rounded-lg border border-gray-700/50">
            <div className="text-center">
              <p className="text-lg font-semibold text-white">{stats.activeNodes}</p>
              <p className="text-xs text-gray-500">Modules</p>
            </div>
            <div className="w-px h-8 bg-gray-700" />
            <div className="text-center">
              <p className="text-lg font-semibold text-purple-400">{stats.totalEdges}</p>
              <p className="text-xs text-gray-500">Dependencies</p>
            </div>
            <div className="w-px h-8 bg-gray-700" />
            <div className="text-center">
              <p className="text-lg font-semibold text-red-400">{stats.circularCount}</p>
              <p className="text-xs text-gray-500">Circular</p>
            </div>
          </div>

          {/* Snapshot button */}
          <button
            onClick={handleSnapshot}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Create Snapshot"
            data-testid="create-snapshot-btn"
          >
            <Camera className="w-5 h-5 text-gray-400" />
          </button>

          {/* Settings dropdown */}
          <div className="relative group">
            <button
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              data-testid="settings-btn"
            >
              <Settings className="w-5 h-5 text-gray-400" />
            </button>

            <div className="absolute right-0 top-full mt-2 w-56 bg-gray-900 rounded-xl border border-gray-700 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <div className="p-3 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-gray-300">Show labels</span>
                  <input
                    type="checkbox"
                    checked={settings.showLabels}
                    onChange={(e) => updateSettings({ showLabels: e.target.checked })}
                    className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-cyan-500 focus:ring-cyan-500/50"
                    data-testid="toggle-labels-checkbox"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-gray-300">Highlight circular</span>
                  <input
                    type="checkbox"
                    checked={settings.highlightCircular}
                    onChange={(e) => updateSettings({ highlightCircular: e.target.checked })}
                    className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-cyan-500 focus:ring-cyan-500/50"
                    data-testid="toggle-circular-checkbox"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs text-gray-300">Group by layer</span>
                  <input
                    type="checkbox"
                    checked={settings.groupByLayer}
                    onChange={(e) => updateSettings({ groupByLayer: e.target.checked })}
                    className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-cyan-500 focus:ring-cyan-500/50"
                    data-testid="toggle-group-layer-checkbox"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Analyze button */}
          <div className="flex items-center">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAnalyze(false)}
              disabled={analysis.isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-l-lg text-sm font-medium transition-all shadow-lg shadow-cyan-500/20 disabled:shadow-none"
              data-testid="analyze-project-btn"
            >
              {analysis.isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {analysis.isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </motion.button>

            <div className="relative group">
              <button
                disabled={analysis.isAnalyzing}
                className="px-2 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-r-lg border-l border-white/20"
                data-testid="analyze-options-btn"
              >
                <ChevronDown className="w-4 h-4" />
              </button>

              <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900 rounded-xl border border-gray-700 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="p-2">
                  <button
                    onClick={() => handleAnalyze(true)}
                    disabled={analysis.isAnalyzing}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
                    data-testid="analyze-with-ai-btn"
                  >
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Analyze with AI
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Last analyzed */}
      {analysis.lastAnalyzedAt && (
        <div className="px-6 py-2 bg-gray-900/50 border-b border-gray-800 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          <span className="text-xs text-gray-400">
            Last analyzed: {new Date(analysis.lastAnalyzedAt).toLocaleString()}
          </span>
        </div>
      )}

      {/* Analysis error */}
      {analysis.analysisError && (
        <div className="px-6 py-2 bg-red-500/10 border-b border-red-500/30 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs text-red-400">{analysis.analysisError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-gray-800 bg-gray-900/50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
              data-testid={`tab-${tab.id}-btn`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-xs rounded-full ${
                    isActive ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'graph' && (
            <motion.div
              key="graph"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 p-4"
            >
              <div className="relative h-full">
                <ArchitectureGraph
                  nodes={nodes.filter((n) => n.is_active === 1)}
                  edges={edges}
                  selectedNodeId={selection.selectedNodeId}
                  hoveredNodeId={selection.hoveredNodeId}
                  onNodeSelect={selectNode}
                  onNodeHover={setHoveredNode}
                  settings={settings}
                />

                {selectedNode && (
                  <NodeDetailPanel
                    node={selectedNode}
                    allNodes={nodes}
                    edges={edges}
                    onClose={clearSelection}
                  />
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'drifts' && (
            <motion.div
              key="drifts"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 p-6 overflow-y-auto"
            >
              <DriftsList drifts={drifts} onUpdateStatus={updateDriftStatus} />
            </motion.div>
          )}

          {activeTab === 'suggestions' && (
            <motion.div
              key="suggestions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 p-6 overflow-y-auto"
            >
              <SuggestionsList
                suggestions={suggestions}
                onUpdateStatus={updateSuggestionStatus}
              />
            </motion.div>
          )}

          {activeTab === 'ideals' && (
            <motion.div
              key="ideals"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 p-6 flex items-center justify-center"
            >
              <div className="text-center">
                <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">Architecture Ideals</p>
                <p className="text-gray-500 text-sm">
                  Define your architecture rules and patterns
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 p-6 flex items-center justify-center"
            >
              <div className="text-center">
                <History className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">Architecture History</p>
                <p className="text-gray-500 text-sm">
                  View snapshots and track evolution over time
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
