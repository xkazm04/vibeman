/**
 * Cross-Context Dependency Dashboard
 *
 * Wrapper component that fetches cross-context graph data
 * and provides the cascade simulation controls.
 * Replaces the npm DependenciesTab in the Reflector layout.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Network, RefreshCw, Loader2, GitBranch } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import CrossContextGraph from './CrossContextGraph';
import type { ContextGraph, CascadeAnalysis } from '@/lib/ideas/crossContextGraph';

export default function CrossContextDashboard() {
  const activeProject = useActiveProjectStore((s) => s.activeProject);
  const [graph, setGraph] = useState<ContextGraph | null>(null);
  const [cascade, setCascade] = useState<CascadeAnalysis | null>(null);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cascadeLoading, setCascadeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGraph = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ideas/cross-context-graph?projectId=${activeProject.id}`);
      if (!res.ok) throw new Error('Failed to load dependency graph');
      const data = await res.json();
      setGraph(data.graph);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph');
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  // Fetch cascade when a context is selected
  const handleSelectContext = useCallback(async (contextId: string | null) => {
    setSelectedContextId(contextId);

    if (!contextId || !activeProject?.id) {
      setCascade(null);
      return;
    }

    setCascadeLoading(true);
    try {
      const res = await fetch(
        `/api/ideas/cross-context-graph?projectId=${activeProject.id}&cascade=${contextId}`
      );
      if (res.ok) {
        const data = await res.json();
        setCascade(data.cascade);
      }
    } catch {
      // Cascade fetch failed silently
    } finally {
      setCascadeLoading(false);
    }
  }, [activeProject?.id]);

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-gray-500">Select a project to view the dependency graph</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-5 h-5 text-yellow-400 animate-spin mr-2" />
        <span className="text-sm text-gray-400">Loading dependency graph...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-sm text-red-400 mb-3">{error}</p>
        <button
          onClick={fetchGraph}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
            <GitBranch className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Cross-Context Dependencies</h2>
            <p className="text-xs text-gray-500">
              Click a context to simulate cascade impact
              {cascadeLoading && <span className="ml-2 text-yellow-400">analyzing...</span>}
            </p>
          </div>
        </div>
        <button
          onClick={fetchGraph}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/50 text-xs text-gray-400 hover:bg-gray-800 hover:text-gray-300 transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Graph */}
      {graph && (
        <div className="h-[560px] rounded-lg border border-gray-700/40 overflow-hidden">
          <CrossContextGraph
            graph={graph}
            cascade={cascade}
            onSelectContext={handleSelectContext}
            selectedContextId={selectedContextId}
          />
        </div>
      )}
    </div>
  );
}
