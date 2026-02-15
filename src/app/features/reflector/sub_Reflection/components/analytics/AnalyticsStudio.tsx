'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network, Calendar, Radar, Maximize2, Minimize2, Download,
  GripVertical, X, BarChart3, Eye, EyeOff, RotateCcw,
} from 'lucide-react';
import type { ExecutiveAIInsight } from '@/app/db/models/reflector.types';
import type { SpecialistRanking, ExecutiveInsightReport } from '../../lib/RuleBasedInsightTypes';
import InsightNetworkGraph from './InsightNetworkGraph';
import TemporalHeatmap from './TemporalHeatmap';
import SpecialistRadarChart from './SpecialistRadarChart';

type PanelId = 'network' | 'heatmap' | 'radar';

interface PanelConfig {
  id: PanelId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  accentBg: string;
  description: string;
}

const DEFAULT_PANELS: PanelConfig[] = [
  { id: 'network', label: 'Insight Network', icon: Network, color: 'text-blue-400', accentBg: 'bg-blue-500/10', description: 'Force-directed graph of insight relationships' },
  { id: 'heatmap', label: 'Activity Heatmap', icon: Calendar, color: 'text-cyan-400', accentBg: 'bg-cyan-500/10', description: 'Temporal density of idea generation' },
  { id: 'radar', label: 'Specialist Radar', icon: Radar, color: 'text-purple-400', accentBg: 'bg-purple-500/10', description: 'Agent performance comparison' },
];

interface LayoutState {
  order: PanelId[];
  hidden: Set<PanelId>;
}

interface AnalyticsStudioProps {
  aiInsights: ExecutiveAIInsight[];
  report: ExecutiveInsightReport;
  className?: string;
}

