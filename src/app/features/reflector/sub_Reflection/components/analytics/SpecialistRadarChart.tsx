'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip
} from 'recharts';
import { Trophy, TrendingUp, TrendingDown, ArrowRight, Star, Zap } from 'lucide-react';
import type { SpecialistRanking } from '../../lib/RuleBasedInsightTypes';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TREND_COLORS: Record<string, string> = {
  improving: 'text-emerald-400',
  declining: 'text-red-400',
  stable: 'text-gray-400',
};

const TIER_CONFIG = {
  elite:      { label: 'Elite',      color: 'text-amber-300',   bg: 'bg-amber-400/15',  border: 'border-amber-400/40',  bar: 'bg-amber-400' },
  strong:     { label: 'Strong',     color: 'text-cyan-300',    bg: 'bg-cyan-400/15',   border: 'border-cyan-400/40',   bar: 'bg-cyan-400' },
  average:    { label: 'Average',    color: 'text-gray-300',    bg: 'bg-gray-400/15',   border: 'border-gray-500/40',   bar: 'bg-gray-400' },
  developing: { label: 'Developing', color: 'text-orange-300',  bg: 'bg-orange-400/15', border: 'border-orange-400/40', bar: 'bg-orange-400' },
} as const;

type TierKey = keyof typeof TIER_CONFIG;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Friendly short labels for scan types
function shortLabel(scanType: string): string {
  const labels: Record<string, string> = {
    zen_architect: 'Architect',
    bug_hunter: 'Bug Hunter',
    perf_optimizer: 'Perf',
    security_protector: 'Security',
    insight_synth: 'Insights',
    ambiguity_guardian: 'Clarity',
    business_visionary: 'Business',
    ui_perfectionist: 'UI/UX',
    feature_scout: 'Features',
    onboarding_optimizer: 'Onboard',
    ai_integration_scout: 'AI Scout',
    delight_designer: 'Delight',
    code_refactor: 'Refactor',
    user_empathy_champion: 'Empathy',
    competitor_analyst: 'Compete',
    paradigm_shifter: 'Paradigm',
    moonshot_architect: 'Moonshot',
    dev_experience_engineer: 'DevExp',
    data_flow_optimizer: 'DataFlow',
    pragmatic_integrator: 'Integrator',
  };
  return labels[scanType] || scanType.replace(/_/g, ' ').slice(0, 10);
}

function getTier(acceptanceRatio: number): TierKey {
  if (acceptanceRatio > 0.7) return 'elite';
  if (acceptanceRatio > 0.5) return 'strong';
  if (acceptanceRatio > 0.3) return 'average';
  return 'developing';
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'improving') return <TrendingUp className="w-3 h-3 text-emerald-400" />;
  if (trend === 'declining') return <TrendingDown className="w-3 h-3 text-red-400" />;
  return <ArrowRight className="w-3 h-3 text-gray-400" />;
}

// ---------------------------------------------------------------------------
// AnimatedNumber -- counts up from 0 to target value
// ---------------------------------------------------------------------------

function AnimatedNumber({
  value,
  suffix = '',
  decimals = 0,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    const duration = 600;

    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * value);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return (
    <>
      {display.toFixed(decimals)}
      {suffix}
    </>
  );
}

// ---------------------------------------------------------------------------
// PerformanceTierBadge
// ---------------------------------------------------------------------------

