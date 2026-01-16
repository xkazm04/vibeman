'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import type { ImpactAnalysisResult, ImpactNode, ImpactGraph, ImpactReport } from '@/lib/impact';
import { ImpactAnalyzer } from '@/lib/impact';
import type {
  ImpactViewMode,
  ImpactFilters,
  SelectedNodeState,
  GraphViewport,
} from '../lib/types';
import { DEFAULT_IMPACT_FILTERS } from '../lib/types';

interface UseImpactAnalysisProps {
  opportunities: RefactorOpportunity[];
  selectedOpportunities: Set<string>;
}

interface UseImpactAnalysisReturn {
  // Analysis state
  result: ImpactAnalysisResult | null;
  isAnalyzing: boolean;
  error: string | null;

  // View state
  viewMode: ImpactViewMode;
  setViewMode: (mode: ImpactViewMode) => void;

  // Selection state
  selectedNode: SelectedNodeState;
  selectNode: (node: ImpactNode | null) => void;
  toggleNodePreview: () => void;

  // Filters
  filters: ImpactFilters;
  setFilter: <K extends keyof ImpactFilters>(key: K, value: ImpactFilters[K]) => void;
  resetFilters: () => void;
  filteredGraph: ImpactGraph | null;

  // Viewport
  viewport: GraphViewport;
  setViewport: (viewport: GraphViewport) => void;
  resetViewport: () => void;

  // Scope adjustment
  excludeNode: (nodeId: string) => void;
  includeNode: (nodeId: string) => void;
  excludedNodes: Set<string>;

  // Actions
  runAnalysis: () => Promise<void>;
  generateReport: () => ImpactReport | null;
  clearResult: () => void;
}

export function useImpactAnalysis({
  opportunities,
  selectedOpportunities,
}: UseImpactAnalysisProps): UseImpactAnalysisReturn {
  // Analyzer instance
  const analyzerRef = useRef<ImpactAnalyzer>(new ImpactAnalyzer());

  // Analysis state
  const [result, setResult] = useState<ImpactAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<ImpactViewMode>('graph');

  // Selection state
  const [selectedNode, setSelectedNode] = useState<SelectedNodeState>({
    node: null,
    showPreview: false,
    showDetails: false,
  });

  // Filters
  const [filters, setFilters] = useState<ImpactFilters>(DEFAULT_IMPACT_FILTERS);

  // Viewport
  const [viewport, setViewport] = useState<GraphViewport>({
    x: 0,
    y: 0,
    scale: 1,
  });

  // Scope adjustment
  const [excludedNodes, setExcludedNodes] = useState<Set<string>>(new Set());

  // Get selected opportunities
  const selectedOpps = useMemo(() => {
    return opportunities.filter(o => selectedOpportunities.has(o.id));
  }, [opportunities, selectedOpportunities]);

  // Run analysis
  const runAnalysis = useCallback(async () => {
    if (selectedOpps.length === 0) {
      setError('No opportunities selected');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const analysisResult = await analyzerRef.current.analyzeImpact(selectedOpps);
      setResult(analysisResult);
      setExcludedNodes(new Set());
    } catch (err) {
      console.error('[useImpactAnalysis] Analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedOpps]);

  // Auto-run analysis when selection changes
  useEffect(() => {
    if (selectedOpps.length > 0) {
      runAnalysis();
    } else {
      setResult(null);
    }
  }, [selectedOpps.length]); // Only re-run when count changes, not full array

  // Filter graph based on current filters
  const filteredGraph = useMemo((): ImpactGraph | null => {
    if (!result) return null;

    const { graph } = result;
    const filteredNodes = graph.nodes.filter(node => {
      // Filter by impact level
      if (!filters.showDirect && node.level === 'direct') return false;
      if (!filters.showIndirect && node.level === 'indirect') return false;
      if (!filters.showPotential && node.level === 'potential') return false;

      // Filter by search term
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        if (!node.path.toLowerCase().includes(term) &&
            !node.fileName.toLowerCase().includes(term)) {
          return false;
        }
      }

      // Filter by file types
      if (filters.fileTypes.length > 0 && !filters.fileTypes.includes(node.extension)) {
        return false;
      }

      // Filter out excluded nodes
      if (excludedNodes.has(node.id)) {
        return false;
      }

      return true;
    });

    // Filter edges to only include those with both nodes present
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = graph.edges.filter(
      edge => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );

    return {
      nodes: filteredNodes,
      edges: filteredEdges,
      stats: graph.stats, // Keep original stats
    };
  }, [result, filters, excludedNodes]);

  // Selection handlers
  const selectNode = useCallback((node: ImpactNode | null) => {
    setSelectedNode({
      node,
      showPreview: node !== null,
      showDetails: false,
    });
  }, []);

  const toggleNodePreview = useCallback(() => {
    setSelectedNode(prev => ({
      ...prev,
      showPreview: !prev.showPreview,
    }));
  }, []);

  // Filter handlers
  const setFilter = useCallback(<K extends keyof ImpactFilters>(
    key: K,
    value: ImpactFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_IMPACT_FILTERS);
  }, []);

  // Viewport handlers
  const resetViewport = useCallback(() => {
    setViewport({ x: 0, y: 0, scale: 1 });
  }, []);

  // Scope adjustment handlers
  const excludeNode = useCallback((nodeId: string) => {
    setExcludedNodes(prev => new Set([...prev, nodeId]));
    analyzerRef.current.adjustScope(nodeId, 'exclude');
  }, []);

  const includeNode = useCallback((nodeId: string) => {
    setExcludedNodes(prev => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
    analyzerRef.current.adjustScope(nodeId, 'include');
  }, []);

  // Generate report
  const generateReport = useCallback((): ImpactReport | null => {
    if (!result) return null;
    try {
      return analyzerRef.current.generateReport(selectedOpps, result);
    } catch (err) {
      console.error('[useImpactAnalysis] Report generation failed:', err);
      return null;
    }
  }, [result, selectedOpps]);

  // Clear result
  const clearResult = useCallback(() => {
    setResult(null);
    setSelectedNode({ node: null, showPreview: false, showDetails: false });
    setExcludedNodes(new Set());
    analyzerRef.current.clearResult();
  }, []);

  return {
    // Analysis state
    result,
    isAnalyzing,
    error,

    // View state
    viewMode,
    setViewMode,

    // Selection state
    selectedNode,
    selectNode,
    toggleNodePreview,

    // Filters
    filters,
    setFilter,
    resetFilters,
    filteredGraph,

    // Viewport
    viewport,
    setViewport,
    resetViewport,

    // Scope adjustment
    excludeNode,
    includeNode,
    excludedNodes,

    // Actions
    runAnalysis,
    generateReport,
    clearResult,
  };
}
