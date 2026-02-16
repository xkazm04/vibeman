'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, Zap } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import InsightEffectivenessScore from './InsightEffectivenessScore';
import GlowCard from './GlowCard';
import type { InsightEffectiveness } from '@/app/api/brain/insights/effectiveness/route';
import type { EffectivenessSummary } from '@/app/api/brain/insights/effectiveness/route';

interface Props {
  scope?: 'project' | 'global';
}

export default function BrainEffectivenessWidget({ scope = 'project' }: Props) {
  const [insights, setInsights] = useState<InsightEffectiveness[]>([]);
  const [summary, setSummary] = useState<EffectivenessSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const activeProject = useActiveProjectStore((state) => state.activeProject);

  const fetchEffectiveness = useCallback(async () => {
    if (!activeProject?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/brain/insights/effectiveness?projectId=${activeProject.id}`
      );
      const data = await res.json();

      if (data.success) {
        setInsights(data.insights);
        setSummary(data.summary);
      } else {
        setError(data.error || 'Failed to compute effectiveness');
      }
    } catch {
      setError('Failed to fetch effectiveness data');
    } finally {
      setIsLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    fetchEffectiveness();
  }, [fetchEffectiveness]);

  // Determine accent color based on verdict
  const getVerdictConfig = (overallScore: number) => {
    if (overallScore > 10) {
      return {
        verdict: 'helpful',
        accentColor: '#10b981',
        glowColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'border-emerald-500/20',
        Icon: TrendingUp,
      };
    } else if (overallScore < -10) {
      return {
        verdict: 'misleading',
        accentColor: '#ef4444',
        glowColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'border-red-500/20',
        Icon: TrendingDown,
      };
    }
    return {
      verdict: 'neutral',
      accentColor: '#a855f7',
      glowColor: 'rgba(168, 85, 247, 0.15)',
      borderColor: 'border-purple-500/20',
      Icon: Minus,
    };
  };

  if (isLoading) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border border-purple-500/20 p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(3, 7, 18, 0.95) 100%)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-zinc-200">Brain Effectiveness</h2>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-zinc-800 rounded w-2/3" />
          <div className="h-10 bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border border-red-500/20 p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(3, 7, 18, 0.95) 100%)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-zinc-200">Brain Effectiveness</h2>
        </div>
        <div className="text-sm text-red-400">{error}</div>
      </div>
    );
  }

  if (!summary || insights.length === 0) {
    return (
      <div
        className="relative overflow-hidden rounded-2xl border border-purple-500/20 p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(3, 7, 18, 0.95) 100%)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-zinc-200">Brain Effectiveness</h2>
        </div>
        <div className="text-sm text-zinc-500">
          Not enough data yet. Generate directions and reflections to see effectiveness scores.
        </div>
      </div>
    );
  }

  const config = getVerdictConfig(summary.overallScore);
  const { accentColor, glowColor, borderColor, Icon: VerdictIcon } = config;

  // Sort insights: misleading first, then by absolute score descending
  const sortedInsights = [...insights].sort((a, b) => {
    if (a.verdict === 'misleading' && b.verdict !== 'misleading') return -1;
    if (b.verdict === 'misleading' && a.verdict !== 'misleading') return 1;
    return Math.abs(b.score) - Math.abs(a.score);
  });

  const misleadingInsights = insights.filter(i => i.verdict === 'misleading' && i.reliable);

  return (
    <GlowCard accentColor={accentColor} glowColor={glowColor} borderColorClass={borderColor}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <motion.div
              className="p-2 rounded-xl border"
              style={{
                backgroundColor: `${accentColor}15`,
                borderColor: `${accentColor}40`,
                boxShadow: `0 0 20px ${glowColor}`
              }}
              whileHover={{ scale: 1.05 }}
            >
              <Brain className="w-5 h-5" style={{ color: accentColor }} />
            </motion.div>
            <h2 className="text-lg font-semibold text-zinc-200">Brain Effectiveness</h2>
          </div>
          {scope === 'global' && (
            <span className="px-2 py-0.5 bg-zinc-700/50 text-zinc-400 rounded text-xs font-mono">GLOBAL</span>
          )}
        </div>

        {/* Overall Score Card */}
        <div
          className="rounded-xl p-4 mb-4"
          style={{
            background: `linear-gradient(135deg, ${accentColor}08 0%, ${accentColor}03 100%)`,
            border: `1px solid ${accentColor}25`
          }}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <VerdictIcon className="w-6 h-6" style={{ color: accentColor }} />
              <div>
                <motion.div
                  className="text-3xl font-bold font-mono"
                  style={{ color: accentColor, textShadow: `0 0 30px ${glowColor}` }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                >
                  {summary.overallScore > 0 ? '+' : ''}{summary.overallScore}%
                </motion.div>
                <div className="text-xs text-zinc-500 font-mono">OVERALL_IMPROVEMENT</div>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-3 gap-3 text-center border-l border-zinc-700/50 pl-4">
              <div>
                <div className="text-lg font-bold font-mono text-emerald-400">{summary.helpfulCount}</div>
                <div className="text-xs text-zinc-500">Helpful</div>
              </div>
              <div>
                <div className="text-lg font-bold font-mono text-zinc-400">{summary.neutralCount}</div>
                <div className="text-xs text-zinc-500">Neutral</div>
              </div>
              <div>
                <div className="text-lg font-bold font-mono text-red-400">{summary.misleadingCount}</div>
                <div className="text-xs text-zinc-500">Misleading</div>
              </div>
            </div>

            <div className="text-right pl-4 border-l border-zinc-700/50">
              <div className="text-lg font-bold font-mono text-cyan-400">
                {Math.round(summary.baselineAcceptanceRate * 100)}%
              </div>
              <div className="text-xs text-zinc-500">Baseline Rate</div>
            </div>
          </div>
        </div>

        {/* Misleading insights warning */}
        {misleadingInsights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 mb-4 p-3 rounded-lg"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}
          >
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-300">
              <span>{misleadingInsights.length} insight{misleadingInsights.length > 1 ? 's' : ''} {misleadingInsights.length > 1 ? 'are' : 'is'} misleading — direction acceptance dropped after {misleadingInsights.length > 1 ? 'they were' : 'it was'} learned.</span>
              <span className="flex items-center gap-1 mt-1 text-amber-400/80">
                <Zap className="w-3 h-3" />
                Confidence auto-demoted on next reflection.
              </span>
            </div>
          </motion.div>
        )}

        {/* Toggle details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-mono"
        >
          {showDetails ? '[-] HIDE' : '[+] SHOW'} per-insight scores ({insights.length})
        </button>

        {/* Per-insight detail list */}
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 space-y-2 max-h-[300px] overflow-y-auto"
          >
            {sortedInsights.map((insight, idx) => (
              <div
                key={`${insight.reflectionId}-${idx}`}
                className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-300 truncate">{insight.insightTitle}</div>
                  <div className="text-xs text-zinc-600 font-mono">
                    {insight.insightType} · {insight.confidence}% confidence
                  </div>
                </div>
                <InsightEffectivenessScore effectiveness={insight} compact />
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </GlowCard>
  );
}
