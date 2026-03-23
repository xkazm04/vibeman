/**
 * Outcomes Summary Panel
 * Shows recent direction implementation outcomes and statistics
 * Styled to match Reflector KPI cards
 */

'use client';

import { useId, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { duration, easing } from '@/lib/motion';
import { Target, CheckCircle, XCircle, RotateCcw, Clock, TrendingUp } from 'lucide-react';
import { useBrainStore } from '@/stores/brainStore';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import { subscribeToReflectionCompletion } from '@/stores/reflectionCompletionEmitter';
import GlowCard from './GlowCard';
import NeuralSkeleton from './NeuralSkeleton';
import BrainEmptyState from './BrainEmptyState';
import OutcomesEmptySvg from './OutcomesEmptySvg';
import { BRAIN_CHART } from '../lib/brainChartColors';

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
      transition={{ delay, duration: duration.slow, ease: easing.entrance }}
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
              className="text-4xl font-bold font-mono tracking-tight tabular-nums"
              style={{ color: accentColor, textShadow: `0 0 30px ${glowColor}` }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delay + 0.1, type: 'spring', stiffness: 200 }}
            >
              {value}
            </motion.p>
            <p className="text-sm font-medium text-zinc-300">{title}</p>
            {subtitle && (
              <p className="text-xs font-mono text-zinc-500 mt-1">{subtitle}</p>
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
  const trendGradientId = `outcomeTrendGrad-${useId()}`;
  const { outcomeStats, recentOutcomes, fetchRecentOutcomes } = useBrainStore();
  const activeProject = useClientProjectStore(state => state.activeProject);
  const { days: trendDays, daysWithData } = useDailyTrend(recentOutcomes);

  // Subscribe to reflection completion events for auto-refresh
  useEffect(() => {
    const unsubscribe = subscribeToReflectionCompletion((reflectionId, projectId) => {
      // Refresh outcomes when a reflection completes for this project
      if (projectId === activeProject?.id) {
        fetchRecentOutcomes(projectId);
      }
    });

    return unsubscribe;
  }, [activeProject?.id, fetchRecentOutcomes]);

  if (isLoading) {
    const skeletonColors = [BRAIN_CHART.outcome.total.color, BRAIN_CHART.outcome.success.color, BRAIN_CHART.outcome.failed.color, BRAIN_CHART.outcome.pending.color];
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {skeletonColors.map((color, i) => (
          <div key={i} className="border border-zinc-800/70 rounded-sm p-5">
            <NeuralSkeleton accentColor={color} lines={2} />
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard
          title="Total Tracked"
          value={outcomeStats.total}
          subtitle="IMPLEMENTATIONS"
          icon={Target}
          accentColor={BRAIN_CHART.outcome.total.color}
          glowColor={BRAIN_CHART.outcome.total.glow}
          borderColor={BRAIN_CHART.outcome.total.border}
          delay={0}
        />

        <KPICard
          title="Successful"
          value={outcomeStats.successful}
          subtitle={`${successRate}% RATE`}
          icon={CheckCircle}
          accentColor={BRAIN_CHART.outcome.success.color}
          glowColor={BRAIN_CHART.outcome.success.glow}
          borderColor={BRAIN_CHART.outcome.success.border}
          delay={0.1}
        />

        <KPICard
          title="Failed"
          value={outcomeStats.failed}
          subtitle="NEEDS_REVIEW"
          icon={XCircle}
          accentColor={BRAIN_CHART.outcome.failed.color}
          glowColor={BRAIN_CHART.outcome.failed.glow}
          borderColor={BRAIN_CHART.outcome.failed.border}
          delay={0.2}
        />

        <KPICard
          title="Reverted"
          value={outcomeStats.reverted}
          subtitle="ROLLED_BACK"
          icon={RotateCcw}
          accentColor={BRAIN_CHART.outcome.reverted.color}
          glowColor={BRAIN_CHART.outcome.reverted.glow}
          borderColor={BRAIN_CHART.outcome.reverted.border}
          delay={0.3}
        />

        <KPICard
          title="Pending"
          value={outcomeStats.pending}
          subtitle="AWAITING_OUTCOME"
          icon={Clock}
          accentColor={BRAIN_CHART.outcome.pending.color}
          glowColor={BRAIN_CHART.outcome.pending.glow}
          borderColor={BRAIN_CHART.outcome.pending.border}
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
                  className="text-lg font-bold font-mono tabular-nums"
                  style={{
                    color: successRate >= 80 ? BRAIN_CHART.positive : successRate >= 50 ? BRAIN_CHART.warning : BRAIN_CHART.negative,
                    textShadow: successRate >= 80 ? `0 0 20px ${BRAIN_CHART.outcome.success.glow}` : undefined
                  }}
                >
                  {successRate}%
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${successRate}%` }}
                  transition={{ delay: 0.6, duration: duration.dramatic, ease: easing.entrance }}
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
                        ? `${BRAIN_CHART.outcome.success.color}33`
                        : outcome.was_reverted
                        ? `${BRAIN_CHART.outcome.reverted.color}33`
                        : `${BRAIN_CHART.outcome.failed.color}33`,
                      border: `1px solid ${outcome.execution_success
                        ? `${BRAIN_CHART.outcome.success.color}66`
                        : outcome.was_reverted
                        ? `${BRAIN_CHART.outcome.reverted.color}66`
                        : `${BRAIN_CHART.outcome.failed.color}66`}`
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
            const trendColor = isImproving ? BRAIN_CHART.trend.improving : BRAIN_CHART.trend.declining;

            return (
              <div className="mt-3 pt-3 border-t border-zinc-800/50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-zinc-500 font-mono tabular-nums">7_DAY_TREND</span>
                  <span className="text-xs font-mono tabular-nums" style={{ color: trendColor }}>
                    {isImproving ? 'IMPROVING' : 'DECLINING'}
                  </span>
                </div>
                <svg width={sparkW} height={sparkH} className="w-full">
                  <defs>
                    <linearGradient id={trendGradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={trendColor} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <path d={areaD} fill={`url(#${trendGradientId})`} />
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
                  <span className="text-2xs text-zinc-600 font-mono tabular-nums">{trendDays[0]?.date.slice(5)}</span>
                  <span className="text-2xs text-zinc-600 font-mono tabular-nums">{trendDays[trendDays.length - 1]?.date.slice(5)}</span>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}

      {/* Empty State */}
      {outcomeStats.total === 0 && (
        <div className="py-6 flex justify-center">
          <BrainEmptyState
            icon={<OutcomesEmptySvg />}
            title="No outcomes tracked yet"
            description="Outcomes will appear here after directions are executed."
          />
        </div>
      )}
    </div>
  );
}
