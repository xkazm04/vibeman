'use client';

import React, { useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network,
  List,
  FileText,
  Search,
  Filter,
  X,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import type { RefactorOpportunity } from '@/stores/refactorStore';
import { CyberCard } from '@/components/ui/wizard';
import { useImpactAnalysis } from '../hooks/useImpactAnalysis';
import { ImpactGraph } from './ImpactGraph';
import { ChangePreviewPanel } from './ChangePreviewPanel';
import { ImpactReport } from './ImpactReport';
import { IMPACT_COLORS, RISK_COLORS } from '../lib/types';
import type { ImpactViewMode, ImpactNode } from '../lib/types';

interface ImpactVisualizationProps {
  opportunities: RefactorOpportunity[];
  selectedOpportunities: Set<string>;
  isOpen: boolean;
  onClose: () => void;
}

export function ImpactVisualization({
  opportunities,
  selectedOpportunities,
  isOpen,
  onClose,
}: ImpactVisualizationProps) {
  const impact = useImpactAnalysis({
    opportunities,
    selectedOpportunities,
  });

  const [showFilters, setShowFilters] = React.useState(false);

  // Get unique file types for filter
  const fileTypes = useMemo(() => {
    if (!impact.filteredGraph) return [];
    const types = new Set<string>();
    impact.filteredGraph.nodes.forEach(n => {
      if (n.extension) types.add(n.extension);
    });
    return Array.from(types).sort();
  }, [impact.filteredGraph]);

  // Get change preview for selected node
  const selectedPreview = useMemo(() => {
    if (!impact.selectedNode.node || !impact.result) return null;
    return impact.result.changePreview.get(impact.selectedNode.node.id) || null;
  }, [impact.selectedNode.node, impact.result]);

  // Generate report for export
  const handleExport = useCallback(() => {
    const report = impact.generateReport();
    if (report) {
      console.log('[ImpactVisualization] Report generated:', report);
    }
  }, [impact]);

  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-gray-950/95 flex flex-col"
      >
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-white/10 bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <Network className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Impact Visualization</h2>
                <p className="text-xs text-gray-500">
                  {selectedOpportunities.size} opportunities selected
                  {impact.result && ` • ${impact.result.graph.stats.totalFiles} files analyzed`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Risk badge */}
              {impact.result && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${RISK_COLORS[impact.result.riskAssessment.overallRisk].bg}`}>
                  <AlertTriangle className={`w-4 h-4 ${RISK_COLORS[impact.result.riskAssessment.overallRisk].text}`} />
                  <span className={`text-sm font-medium capitalize ${RISK_COLORS[impact.result.riskAssessment.overallRisk].text}`}>
                    {impact.result.riskAssessment.overallRisk} Risk
                  </span>
                  <span className={`text-xs ${RISK_COLORS[impact.result.riskAssessment.overallRisk].text}`}>
                    ({impact.result.riskAssessment.score})
                  </span>
                </div>
              )}

              {/* Refresh button */}
              <button
                onClick={impact.runAnalysis}
                disabled={impact.isAnalyzing}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                title="Re-run analysis"
              >
                <RefreshCw className={`w-5 h-5 ${impact.isAnalyzing ? 'animate-spin' : ''}`} />
              </button>

              {/* Close button */}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* View mode tabs and filters */}
          <div className="flex items-center justify-between mt-4">
            {/* View mode tabs */}
            <div className="flex items-center gap-1 p-1 bg-gray-800/60 rounded-lg">
              <ViewModeButton
                mode="graph"
                currentMode={impact.viewMode}
                icon={Network}
                label="Graph"
                onClick={() => impact.setViewMode('graph')}
              />
              <ViewModeButton
                mode="list"
                currentMode={impact.viewMode}
                icon={List}
                label="List"
                onClick={() => impact.setViewMode('list')}
              />
              <ViewModeButton
                mode="report"
                currentMode={impact.viewMode}
                icon={FileText}
                label="Report"
                onClick={() => impact.setViewMode('report')}
              />
            </div>

            {/* Filters */}
            {impact.viewMode !== 'report' && (
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={impact.filters.searchTerm}
                    onChange={(e) => impact.setFilter('searchTerm', e.target.value)}
                    placeholder="Search files..."
                    className="w-48 pl-9 pr-3 py-1.5 bg-gray-800/60 border border-gray-700/40 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                {/* Filter toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    showFilters || !impact.filters.showDirect || !impact.filters.showIndirect || !impact.filters.showPotential
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-gray-800/60 text-gray-400 hover:text-gray-200 border border-gray-700/40'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>

                {/* Stats */}
                {impact.filteredGraph && (
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: IMPACT_COLORS.direct.fill }} />
                      {impact.filteredGraph.nodes.filter(n => n.level === 'direct').length}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: IMPACT_COLORS.indirect.fill }} />
                      {impact.filteredGraph.nodes.filter(n => n.level === 'indirect').length}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: IMPACT_COLORS.potential.fill }} />
                      {impact.filteredGraph.nodes.filter(n => n.level === 'potential').length}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Filter panel */}
          {showFilters && impact.viewMode !== 'report' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 p-3 rounded-lg bg-gray-800/40 border border-gray-700/40"
            >
              <div className="flex items-center gap-6">
                {/* Impact level toggles */}
                <div>
                  <span className="text-xs text-gray-500 mb-2 block">Impact Levels</span>
                  <div className="flex items-center gap-2">
                    <FilterToggle
                      label="Direct"
                      color={IMPACT_COLORS.direct.fill}
                      active={impact.filters.showDirect}
                      onChange={(v) => impact.setFilter('showDirect', v)}
                    />
                    <FilterToggle
                      label="Indirect"
                      color={IMPACT_COLORS.indirect.fill}
                      active={impact.filters.showIndirect}
                      onChange={(v) => impact.setFilter('showIndirect', v)}
                    />
                    <FilterToggle
                      label="Potential"
                      color={IMPACT_COLORS.potential.fill}
                      active={impact.filters.showPotential}
                      onChange={(v) => impact.setFilter('showPotential', v)}
                    />
                  </div>
                </div>

                {/* File type filter */}
                {fileTypes.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500 mb-2 block">File Types</span>
                    <div className="flex items-center gap-2">
                      {fileTypes.slice(0, 5).map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            const types = impact.filters.fileTypes.includes(type)
                              ? impact.filters.fileTypes.filter(t => t !== type)
                              : [...impact.filters.fileTypes, type];
                            impact.setFilter('fileTypes', types);
                          }}
                          className={`px-2 py-0.5 rounded text-xs transition-colors ${
                            impact.filters.fileTypes.includes(type)
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              : 'bg-gray-700/50 text-gray-400 hover:text-gray-200 border border-gray-600/50'
                          }`}
                        >
                          .{type}
                        </button>
                      ))}
                      {impact.filters.fileTypes.length > 0 && (
                        <button
                          onClick={() => impact.setFilter('fileTypes', [])}
                          className="text-xs text-gray-500 hover:text-gray-300"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Reset filters */}
                <button
                  onClick={impact.resetFilters}
                  className="ml-auto text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Reset all
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main content area */}
          <div className="flex-1 overflow-auto p-4">
            {impact.isAnalyzing ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-cyan-400 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-400">Analyzing impact...</p>
                </div>
              </div>
            ) : impact.error ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <p className="text-gray-400">{impact.error}</p>
                  <button
                    onClick={impact.runAnalysis}
                    className="mt-4 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : impact.viewMode === 'graph' && impact.filteredGraph ? (
              <ImpactGraph
                graph={impact.filteredGraph}
                selectedNode={impact.selectedNode.node}
                onSelectNode={impact.selectNode}
                viewport={impact.viewport}
                onViewportChange={impact.setViewport}
                width={900}
                height={600}
              />
            ) : impact.viewMode === 'list' && impact.filteredGraph ? (
              <FileListView
                nodes={impact.filteredGraph.nodes}
                selectedNode={impact.selectedNode.node}
                onSelectNode={impact.selectNode}
                excludedNodes={impact.excludedNodes}
                onExclude={impact.excludeNode}
                onInclude={impact.includeNode}
              />
            ) : impact.viewMode === 'report' && impact.result ? (
              <ImpactReport
                report={impact.generateReport()}
                executionPlan={impact.result.executionPlan}
                onExport={handleExport}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Network className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Select opportunities to visualize impact</p>
                </div>
              </div>
            )}
          </div>

          {/* Side panel for change preview */}
          {impact.viewMode !== 'report' && (
            <ChangePreviewPanel
              node={impact.selectedNode.node}
              preview={selectedPreview}
              isOpen={impact.selectedNode.showPreview}
              onClose={() => impact.selectNode(null)}
              onExclude={impact.excludeNode}
              onInclude={impact.includeNode}
              isExcluded={impact.selectedNode.node ? impact.excludedNodes.has(impact.selectedNode.node.id) : false}
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ViewModeButton({
  mode,
  currentMode,
  icon: Icon,
  label,
  onClick,
}: {
  mode: ImpactViewMode;
  currentMode: ImpactViewMode;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        mode === currentMode
          ? 'bg-cyan-500 text-white'
          : 'text-gray-400 hover:text-gray-200'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function FilterToggle({
  label,
  color,
  active,
  onChange,
}: {
  label: string;
  color: string;
  active: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!active)}
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
        active
          ? 'bg-white/10 text-white'
          : 'bg-gray-700/50 text-gray-500'
      }`}
    >
      {active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color, opacity: active ? 1 : 0.3 }} />
      {label}
    </button>
  );
}

