'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Grid3X3, Check, X, Eye, TrendingUp, Clock } from 'lucide-react';
import { DbDirection } from '@/app/db';
import { useModal } from '@/contexts/ModalContext';
import MarkdownViewer from '@/components/markdown/MarkdownViewer';

// ── Types ───────────────────────────────────────────────────────────────────

type Quadrant = 'quick-wins' | 'strategic-bets' | 'fill-ins' | 'avoid';

interface QuadrantConfig {
  label: string;
  description: string;
  color: string;
  bgClass: string;
  borderClass: string;
}

const QUADRANTS: Record<Quadrant, QuadrantConfig> = {
  'quick-wins': {
    label: 'Quick Wins',
    description: 'High impact, low effort',
    color: '#10b981',
    bgClass: 'bg-emerald-500/5',
    borderClass: 'border-emerald-500/20',
  },
  'strategic-bets': {
    label: 'Strategic Bets',
    description: 'High impact, high effort',
    color: '#3b82f6',
    bgClass: 'bg-blue-500/5',
    borderClass: 'border-blue-500/20',
  },
  'fill-ins': {
    label: 'Fill-ins',
    description: 'Low impact, low effort',
    color: '#a855f7',
    bgClass: 'bg-purple-500/5',
    borderClass: 'border-purple-500/20',
  },
  'avoid': {
    label: 'Avoid',
    description: 'Low impact, high effort',
    color: '#ef4444',
    bgClass: 'bg-red-500/5',
    borderClass: 'border-red-500/20',
  },
};

// Context color palette for dot coloring
const CONTEXT_COLORS = [
  '#10b981', '#3b82f6', '#a855f7', '#f59e0b',
  '#ec4899', '#06b6d4', '#f43f5e', '#84cc16',
];

function getQuadrant(effort: number, impact: number): Quadrant {
  const isHighImpact = impact > 5;
  const isHighEffort = effort > 5;
  if (isHighImpact && !isHighEffort) return 'quick-wins';
  if (isHighImpact && isHighEffort) return 'strategic-bets';
  if (!isHighImpact && !isHighEffort) return 'fill-ins';
  return 'avoid';
}

// ── Main Component ──────────────────────────────────────────────────────────

interface DirectionMatrixProps {
  directions: DbDirection[];
  onAcceptDirection: (directionId: string) => void;
  onRejectDirection: (directionId: string) => void;
}

