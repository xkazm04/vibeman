/**
 * Outcomes Summary Panel
 * Shows recent direction implementation outcomes and statistics
 * Styled to match Reflector KPI cards
 */

'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, CheckCircle, XCircle, RotateCcw, Clock, TrendingUp } from 'lucide-react';
import { useBrainStore } from '@/stores/brainStore';
import GlowCard from './GlowCard';

interface Props {
  isLoading: boolean;
}

interface KPICardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ElementType;
  accentColor: string;
  glowColor: string;
  borderColor: string;
  delay?: number;
}

function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  accentColor,
  glowColor,
  borderColor,
  delay = 0
}: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
    >
      <GlowCard accentColor={accentColor} glowColor={glowColor} borderColorClass={borderColor} animate={false}>
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <motion.div
              className="p-2.5 rounded-xl border"
              style={{
                backgroundColor: `${accentColor}15`,
                borderColor: `${accentColor}40`,
                boxShadow: `0 0 20px ${glowColor}`
              }}
              whileHover={{ scale: 1.05 }}
            >
              <Icon className="w-5 h-5" style={{ color: accentColor }} />
            </motion.div>
          </div>

          <div className="space-y-1">
            <motion.p
              className="text-4xl font-bold font-mono tracking-tight"
              style={{ color: accentColor, textShadow: `0 0 30px ${glowColor}` }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delay + 0.1, type: 'spring', stiffness: 200 }}
            >
              {value}
            </motion.p>
            <p className="text-sm font-medium text-gray-300">{title}</p>
            {subtitle && (
              <p className="text-xs font-mono text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      </GlowCard>
    </motion.div>
  );
}

/** Compute daily success rates for the last 7 days from recent outcomes. */
function useDailyTrend(recentOutcomes: { execution_completed_at: string | null; execution_success: number | null }[]) {
  return useMemo(() => {
    const now = new Date();
    const dayMs = 86400000;
    // Build map: "YYYY-MM-DD" -> { success, total }
    const dayMap = new Map<string, { success: number; total: number }>();

    for (let d = 6; d >= 0; d--) {
      const date = new Date(now.getTime() - d * dayMs);
      const key = date.toISOString().slice(0, 10);
      dayMap.set(key, { success: 0, total: 0 });
    }

    for (const o of recentOutcomes) {
      if (!o.execution_completed_at) continue;
      const key = new Date(o.execution_completed_at).toISOString().slice(0, 10);
      const entry = dayMap.get(key);
      if (entry) {
        entry.total++;
        if (o.execution_success) entry.success++;
      }
    }

    const days = Array.from(dayMap.entries()).map(([date, { success, total }]) => ({
      date,
      rate: total > 0 ? Math.round((success / total) * 100) : null,
      total,
    }));

    const daysWithData = days.filter(d => d.rate !== null);
    return { days, daysWithData };
  }, [recentOutcomes]);
}