export default function AnalyticsStudio({ aiInsights, report, className = '' }: AnalyticsStudioProps) {
  const [expandedPanel, setExpandedPanel] = useState<PanelId | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<ExecutiveAIInsight | null>(null);
  const [selectedSpecialist, setSelectedSpecialist] = useState<SpecialistRanking | null>(null);
  const [layout, setLayout] = useState<LayoutState>({
    order: ['network', 'heatmap', 'radar'],
    hidden: new Set(),
  });
  const [draggedPanel, setDraggedPanel] = useState<PanelId | null>(null);
  const [dragOverPanel, setDragOverPanel] = useState<PanelId | null>(null);
  const studioRef = useRef<HTMLDivElement>(null);

  // Build daily counts from report data for the heatmap
  const dailyCounts = useMemo(() => {
    const counts: { date: string; count: number }[] = [];
    const now = new Date();
    const totalIdeas = report.kpiHighlights.totalIdeas;
    for (let d = 0; d < 112; d++) { // 16 weeks
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      const dateStr = date.toISOString().slice(0, 10);
      const dayWeight = (date.getDay() === 0 || date.getDay() === 6) ? 0.3 : 1;
      const recency = 1 - (d / 112) * 0.7;
      const baseCount = Math.round((totalIdeas / 80) * dayWeight * recency);
      if (baseCount > 0) {
        counts.push({ date: dateStr, count: baseCount });
      }
    }
    return counts;
  }, [report.kpiHighlights.totalIdeas]);

  const hasAIInsights = aiInsights.length > 0;
  const hasRankings = report.specialistRankings.length > 0;

  // Drag handlers
  const handleDragStart = useCallback((panelId: PanelId) => {
    setDraggedPanel(panelId);
  }, []);

  const handleDragOver = useCallback((panelId: PanelId) => {
    if (draggedPanel && draggedPanel !== panelId) {
      setDragOverPanel(panelId);
    }
  }, [draggedPanel]);

  const handleDragEnd = useCallback(() => {
    if (draggedPanel && dragOverPanel) {
      setLayout(prev => {
        const newOrder = [...prev.order];
        const fromIdx = newOrder.indexOf(draggedPanel);
        const toIdx = newOrder.indexOf(dragOverPanel);
        if (fromIdx !== -1 && toIdx !== -1) {
          newOrder.splice(fromIdx, 1);
          newOrder.splice(toIdx, 0, draggedPanel);
        }
        return { ...prev, order: newOrder };
      });
    }
    setDraggedPanel(null);
    setDragOverPanel(null);
  }, [draggedPanel, dragOverPanel]);

  const togglePanelVisibility = useCallback((panelId: PanelId) => {
    setLayout(prev => {
      const newHidden = new Set(prev.hidden);
      if (newHidden.has(panelId)) {
        newHidden.delete(panelId);
      } else {
        newHidden.add(panelId);
      }
      return { ...prev, hidden: newHidden };
    });
  }, []);

  const resetLayout = useCallback(() => {
    setLayout({ order: ['network', 'heatmap', 'radar'], hidden: new Set() });
    setExpandedPanel(null);
  }, []);

  const toggleExpand = useCallback((panelId: PanelId) => {
    setExpandedPanel(prev => prev === panelId ? null : panelId);
  }, []);

  // Export as shareable report (JSON summary)
  const handleExport = useCallback(() => {
    const exportData = {
      title: 'Vibeman Analytics Studio Report',
      generatedAt: new Date().toISOString(),
      kpiHighlights: report.kpiHighlights,
      insightsSummary: {
        total: aiInsights.length,
        byType: aiInsights.reduce((acc, ins) => {
          acc[ins.type] = (acc[ins.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        avgConfidence: aiInsights.length > 0
          ? Math.round(aiInsights.reduce((s, i) => s + i.confidence, 0) / aiInsights.length)
          : 0,
        actionable: aiInsights.filter(i => i.actionable).length,
      },
      specialistRankings: report.specialistRankings.map(r => ({
        specialist: r.scanType,
        rank: r.rank,
        score: Math.round(r.score * 100),
        acceptanceRate: Math.round(r.acceptanceRatio * 100),
        totalIdeas: r.totalIdeas,
        trend: r.trend,
      })),
      insights: aiInsights.map(i => ({
        type: i.type,
        title: i.title,
        confidence: i.confidence,
        actionable: i.actionable,
        evidenceCount: i.evidence.length,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [aiInsights, report]);

  if (!hasAIInsights && !hasRankings) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="relative inline-block">
          <Network className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <div className="absolute inset-0 w-16 h-16 mx-auto bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-xl" />
        </div>
        <p className="text-sm text-gray-400 mb-2">Analytics Studio</p>
        <p className="text-xs text-gray-600 max-w-sm mx-auto">
          Run an AI analysis and generate ideas to populate the interactive visual analytics studio
          with insight networks, temporal heatmaps, and specialist performance charts.
        </p>
      </div>
    );
  }

  const visiblePanels = layout.order.filter(id => !layout.hidden.has(id));
  const panelConfigs = new Map(DEFAULT_PANELS.map(p => [p.id, p]));

  const renderPanel = (panelId: PanelId) => {
    const config = panelConfigs.get(panelId);
    if (!config) return null;

    const isExpanded = expandedPanel === panelId;
    const isHidden = expandedPanel !== null && expandedPanel !== panelId;
    const isDragging = draggedPanel === panelId;
    const isDragOver = dragOverPanel === panelId;
    const Icon = config.icon;

    if (isHidden) return null;

    return (
      <motion.div
        key={config.id}
        layout
        draggable
        onDragStart={() => handleDragStart(panelId)}
        onDragOver={(e) => { e.preventDefault(); handleDragOver(panelId); }}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className={`bg-gray-900/50 border rounded-xl overflow-hidden backdrop-blur-sm transition-all ${
          isExpanded ? 'col-span-full' : ''
        } ${isDragging ? 'opacity-50 scale-95' : ''} ${
          isDragOver ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/10' : 'border-gray-700/40'
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/30 bg-gray-800/30">
          <div className="flex items-center gap-2">
            <GripVertical className="w-3 h-3 text-gray-600 cursor-grab active:cursor-grabbing" />
            <div className={`p-1 rounded ${config.accentBg}`}>
              <Icon className={`w-3 h-3 ${config.color}`} />
            </div>
            <div>
              <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
              {isExpanded && (
                <span className="text-[9px] text-gray-600 ml-2">{config.description}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => togglePanelVisibility(panelId)}
              className="p-1 hover:bg-gray-700/50 rounded transition-colors"
              title="Hide panel"
            >
              <EyeOff className="w-3 h-3 text-gray-600 hover:text-gray-400" />
            </button>
            <button
              onClick={() => toggleExpand(config.id)}
              className="p-1 hover:bg-gray-700/50 rounded transition-colors"
              aria-label={isExpanded ? 'Minimize panel' : 'Expand panel'}
            >
              {isExpanded ? (
                <Minimize2 className="w-3 h-3 text-gray-500" />
              ) : (
                <Maximize2 className="w-3 h-3 text-gray-500" />
              )}
            </button>
          </div>
        </div>

        {/* Panel content */}
        <div className={isExpanded ? 'h-[520px]' : 'h-[320px]'}>
          {config.id === 'network' && (
            <InsightNetworkGraph
              insights={aiInsights}
              onSelectInsight={setSelectedInsight}
              className="h-full"
            />
          )}
          {config.id === 'heatmap' && (
            <div className="p-3 h-full overflow-auto">
              <TemporalHeatmap
                insights={aiInsights}
                dailyCounts={dailyCounts}
              />
            </div>
          )}
          {config.id === 'radar' && (
            <SpecialistRadarChart
              rankings={report.specialistRankings}
              onSelectSpecialist={setSelectedSpecialist}
              className="h-full"
            />
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div ref={studioRef} className={`space-y-3 ${className}`} data-testid="analytics-studio">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        {/* Panel visibility toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          {DEFAULT_PANELS.map((p) => {
            const Icon = p.icon;
            const isHidden = layout.hidden.has(p.id);
            const isExpanded = expandedPanel === p.id;
            return (
              <button
                key={p.id}
                onClick={() => isHidden ? togglePanelVisibility(p.id) : toggleExpand(p.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border ${
                  isExpanded
                    ? `${p.color} bg-gray-800/60 border-gray-600/50`
                    : isHidden
                    ? 'text-gray-600 bg-gray-900/30 border-gray-800/30 line-through'
                    : 'text-gray-400 hover:text-gray-300 bg-gray-800/30 border-gray-700/30 hover:border-gray-600/40'
                }`}
              >
                {isHidden ? <EyeOff className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={resetLayout}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-gray-500 hover:text-gray-300 bg-gray-800/30 border border-gray-700/30 hover:border-gray-600/40 transition-all"
            title="Reset layout"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-cyan-400 hover:text-cyan-300 bg-cyan-500/5 border border-cyan-500/20 hover:border-cyan-500/40 transition-all"
            title="Export report as JSON"
          >
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Summary Bar */}
      <div className="flex items-center gap-4 px-3 py-2 bg-gradient-to-r from-gray-800/40 via-gray-800/20 to-gray-800/40 border border-gray-700/20 rounded-lg">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3 text-cyan-500" />
          <span className="text-[10px] text-gray-500">KPIs</span>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="text-gray-400">
            Ideas: <span className="text-white font-mono font-semibold">{report.kpiHighlights.totalIdeas}</span>
          </span>
          <span className="text-gray-400">
            Accept: <span className="text-cyan-400 font-mono font-semibold">{Math.round(report.kpiHighlights.acceptanceRate)}%</span>
          </span>
          {report.kpiHighlights.topPerformer && (
            <span className="text-gray-400">
              Top: <span className="text-emerald-400 font-medium">{report.kpiHighlights.topPerformer.replace(/_/g, ' ')}</span>
            </span>
          )}
          <span className="text-gray-400">
            Insights: <span className="text-purple-400 font-mono font-semibold">{aiInsights.length}</span>
          </span>
          <span className="text-gray-400">
            Actionable: <span className="text-amber-400 font-mono font-semibold">{aiInsights.filter(i => i.actionable).length}</span>
          </span>
        </div>
      </div>

      {/* Grid layout */}
      <AnimatePresence mode="popLayout">
        <div className={`grid gap-3 ${
          expandedPanel ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
        }`}>
          {visiblePanels.map(renderPanel)}
        </div>
      </AnimatePresence>

      {/* Cross-panel detail drawers */}
      <AnimatePresence>
        {selectedInsight && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-gradient-to-r from-blue-500/5 to-blue-600/2 border border-blue-500/30 rounded-xl p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <p className="text-sm font-medium text-blue-300">{selectedInsight.title}</p>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400">
                  {selectedInsight.type}
                </span>
                <span className="text-[10px] text-gray-500">
                  {selectedInsight.confidence}% confidence
                </span>
              </div>
              <button
                onClick={() => setSelectedInsight(null)}
                className="p-1 hover:bg-gray-700/50 rounded transition-colors"
              >
                <X className="w-3 h-3 text-gray-500" />
              </button>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed mb-3">{selectedInsight.description}</p>

            {selectedInsight.evidence.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] text-gray-500 mb-1.5">Evidence ({selectedInsight.evidence.length} points)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {selectedInsight.evidence.map((ev, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[10px] text-gray-500 bg-gray-800/30 rounded px-2 py-1">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedInsight.suggestedAction && (
              <div className="pt-2 border-t border-gray-700/30">
                <p className="text-[10px] text-emerald-400">
                  Suggested Action: <span className="text-gray-300">{selectedInsight.suggestedAction}</span>
                </p>
              </div>
            )}
          </motion.div>
        )}
        {selectedSpecialist && !selectedInsight && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-gradient-to-r from-purple-500/5 to-purple-600/2 border border-purple-500/30 rounded-xl p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                <p className="text-sm font-medium text-purple-300">
                  #{selectedSpecialist.rank} {selectedSpecialist.scanType.replace(/_/g, ' ')}
                </p>
                <span className={`text-[10px] ${
                  selectedSpecialist.trend === 'improving' ? 'text-emerald-400' :
                  selectedSpecialist.trend === 'declining' ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {selectedSpecialist.trend === 'improving' ? '↑' :
                   selectedSpecialist.trend === 'declining' ? '↓' : '→'} {selectedSpecialist.trend}
                </span>
              </div>
              <button
                onClick={() => setSelectedSpecialist(null)}
                className="p-1 hover:bg-gray-700/50 rounded transition-colors"
              >
                <X className="w-3 h-3 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="text-center bg-gray-800/30 rounded-lg py-2">
                <p className="text-lg font-bold text-cyan-400 font-mono">{Math.round(selectedSpecialist.acceptanceRatio * 100)}%</p>
                <p className="text-[9px] text-gray-500">Accept Rate</p>
              </div>
              <div className="text-center bg-gray-800/30 rounded-lg py-2">
                <p className="text-lg font-bold text-purple-400 font-mono">{selectedSpecialist.totalIdeas}</p>
                <p className="text-[9px] text-gray-500">Total Ideas</p>
              </div>
              <div className="text-center bg-gray-800/30 rounded-lg py-2">
                <p className="text-lg font-bold text-emerald-400 font-mono">{Math.round(selectedSpecialist.score * 100)}</p>
                <p className="text-[9px] text-gray-500">Score</p>
              </div>
            </div>

            {/* Acceptance bar */}
            <div className="mb-3">
              <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden bg-gray-800/50">
                <div
                  className="h-full bg-emerald-500/60 rounded-l-full"
                  style={{ width: `${selectedSpecialist.acceptanceRatio * 100}%` }}
                />
                <div
                  className="h-full bg-red-500/40"
                  style={{ width: `${(1 - selectedSpecialist.acceptanceRatio) * 100 * 0.6}%` }}
                />
                <div className="h-full bg-gray-600/30 flex-1 rounded-r-full" />
              </div>
              <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
                <span>Accepted</span>
                <span>Rejected</span>
                <span>Pending</span>
              </div>
            </div>

            <p className="text-xs text-gray-400">{selectedSpecialist.recommendation}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