function FileListView({
  nodes,
  selectedNode,
  onSelectNode,
  excludedNodes,
  onExclude,
  onInclude,
}: {
  nodes: ImpactNode[];
  selectedNode: ImpactNode | null;
  onSelectNode: (node: ImpactNode | null) => void;
  excludedNodes: Set<string>;
  onExclude: (id: string) => void;
  onInclude: (id: string) => void;
}) {
  // Group nodes by directory
  const groupedNodes = useMemo(() => {
    const groups = new Map<string, ImpactNode[]>();
    for (const node of nodes) {
      const dir = node.directory || '/';
      if (!groups.has(dir)) {
        groups.set(dir, []);
      }
      groups.get(dir)!.push(node);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [nodes]);

  return (
    <div className="space-y-4">
      {groupedNodes.map(([directory, dirNodes]) => (
        <CyberCard key={directory} variant="dark" className="!p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-400 truncate">{directory || '/'}</span>
            <span className="text-xs text-gray-600">({dirNodes.length})</span>
          </div>
          <div className="space-y-1">
            {dirNodes.map(node => {
              const isSelected = selectedNode?.id === node.id;
              const isExcluded = excludedNodes.has(node.id);
              const levelColors = IMPACT_COLORS[node.level];

              return (
                <button
                  key={node.id}
                  onClick={() => onSelectNode(node)}
                  className={`w-full flex items-center justify-between p-2 rounded transition-colors ${
                    isSelected
                      ? 'bg-cyan-500/20 border border-cyan-500/30'
                      : isExcluded
                      ? 'bg-gray-800/50 opacity-50'
                      : 'hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: levelColors.fill, opacity: isExcluded ? 0.3 : 1 }}
                    />
                    <span className={`text-sm truncate ${isExcluded ? 'text-gray-600' : 'text-gray-200'}`}>
                      {node.fileName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs capitalize ${isExcluded ? 'text-gray-600' : 'text-gray-500'}`}>
                      {node.level}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        isExcluded ? onInclude(node.id) : onExclude(node.id);
                      }}
                      className={`p-1 rounded ${
                        isExcluded
                          ? 'text-gray-500 hover:text-gray-300'
                          : 'text-gray-400 hover:text-red-400'
                      }`}
                      title={isExcluded ? 'Include in scope' : 'Exclude from scope'}
                    >
                      {isExcluded ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </button>
              );
            })}
          </div>
        </CyberCard>
      ))}
    </div>
  );
}