export default function OutcomesSummary({ isLoading }: Props) {
  const { outcomeStats, recentOutcomes } = useBrainStore();
  const { days: trendDays, daysWithData } = useDailyTrend(recentOutcomes);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-800/50 p-5 animate-pulse"
            style={{ background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(3, 7, 18, 0.95) 100%)' }}
          >
            <div className="h-10 w-10 bg-zinc-800 rounded-xl mb-4" />
            <div className="h-8 bg-zinc-800 rounded w-1/2 mb-2" />
            <div className="h-4 bg-zinc-800 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  const successRate = outcomeStats.total > 0
    ? Math.round((outcomeStats.successful / outcomeStats.total) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Tracked"
          value={outcomeStats.total}
          subtitle="IMPLEMENTATIONS"
          icon={Target}
          accentColor="#f59e0b"
          glowColor="rgba(245, 158, 11, 0.15)"
          borderColor="border-amber-500/20"
          delay={0}
        />

        <KPICard
          title="Successful"
          value={outcomeStats.successful}
          subtitle={`${successRate}% RATE`}
          icon={CheckCircle}
          accentColor="#10b981"
          glowColor="rgba(16, 185, 129, 0.15)"
          borderColor="border-emerald-500/20"
          delay={0.1}
        />

        <KPICard
          title="Failed"
          value={outcomeStats.failed}
          subtitle="NEEDS_REVIEW"
          icon={XCircle}
          accentColor="#ef4444"
          glowColor="rgba(239, 68, 68, 0.15)"
          borderColor="border-red-500/20"
          delay={0.2}
        />

        <KPICard
          title="Reverted"
          value={outcomeStats.reverted}
          subtitle="ROLLED_BACK"
          icon={RotateCcw}
          accentColor="#f97316"
          glowColor="rgba(249, 115, 22, 0.15)"
          borderColor="border-orange-500/20"
          delay={0.3}
        />

        <KPICard
          title="Pending"
          value={outcomeStats.pending}
          subtitle="AWAITING_OUTCOME"
          icon={Clock}
          accentColor="#a855f7"
          glowColor="rgba(168, 85, 247, 0.15)"
          borderColor="border-purple-500/20"
          delay={0.4}
        />
      </div>

      {/* Success Rate Bar + Recent Outcomes */}
      {outcomeStats.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="relative overflow-hidden rounded-xl border border-zinc-800/50 p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.7) 0%, rgba(3, 7, 18, 0.8) 100%)'
          }}
        >
          <div className="flex items-center gap-4">
            {/* Success Rate */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-zinc-300">Success Rate</span>
                </div>
                <span
                  className="text-lg font-bold font-mono"
                  style={{
                    color: successRate >= 80 ? '#10b981' : successRate >= 50 ? '#f59e0b' : '#ef4444',
                    textShadow: successRate >= 80 ? '0 0 20px rgba(16, 185, 129, 0.4)' : undefined
                  }}
                >
                  {successRate}%
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${successRate}%` }}
                  transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    successRate >= 80
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                      : successRate >= 50
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                      : 'bg-gradient-to-r from-red-500 to-red-400'
                  }`}
                  style={{
                    boxShadow: successRate >= 80
                      ? '0 0 20px rgba(16, 185, 129, 0.5)'
                      : successRate >= 50
                      ? '0 0 20px rgba(245, 158, 11, 0.5)'
                      : '0 0 20px rgba(239, 68, 68, 0.5)'
                  }}
                />
              </div>
            </div>

            {/* Recent Outcomes */}
            {recentOutcomes.length > 0 && (
              <div className="flex items-center gap-1 pl-4 border-l border-zinc-700/50">
                <span className="text-xs text-zinc-500 mr-2">Recent:</span>
                {recentOutcomes.slice(0, 5).map((outcome, i) => (
                  <div
                    key={outcome.id}
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: outcome.execution_success
                        ? 'rgba(16, 185, 129, 0.2)'
                        : outcome.was_reverted
                        ? 'rgba(249, 115, 22, 0.2)'
                        : 'rgba(239, 68, 68, 0.2)',
                      border: `1px solid ${outcome.execution_success
                        ? 'rgba(16, 185, 129, 0.4)'
                        : outcome.was_reverted
                        ? 'rgba(249, 115, 22, 0.4)'
                        : 'rgba(239, 68, 68, 0.4)'}`
                    }}
                    title={outcome.execution_success ? 'Success' : outcome.was_reverted ? 'Reverted' : 'Failed'}
                  >
                    {outcome.execution_success ? (
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                    ) : outcome.was_reverted ? (
                      <RotateCcw className="w-3 h-3 text-orange-400" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-400" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 7-Day Success Rate Trend */}
          {daysWithData.length >= 2 && (() => {
            const sparkW = 200;
            const sparkH = 32;
            const pad = 4;
            const cw = sparkW - pad * 2;
            const ch = sparkH - pad * 2;

            // Only render points that have data
            const dataPoints = trendDays
              .map((d, i) => ({ ...d, idx: i }))
              .filter(d => d.rate !== null);

            if (dataPoints.length < 2) return null;

            const rates = dataPoints.map(d => d.rate as number);
            const minR = Math.min(...rates);
            const maxR = Math.max(...rates);
            const range = maxR - minR || 1;

            const pts = dataPoints.map((d, i) => ({
              x: pad + (i / (dataPoints.length - 1)) * cw,
              y: pad + ch - ((d.rate as number) - minR) / range * ch,
              rate: d.rate as number,
              date: d.date,
            }));

            const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
            const areaD = lineD
              + ` L ${pts[pts.length - 1].x.toFixed(1)} ${(pad + ch).toFixed(1)}`
              + ` L ${pts[0].x.toFixed(1)} ${(pad + ch).toFixed(1)} Z`;

            // Trend direction: compare first vs last
            const firstRate = pts[0].rate;
            const lastRate = pts[pts.length - 1].rate;
            const isImproving = lastRate >= firstRate;
            const trendColor = isImproving ? '#10b981' : '#f59e0b'; // emerald vs amber

            return (
              <div className="mt-3 pt-3 border-t border-zinc-800/50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-zinc-500 font-mono">7_DAY_TREND</span>
                  <span className="text-xs font-mono" style={{ color: trendColor }}>
                    {isImproving ? 'IMPROVING' : 'DECLINING'}
                  </span>
                </div>
                <svg width={sparkW} height={sparkH} className="w-full">
                  <defs>
                    <linearGradient id="outcomeTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={trendColor} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <path d={areaD} fill="url(#outcomeTrendGrad)" />
                  <path
                    d={lineD}
                    fill="none"
                    stroke={trendColor}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {pts.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={2}
                      fill={trendColor}
                    />
                  ))}
                </svg>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-zinc-600 font-mono">{trendDays[0]?.date.slice(5)}</span>
                  <span className="text-[10px] text-zinc-600 font-mono">{trendDays[trendDays.length - 1]?.date.slice(5)}</span>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* Empty State */}
      {outcomeStats.total === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center py-4"
        >
          <p className="text-zinc-500 text-sm">
            No implementation outcomes tracked yet. Outcomes will appear here after directions are executed.
          </p>
        </motion.div>
      )}
    </div>
  );
}