function PerformanceTierBadge({ tier }: { tier: TierKey }) {
  const cfg = TIER_CONFIG[tier];
  const icons: Record<TierKey, React.ReactNode> = {
    elite: <Trophy className="w-3 h-3" />,
    strong: <Star className="w-3 h-3" />,
    average: <ArrowRight className="w-3 h-3" />,
    developing: <Zap className="w-3 h-3" />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}
    >
      {icons[tier]} {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// MiniPerformanceBar -- acceptance vs the average across all specialists
// ---------------------------------------------------------------------------

function MiniPerformanceBar({
  value,
  average,
}: {
  value: number;
  average: number;
}) {
  const pct = Math.round(value * 100);
  const avgPct = Math.round(average * 100);

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[9px] text-gray-500 mb-1">
        <span>Acceptance vs Avg</span>
        <span>
          {pct}% / {avgPct}%
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-gray-800 overflow-hidden">
        {/* Average marker line */}
        <div
          className="absolute top-0 bottom-0 w-px bg-gray-400 z-10"
          style={{ left: `${Math.min(avgPct, 100)}%` }}
        />
        {/* Value bar */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(pct, 100)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${pct >= avgPct ? 'bg-cyan-500' : 'bg-orange-400'}`}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SpecialistDetailPanel -- expanded detail for single selection
// ---------------------------------------------------------------------------

function SpecialistDetailPanel({
  ranking,
  averageAcceptance,
}: {
  ranking: SpecialistRanking;
  averageAcceptance: number;
}) {
  const tier = getTier(ranking.acceptanceRatio);
  const accPct = Math.round(ranking.acceptanceRatio * 100);
  const scorePct = Math.round(ranking.score * 100);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <div className="border-t border-gray-700/30 p-3 mt-1 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white">
            {shortLabel(ranking.scanType)}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] flex items-center gap-1 ${TREND_COLORS[ranking.trend]}`}
            >
              <TrendIcon trend={ranking.trend} /> {ranking.trend}
            </span>
            <PerformanceTierBadge tier={tier} />
          </div>
        </div>

        {/* Metric cards with animated counters */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-gray-800/60 border border-gray-700/40 p-2 text-center">
            <p className="text-sm font-bold text-cyan-400">
              <AnimatedNumber value={accPct} suffix="%" />
            </p>
            <p className="text-[9px] text-gray-500 mt-0.5">Accept Rate</p>
          </div>
          <div className="rounded-lg bg-gray-800/60 border border-gray-700/40 p-2 text-center">
            <p className="text-sm font-bold text-purple-400">
              <AnimatedNumber value={ranking.totalIdeas} />
            </p>
            <p className="text-[9px] text-gray-500 mt-0.5">Total Ideas</p>
          </div>
          <div className="rounded-lg bg-gray-800/60 border border-gray-700/40 p-2 text-center">
            <p className="text-sm font-bold text-emerald-400">
              <AnimatedNumber value={scorePct} />
            </p>
            <p className="text-[9px] text-gray-500 mt-0.5">Score</p>
          </div>
        </div>

        {/* Performance bar: this specialist vs average */}
        <MiniPerformanceBar
          value={ranking.acceptanceRatio}
          average={averageAcceptance}
        />

        {/* Recommendation */}
        <p className="text-[10px] text-gray-400 leading-relaxed italic">
          &ldquo;{ranking.recommendation}&rdquo;
        </p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ComparisonPanel -- side-by-side when 2 specialists are selected
// ---------------------------------------------------------------------------

function ComparisonPanel({
  a,
  b,
}: {
  a: SpecialistRanking;
  b: SpecialistRanking;
}) {
  const metrics: {
    label: string;
    key: string;
    extract: (r: SpecialistRanking) => number;
    fmt: (n: number) => string;
    color: string;
  }[] = [
    {
      label: 'Acceptance',
      key: 'acc',
      extract: (r) => r.acceptanceRatio * 100,
      fmt: (n) => `${Math.round(n)}%`,
      color: 'text-cyan-400',
    },
    {
      label: 'Ideas',
      key: 'ideas',
      extract: (r) => r.totalIdeas,
      fmt: (n) => `${Math.round(n)}`,
      color: 'text-purple-400',
    },
    {
      label: 'Score',
      key: 'score',
      extract: (r) => r.score * 100,
      fmt: (n) => `${Math.round(n)}`,
      color: 'text-emerald-400',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <div className="border-t border-gray-700/30 p-3 mt-1">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 text-center">
          Comparison
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 mb-2">
          <div className="text-center">
            <span className="text-xs font-semibold text-white">
              {shortLabel(a.scanType)}
            </span>
            <div className="mt-0.5">
              <PerformanceTierBadge tier={getTier(a.acceptanceRatio)} />
            </div>
          </div>
          <div className="flex items-center text-gray-600 text-[10px] font-mono">
            vs
          </div>
          <div className="text-center">
            <span className="text-xs font-semibold text-white">
              {shortLabel(b.scanType)}
            </span>
            <div className="mt-0.5">
              <PerformanceTierBadge tier={getTier(b.acceptanceRatio)} />
            </div>
          </div>
        </div>

        {/* Metric rows with delta */}
        {metrics.map((m) => {
          const va = m.extract(a);
          const vb = m.extract(b);
          const delta = va - vb;
          const winner = delta > 0 ? 'a' : delta < 0 ? 'b' : 'tie';
          return (
            <div
              key={m.key}
              className="grid grid-cols-[1fr_auto_1fr] gap-2 py-1.5 border-t border-gray-800/60"
            >
              <div
                className={`text-center text-sm font-mono font-bold ${
                  winner === 'a' ? m.color : 'text-gray-500'
                }`}
              >
                {m.fmt(va)}
              </div>
              <div className="flex flex-col items-center justify-center">
                <span className="text-[9px] text-gray-600">{m.label}</span>
                {delta !== 0 && (
                  <span
                    className={`text-[9px] font-mono ${
                      delta > 0 ? 'text-emerald-500' : 'text-red-400'
                    }`}
                  >
                    {delta > 0 ? '+' : ''}
                    {m.fmt(Math.abs(delta))}
                  </span>
                )}
              </div>
              <div
                className={`text-center text-sm font-mono font-bold ${
                  winner === 'b' ? m.color : 'text-gray-500'
                }`}
              >
                {m.fmt(vb)}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface SpecialistRadarChartProps {
  rankings: SpecialistRanking[];
  onSelectSpecialist?: (ranking: SpecialistRanking | null) => void;
  className?: string;
}

export default function SpecialistRadarChart({
  rankings,
  onSelectSpecialist,
  className = '',
}: SpecialistRadarChartProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);

  // Average acceptance across all specialists
  const averageAcceptance = useMemo(() => {
    if (rankings.length === 0) return 0;
    return (
      rankings.reduce((sum, r) => sum + r.acceptanceRatio, 0) / rankings.length
    );
  }, [rankings]);

  // Max acceptance for relative bar scaling in the list
  const maxAcceptance = useMemo(() => {
    return Math.max(...rankings.map((r) => r.acceptanceRatio), 0.01);
  }, [rankings]);

  // Best ROI: highest acceptance among specialists with above-median volume
  const bestRoi = useMemo(() => {
    if (rankings.length < 2) return rankings[0] ?? null;
    const sorted = [...rankings].sort((a, b) => a.totalIdeas - b.totalIdeas);
    const medianVolume = sorted[Math.floor(sorted.length / 2)].totalIdeas;
    const decentVolume = rankings.filter((r) => r.totalIdeas >= medianVolume);
    if (decentVolume.length === 0) return rankings[0];
    return decentVolume.reduce(
      (best, r) => (r.acceptanceRatio > best.acceptanceRatio ? r : best),
      decentVolume[0]
    );
  }, [rankings]);

  // Radar chart data: acceptance (0-100), volume normalized (0-100), score (0-100)
  const radarData = useMemo(() => {
    const maxIdeas = Math.max(...rankings.map((r) => r.totalIdeas), 1);
    return rankings.map((r) => ({
      subject: shortLabel(r.scanType),
      scanType: r.scanType,
      acceptance: Math.round(r.acceptanceRatio * 100),
      volume: Math.round((r.totalIdeas / maxIdeas) * 100),
      score: Math.round(r.score * 100),
    }));
  }, [rankings]);

  // Selection handler -- supports Shift+click and compare toggle
  const handleClick = useCallback(
    (scanType: string, e: React.MouseEvent) => {
      const isShift = e.shiftKey || compareMode;

      setSelected((prev) => {
        let next: string[];

        if (isShift) {
          // Multi-select: toggle, max 2
          if (prev.includes(scanType)) {
            next = prev.filter((s) => s !== scanType);
          } else {
            next =
              prev.length >= 2 ? [prev[1], scanType] : [...prev, scanType];
          }
        } else {
          // Single select: toggle on/off
          next =
            prev.length === 1 && prev[0] === scanType ? [] : [scanType];
        }

        // Notify parent with first selected or null
        const first =
          next.length > 0
            ? rankings.find((r) => r.scanType === next[0]) ?? null
            : null;
        onSelectSpecialist?.(first);

        return next;
      });
    },
    [compareMode, rankings, onSelectSpecialist]
  );

  if (rankings.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-full text-gray-500 text-sm ${className}`}
      >
        No specialist data available
      </div>
    );
  }

  const selectedRankings = selected
    .map((s) => rankings.find((r) => r.scanType === s))
    .filter(Boolean) as SpecialistRanking[];

  return (
    <div className={`relative flex flex-col h-full ${className}`}>
      {/* Radar Chart */}
      <div className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="rgba(107,114,128,0.2)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: '#9ca3af', fontSize: 9, fontFamily: 'monospace' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#6b7280', fontSize: 8 }}
              axisLine={false}
            />
            <Radar
              name="Acceptance %"
              dataKey="acceptance"
              stroke="#06b6d4"
              fill="#06b6d4"
              fillOpacity={0.15}
              strokeWidth={1.5}
            />
            <Radar
              name="Volume"
              dataKey="volume"
              stroke="#a855f7"
              fill="#a855f7"
              fillOpacity={0.1}
              strokeWidth={1.5}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.08}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(17,24,39,0.95)',
                border: '1px solid rgba(107,114,128,0.3)',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'monospace',
              }}
              labelStyle={{ color: '#e5e7eb', fontWeight: 600 }}
              itemStyle={{ color: '#9ca3af' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend + compare toggle */}
      <div className="flex items-center justify-between px-2 py-1">
        <div className="flex items-center gap-4 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-cyan-500 inline-block" />{' '}
            Acceptance
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-purple-500 inline-block" /> Volume
          </span>
          <span className="flex items-center gap-1">
            <span
              className="w-3 inline-block"
              style={{ borderTop: '1px dashed #10b981', height: 0 }}
            />{' '}
            Score
          </span>
        </div>
        <button
          onClick={() => {
            setCompareMode((prev) => !prev);
            if (compareMode) setSelected((s) => s.slice(0, 1));
          }}
          className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${
            compareMode
              ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
              : 'border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500'
          }`}
        >
          Compare
        </button>
      </div>

      {/* Specialist list with tier coloring and mini inline bars */}
      <div className="border-t border-gray-700/30 pt-2 mt-1 max-h-[180px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        <div className="grid grid-cols-2 gap-1 px-1">
          {rankings.map((r) => {
            const tier = getTier(r.acceptanceRatio);
            const cfg = TIER_CONFIG[tier];
            const isSelected = selected.includes(r.scanType);
            const barWidth = Math.round(
              (r.acceptanceRatio / maxAcceptance) * 100
            );

            return (
              <button
                key={r.scanType}
                onClick={(e) => handleClick(r.scanType, e)}
                className={`flex flex-col gap-1 px-2 py-1.5 rounded text-left transition-all text-[10px] ${
                  isSelected
                    ? 'bg-cyan-500/10 border border-cyan-500/30'
                    : 'hover:bg-gray-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="font-mono text-gray-300 w-4 text-right shrink-0">
                    #{r.rank}
                  </span>
                  <span className={`truncate flex-1 ${cfg.color}`}>
                    {shortLabel(r.scanType)}
                  </span>
                  <TrendIcon trend={r.trend} />
                  <span className="text-gray-500 font-mono shrink-0">
                    {Math.round(r.acceptanceRatio * 100)}%
                  </span>
                </div>
                {/* Mini inline sparkline bar relative to max */}
                <div className="w-full h-1 rounded-full bg-gray-800 overflow-hidden ml-6">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${cfg.bar}`}
                    style={{ width: `${barWidth}%`, opacity: 0.7 }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail / Comparison panel */}
      <AnimatePresence mode="wait">
        {selectedRankings.length === 2 ? (
          <ComparisonPanel
            key="compare"
            a={selectedRankings[0]}
            b={selectedRankings[1]}
          />
        ) : selectedRankings.length === 1 ? (
          <SpecialistDetailPanel
            key="detail"
            ranking={selectedRankings[0]}
            averageAcceptance={averageAcceptance}
          />
        ) : null}
      </AnimatePresence>

      {/* Best ROI hint */}
      {bestRoi && (
        <div className="border-t border-gray-700/30 px-3 py-2 mt-1">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <Zap className="w-3 h-3 text-amber-400 shrink-0" />
            <span>
              <span className="text-amber-300 font-medium">Best ROI:</span>{' '}
              <span className="text-gray-300">
                {shortLabel(bestRoi.scanType)}
              </span>{' '}
              <span className="text-gray-600">
                ({Math.round(bestRoi.acceptanceRatio * 100)}% acceptance,{' '}
                {bestRoi.totalIdeas} ideas)
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
