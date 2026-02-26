'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History, Loader2, AlertCircle, ChevronDown, ChevronRight,
  TrendingUp, TrendingDown, Minus, Calendar, Zap, Lightbulb,
  AlertTriangle,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface StandupHistoryItem {
  id: string;
  periodType: 'daily' | 'weekly';
  periodStart: string;
  periodEnd: string;
  title: string;
  implementationsCount: number;
  ideasGenerated: number;
  velocityTrend: 'increasing' | 'stable' | 'decreasing' | null;
}

interface StandupDetail {
  id: string;
  summary: string;
  stats: {
    implementationsCount: number;
    ideasGenerated: number;
    ideasAccepted: number;
    ideasRejected: number;
    ideasImplemented: number;
    scansCount: number;
  };
  insights: {
    velocityTrend: 'increasing' | 'stable' | 'decreasing' | null;
    burnoutRisk: 'low' | 'medium' | 'high' | null;
  };
}

interface StandupHistoryTimelineProps {
  projectId: string;
  limit?: number;
}

// ── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color, height = 24, width = 80 }: {
  data: number[];
  color: string;
  height?: number;
  width?: number;
}) {
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const step = width / (data.length - 1);
  const padding = 2;
  const innerH = height - padding * 2;

  const points = data.map((v, i) => ({
    x: i * step,
    y: padding + innerH - (v / max) * innerH,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // Fill path (closed under the line)
  const fillD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height} L 0 ${height} Z`;

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#spark-${color})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* End dot */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="2"
        fill={color}
      />
    </svg>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function trendIcon(trend: string | null) {
  if (trend === 'increasing') return <TrendingUp className="w-3 h-3 text-emerald-400" />;
  if (trend === 'decreasing') return <TrendingDown className="w-3 h-3 text-red-400" />;
  return <Minus className="w-3 h-3 text-slate-500" />;
}

function trendLabel(trend: string | null) {
  if (trend === 'increasing') return 'text-emerald-400';
  if (trend === 'decreasing') return 'text-red-400';
  return 'text-slate-500';
}

function burnoutColor(risk: string | null) {
  if (risk === 'high') return 'text-red-400';
  if (risk === 'medium') return 'text-amber-400';
  return 'text-emerald-400';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Timeline Entry ───────────────────────────────────────────────────────────

function TimelineEntry({ item, projectId }: { item: StandupHistoryItem; projectId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<StandupDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const toggleExpand = useCallback(async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);

    if (detail) return; // already fetched

    setLoadingDetail(true);
    try {
      const res = await fetch(
        `/api/standup?projectId=${encodeURIComponent(projectId)}&periodType=${item.periodType}&periodStart=${item.periodStart}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.summary) {
          setDetail({
            id: data.summary.id,
            summary: data.summary.summary,
            stats: data.summary.stats,
            insights: data.summary.insights,
          });
        }
      }
    } catch {
      // silently fail - user can retry
    } finally {
      setLoadingDetail(false);
    }
  }, [expanded, detail, projectId, item]);

  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <div className="relative pl-6">
      {/* Timeline dot */}
      <div className={`absolute left-0 top-2.5 w-2.5 h-2.5 rounded-full border-2 ${
        item.periodType === 'weekly'
          ? 'border-purple-400 bg-purple-400/20'
          : 'border-blue-400 bg-blue-400/20'
      }`} />

      <button
        onClick={toggleExpand}
        className="w-full text-left group"
      >
        <div className="flex items-center gap-2 mb-1">
          <Chevron className="w-3 h-3 text-white/40 group-hover:text-white/70 transition-colors flex-shrink-0" />
          <span className="text-xs font-mono text-white/40">
            {formatDate(item.periodStart)}
            {item.periodType === 'weekly' && ` – ${formatDate(item.periodEnd)}`}
          </span>
          <span className={`text-2xs px-1.5 py-0.5 rounded font-mono uppercase ${
            item.periodType === 'weekly'
              ? 'bg-purple-500/10 text-purple-400/70 border border-purple-500/20'
              : 'bg-blue-500/10 text-blue-400/70 border border-blue-500/20'
          }`}>
            {item.periodType}
          </span>
          {trendIcon(item.velocityTrend)}
        </div>
        <p className="text-sm text-white/80 group-hover:text-white transition-colors truncate">
          {item.title}
        </p>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-white/40">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {item.implementationsCount} impl
          </span>
          <span className="flex items-center gap-1">
            <Lightbulb className="w-3 h-3" />
            {item.ideasGenerated} ideas
          </span>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {loadingDetail ? (
              <div className="flex items-center gap-2 py-3 text-white/40">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span className="text-xs">Loading details...</span>
              </div>
            ) : detail ? (
              <div className="mt-2 p-3 rounded-lg bg-white/[0.03] border border-white/5 space-y-3">
                {/* Mission briefing */}
                <p className="text-xs text-white/60 leading-relaxed line-clamp-4">
                  {detail.summary}
                </p>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-1.5 rounded bg-white/[0.03]">
                    <p className="text-sm font-mono text-white/80">{detail.stats.implementationsCount}</p>
                    <p className="text-2xs text-white/30">Impls</p>
                  </div>
                  <div className="text-center p-1.5 rounded bg-white/[0.03]">
                    <p className="text-sm font-mono text-white/80">{detail.stats.ideasAccepted}</p>
                    <p className="text-2xs text-white/30">Accepted</p>
                  </div>
                  <div className="text-center p-1.5 rounded bg-white/[0.03]">
                    <p className="text-sm font-mono text-white/80">{detail.stats.scansCount}</p>
                    <p className="text-2xs text-white/30">Scans</p>
                  </div>
                </div>

                {/* Insights row */}
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    {trendIcon(detail.insights.velocityTrend)}
                    <span className={trendLabel(detail.insights.velocityTrend)}>
                      {detail.insights.velocityTrend || 'N/A'}
                    </span>
                  </span>
                  {detail.insights.burnoutRisk && (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span className={burnoutColor(detail.insights.burnoutRisk)}>
                        {detail.insights.burnoutRisk} burnout risk
                      </span>
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-white/30 py-2">No details available</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function StandupHistoryTimeline({ projectId, limit = 30 }: StandupHistoryTimelineProps) {
  const [history, setHistory] = useState<StandupHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const controller = new AbortController();
    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/standup/history?projectId=${encodeURIComponent(projectId)}&limit=${limit}`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error('Failed to fetch standup history');
        const data = await res.json();
        setHistory(data.history || []);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
    return () => controller.abort();
  }, [projectId, limit]);

  // Derive sparkline data (chronological order, oldest first)
  const chronological = [...history].reverse();
  const implData = chronological.map((h) => h.implementationsCount);
  const ideasData = chronological.map((h) => h.ideasGenerated);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
        <AlertCircle className="w-4 h-4 text-red-400" />
        <span className="text-xs text-red-400">{error}</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <History className="w-6 h-6 text-white/20 mx-auto mb-2" />
        <p className="text-xs text-white/40">No standup history yet</p>
        <p className="text-xs text-white/25 mt-1">Generate a standup to see trends here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sparkline Summary */}
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-2xs text-white/40 font-mono uppercase">Velocity</span>
            <span className="text-2xs text-white/30 font-mono">{history.length}d</span>
          </div>
          <Sparkline data={implData} color="#38bdf8" width={120} height={28} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-2xs text-white/40 font-mono uppercase">Ideas</span>
            <span className="text-2xs text-white/30 font-mono">{history.length}d</span>
          </div>
          <Sparkline data={ideasData} color="#a78bfa" width={120} height={28} />
        </div>
      </div>

      {/* Burnout risk indicator from most recent entry */}
      {history.length > 0 && (() => {
        const latest = history[0];
        const trend = latest.velocityTrend;
        return (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/5">
            <Calendar className="w-3 h-3 text-white/30" />
            <span className="text-2xs text-white/40">Latest:</span>
            {trendIcon(trend)}
            <span className={`text-2xs ${trendLabel(trend)}`}>
              {trend || 'no data'}
            </span>
            <span className="text-2xs text-white/20 ml-auto font-mono">
              {formatDate(latest.periodStart)}
            </span>
          </div>
        );
      })()}

      {/* Timeline */}
      <div className="relative space-y-4">
        {/* Vertical line */}
        <div className="absolute left-[4px] top-3 bottom-3 w-px bg-white/10" />

        {history.map((item) => (
          <TimelineEntry key={item.id} item={item} projectId={projectId} />
        ))}
      </div>
    </div>
  );
}