export default function DirectionMatrix({
  directions,
  onAcceptDirection,
  onRejectDirection,
}: DirectionMatrixProps) {
  const { showModal } = useModal();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Only show directions that have both effort and impact scored
  const scoredDirections = useMemo(
    () => directions.filter(d => d.effort != null && d.impact != null),
    [directions]
  );

  const unscoredCount = directions.length - scoredDirections.length;

  // Build context color map
  const contextColorMap = useMemo(() => {
    const map = new Map<string, string>();
    const contexts = [...new Set(scoredDirections.map(d => d.context_name || d.context_map_title))];
    contexts.forEach((ctx, i) => map.set(ctx, CONTEXT_COLORS[i % CONTEXT_COLORS.length]));
    return map;
  }, [scoredDirections]);

  // Group by quadrant for the list view below
  const quadrantGroups = useMemo(() => {
    const groups: Record<Quadrant, DbDirection[]> = {
      'quick-wins': [],
      'strategic-bets': [],
      'fill-ins': [],
      'avoid': [],
    };
    for (const d of scoredDirections) {
      const q = getQuadrant(d.effort!, d.impact!);
      groups[q].push(d);
    }
    // Sort each group by impact/effort ratio descending
    for (const key of Object.keys(groups) as Quadrant[]) {
      groups[key].sort((a, b) => (b.impact! / b.effort!) - (a.impact! / a.effort!));
    }
    return groups;
  }, [scoredDirections]);

  const handleViewDirection = useCallback((d: DbDirection) => {
    showModal(
      {
        title: d.summary,
        subtitle: d.context_name || d.context_map_title,
        icon: Eye,
        iconBgColor: 'from-cyan-500/20 via-teal-500/10 to-emerald-500/20',
        iconColor: 'text-cyan-400',
        maxWidth: 'max-w-4xl',
        maxHeight: 'max-h-[85vh]',
        showBackdrop: true,
        backdropBlur: true,
      },
      <MarkdownViewer content={d.direction} />
    );
  }, [showModal]);

  // Chart dimensions
  const CHART_W = 520;
  const CHART_H = 360;
  const PAD = 40;
  const plotW = CHART_W - PAD * 2;
  const plotH = CHART_H - PAD * 2;

  if (scoredDirections.length === 0) {
    return (
      <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/40 p-8 text-center">
        <Grid3X3 className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-zinc-300 mb-1">No scored directions</h3>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          {directions.length > 0
            ? `${directions.length} direction${directions.length !== 1 ? 's' : ''} found but none have effort/impact scores. Scores are auto-estimated during AI generation.`
            : 'Generate directions to see them plotted on the impact/effort matrix.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/40 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-zinc-200">Impact / Effort Matrix</h3>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-zinc-500">
            <span>{scoredDirections.length} scored</span>
            {unscoredCount > 0 && (
              <span className="text-amber-400/70">{unscoredCount} unscored</span>
            )}
          </div>
        </div>

        <div className="flex justify-center overflow-x-auto">
          <svg width={CHART_W} height={CHART_H} className="block">
            {/* Quadrant backgrounds */}
            {/* Top-left: Quick Wins (low effort, high impact) */}
            <rect x={PAD} y={PAD} width={plotW / 2} height={plotH / 2} fill="rgba(16, 185, 129, 0.04)" />
            {/* Top-right: Strategic Bets (high effort, high impact) */}
            <rect x={PAD + plotW / 2} y={PAD} width={plotW / 2} height={plotH / 2} fill="rgba(59, 130, 246, 0.04)" />
            {/* Bottom-left: Fill-ins (low effort, low impact) */}
            <rect x={PAD} y={PAD + plotH / 2} width={plotW / 2} height={plotH / 2} fill="rgba(168, 85, 247, 0.04)" />
            {/* Bottom-right: Avoid (high effort, low impact) */}
            <rect x={PAD + plotW / 2} y={PAD + plotH / 2} width={plotW / 2} height={plotH / 2} fill="rgba(239, 68, 68, 0.04)" />

            {/* Quadrant labels */}
            <text x={PAD + plotW * 0.25} y={PAD + 16} textAnchor="middle" className="fill-emerald-500/40" fontSize={10} fontWeight={600}>Quick Wins</text>
            <text x={PAD + plotW * 0.75} y={PAD + 16} textAnchor="middle" className="fill-blue-500/40" fontSize={10} fontWeight={600}>Strategic Bets</text>
            <text x={PAD + plotW * 0.25} y={PAD + plotH - 6} textAnchor="middle" className="fill-purple-500/40" fontSize={10} fontWeight={600}>Fill-ins</text>
            <text x={PAD + plotW * 0.75} y={PAD + plotH - 6} textAnchor="middle" className="fill-red-500/40" fontSize={10} fontWeight={600}>Avoid</text>

            {/* Grid lines */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => {
              const x = PAD + ((v - 1) / 9) * plotW;
              const y = PAD + (1 - (v - 1) / 9) * plotH;
              return (
                <g key={v}>
                  <line x1={x} y1={PAD} x2={x} y2={PAD + plotH} stroke="rgba(63,63,70,0.2)" strokeDasharray="2,3" />
                  <line x1={PAD} y1={y} x2={PAD + plotW} y2={y} stroke="rgba(63,63,70,0.2)" strokeDasharray="2,3" />
                </g>
              );
            })}

            {/* Center dividers (effort=5.5, impact=5.5) */}
            <line x1={PAD + plotW / 2} y1={PAD} x2={PAD + plotW / 2} y2={PAD + plotH} stroke="rgba(113,113,122,0.3)" strokeWidth={1} />
            <line x1={PAD} y1={PAD + plotH / 2} x2={PAD + plotW} y2={PAD + plotH / 2} stroke="rgba(113,113,122,0.3)" strokeWidth={1} />

            {/* Axis labels */}
            <text x={CHART_W / 2} y={CHART_H - 4} textAnchor="middle" className="fill-zinc-500" fontSize={10}>
              Effort →
            </text>
            <text x={10} y={CHART_H / 2} textAnchor="middle" className="fill-zinc-500" fontSize={10} transform={`rotate(-90, 10, ${CHART_H / 2})`}>
              Impact →
            </text>

            {/* Axis tick labels */}
            {[1, 5, 10].map(v => {
              const x = PAD + ((v - 1) / 9) * plotW;
              const y = PAD + (1 - (v - 1) / 9) * plotH;
              return (
                <g key={`tick-${v}`}>
                  <text x={x} y={PAD + plotH + 14} textAnchor="middle" className="fill-zinc-600" fontSize={8} fontFamily="monospace">{v}</text>
                  <text x={PAD - 6} y={y + 3} textAnchor="end" className="fill-zinc-600" fontSize={8} fontFamily="monospace">{v}</text>
                </g>
              );
            })}

            {/* Data points */}
            {scoredDirections.map((d, i) => {
              const cx = PAD + ((d.effort! - 1) / 9) * plotW;
              const cy = PAD + (1 - (d.impact! - 1) / 9) * plotH;
              const ctxName = d.context_name || d.context_map_title;
              const color = contextColorMap.get(ctxName) || '#a855f7';
              const isHovered = hoveredId === d.id;
              const isPending = d.status === 'pending';

              return (
                <g key={d.id}>
                  <motion.circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 8 : 6}
                    fill={color}
                    fillOpacity={isPending ? 0.8 : 0.4}
                    stroke={isHovered ? 'white' : color}
                    strokeWidth={isHovered ? 2 : 1}
                    strokeOpacity={0.6}
                    className="cursor-pointer"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.03, type: 'spring', stiffness: 300 }}
                    onMouseEnter={() => setHoveredId(d.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => handleViewDirection(d)}
                  />
                  {/* Status indicator for accepted/rejected */}
                  {d.status === 'accepted' && (
                    <text x={cx} y={cy + 3} textAnchor="middle" className="fill-white pointer-events-none" fontSize={8} fontWeight={700}>✓</text>
                  )}
                  {d.status === 'rejected' && (
                    <text x={cx} y={cy + 3} textAnchor="middle" className="fill-white pointer-events-none" fontSize={8} fontWeight={700}>×</text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Context legend */}
        {contextColorMap.size > 1 && (
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {Array.from(contextColorMap.entries()).map(([name, color]) => (
              <div key={name} className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="truncate max-w-[120px]">{name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tooltip */}
        {hoveredId && (() => {
          const d = scoredDirections.find(x => x.id === hoveredId);
          if (!d) return null;
          return (
            <div className="mt-3 px-3 py-2 bg-zinc-900/90 border border-zinc-700/50 rounded-lg text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-zinc-200 font-medium line-clamp-1">{d.summary}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  d.status === 'accepted' ? 'bg-green-500/20 text-green-400'
                  : d.status === 'rejected' ? 'bg-red-500/20 text-red-400'
                  : 'bg-amber-500/20 text-amber-400'
                }`}>{d.status}</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Effort: {d.effort}/10</span>
                <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Impact: {d.impact}/10</span>
                <span className="text-zinc-500">{d.context_name || d.context_map_title}</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Quadrant Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(['quick-wins', 'strategic-bets', 'fill-ins', 'avoid'] as Quadrant[]).map(q => {
          const config = QUADRANTS[q];
          const items = quadrantGroups[q];
          if (items.length === 0) return null;

          return (
            <div key={q} className={`rounded-xl border ${config.borderClass} ${config.bgClass} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                  <span className="text-xs font-semibold" style={{ color: config.color }}>{config.label}</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">{items.length}</span>
              </div>
              <p className="text-[10px] text-zinc-500 mb-2">{config.description}</p>
              <div className="space-y-1.5">
                {items.map(d => (
                  <QuadrantItem
                    key={d.id}
                    direction={d}
                    onView={() => handleViewDirection(d)}
                    onAccept={d.status === 'pending' ? () => onAcceptDirection(d.id) : undefined}
                    onReject={d.status === 'pending' ? () => onRejectDirection(d.id) : undefined}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Quadrant Item ───────────────────────────────────────────────────────────

function QuadrantItem({
  direction: d,
  onView,
  onAccept,
  onReject,
}: {
  direction: DbDirection;
  onView: () => void;
  onAccept?: () => Promise<void>;
  onReject?: () => Promise<void>;
}) {
  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
      onClick={onView}
    >
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-300 line-clamp-1">{d.summary}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-zinc-500 font-mono">E:{d.effort} I:{d.impact}</span>
          <span className="text-[10px] text-zinc-600">{d.context_name || d.context_map_title}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onAccept && (
          <button
            onClick={(e) => { e.stopPropagation(); onAccept(); }}
            className="p-1 rounded hover:bg-green-500/20 text-green-400 transition-colors"
            title="Accept"
          >
            <Check className="w-3 h-3" />
          </button>
        )}
        {onReject && (
          <button
            onClick={(e) => { e.stopPropagation(); onReject(); }}
            className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
            title="Reject"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
