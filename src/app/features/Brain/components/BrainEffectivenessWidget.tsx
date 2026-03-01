'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, Zap, ChevronDown, ChevronRight, Lightbulb, FlaskConical } from 'lucide-react';
import BrainPanelHeader from './BrainPanelHeader';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import InsightEffectivenessScore from './InsightEffectivenessScore';
import GlowCard from './GlowCard';
import type { InsightEffectiveness } from '@/app/api/brain/insights/effectiveness/route';
import type { EffectivenessSummary } from '@/app/api/brain/insights/effectiveness/route';
import type { CausalValidationReport } from '@/lib/brain/insightCausalValidator';

interface Props {
  scope?: 'project' | 'global';
}

export default function BrainEffectivenessWidget({ scope = 'project' }: Props) {
  const [insights, setInsights] = useState<InsightEffectiveness[]>([]);
  const [summary, setSummary] = useState<EffectivenessSummary | null>(null);
  const [causal, setCausal] = useState<CausalValidationReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCausal, setShowCausal] = useState(false);

  const activeProject = useActiveProjectStore((state) => state.activeProject);

  const fetchEffectiveness = useCallback(async () => {
    if (!activeProject?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const [proxyRes, causalRes] = await Promise.all([
        fetch(`/api/brain/insights/effectiveness?projectId=${activeProject.id}`),
        fetch(`/api/brain/insights/influence?projectId=${activeProject.id}`).catch(() => null),
      ]);

      const proxyData = await proxyRes.json();

      if (proxyData.success) {
        setInsights(proxyData.insights);
        setSummary(proxyData.summary);
      } else {
        setError(proxyData.error || 'Failed to compute effectiveness');
      }

      if (causalRes) {
        const causalData = await causalRes.json();
        if (causalData.success) {
          setCausal(causalData as CausalValidationReport);
        }
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
        <BrainPanelHeader icon={Brain} title="Brain Effectiveness" accentColor="#a855f7" glowColor="rgba(168, 85, 247, 0.15)" />
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
        <BrainPanelHeader icon={Brain} title="Brain Effectiveness" accentColor="#a855f7" glowColor="rgba(168, 85, 247, 0.15)" />
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
        <BrainPanelHeader icon={Brain} title="Brain Effectiveness" accentColor="#a855f7" glowColor="rgba(168, 85, 247, 0.15)" />
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
  const hasCausalData = causal && causal.totalInfluenceEvents > 0;

  return (
    <GlowCard accentColor={accentColor} glowColor={glowColor} borderColorClass={borderColor}>
      <div className="p-6">
        {/* Header */}
        <BrainPanelHeader
          icon={Brain}
          title="Brain Effectiveness"
          accentColor={accentColor}
          glowColor={glowColor}
          glow
          right={scope === 'global' ? (
            <span className="px-2 py-0.5 bg-zinc-700/50 text-zinc-400 rounded text-xs font-mono">GLOBAL</span>
          ) : undefined}
        />

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
                <div className="text-xs text-zinc-500 font-mono">PROXY_SCORE</div>
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

        {/* Causal Validation Comparison */}
        {hasCausalData && (
          <div
            className="rounded-xl p-3 mb-4"
            style={{
              background: 'rgba(14, 165, 233, 0.05)',
              border: '1px solid rgba(14, 165, 233, 0.15)'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-xs font-medium text-sky-400 font-mono">CAUSAL_VALIDATION</span>
              <span className="text-xs text-zinc-600 ml-auto">{causal.totalInfluenceEvents} events</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg font-bold font-mono" style={{ color: causal.overallCausalScore > 10 ? '#10b981' : causal.overallCausalScore < -10 ? '#ef4444' : '#a855f7' }}>
                  {causal.overallCausalScore > 0 ? '+' : ''}{causal.overallCausalScore}%
                </div>
                <div className="text-xs text-zinc-500">Causal Score</div>
              </div>
              <div>
                <div className="text-lg font-bold font-mono text-sky-400">
                  {Math.round(causal.influencedAcceptanceRate * 100)}%
                </div>
                <div className="text-xs text-zinc-500">Influenced</div>
              </div>
              <div>
                <div className="text-lg font-bold font-mono text-zinc-400">
                  {Math.round(causal.baselineAcceptanceRate * 100)}%
                </div>
                <div className="text-xs text-zinc-500">Control</div>
              </div>
            </div>
            {causal.reliableCount > 0 && (
              <div className="flex gap-3 mt-2 pt-2 border-t border-sky-500/10 text-xs text-zinc-500">
                <span className="text-emerald-400">{causal.helpfulCount} helpful</span>
                <span>{causal.neutralCount} neutral</span>
                <span className="text-red-400">{causal.misleadingCount} misleading</span>
                <span className="ml-auto text-zinc-600">{causal.reliableCount} reliable</span>
              </div>
            )}
          </div>
        )}

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

        {/* Toggle proxy details */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          aria-label={showDetails ? 'Hide per-insight scores' : 'Show per-insight scores'}
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500/50 rounded outline-none px-1.5 py-1 -ml-1.5 hover:bg-zinc-800/30"
        >
          {showDetails ? (
            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 transition-transform" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 transition-transform" />
          )}
          <Lightbulb className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Per-insight scores ({insights.length})</span>
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

        {/* Toggle causal details */}
        {hasCausalData && causal.insights.length > 0 && (
          <>
            <button
              onClick={() => setShowCausal(!showCausal)}
              aria-label={showCausal ? 'Hide causal scores' : 'Show causal scores'}
              className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors focus-visible:ring-2 focus-visible:ring-sky-500/50 rounded outline-none px-1.5 py-1 -ml-1.5 hover:bg-zinc-800/30 mt-1"
            >
              {showCausal ? (
                <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 transition-transform" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 transition-transform" />
              )}
              <FlaskConical className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Causal per-insight ({causal.insights.length})</span>
            </button>

            {showCausal && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 space-y-2 max-h-[300px] overflow-y-auto"
              >
                {causal.insights
                  .sort((a, b) => Math.abs(b.causalScore) - Math.abs(a.causalScore))
                  .map((ci) => (
                    <div
                      key={ci.insightId}
                      className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-zinc-300 truncate">{ci.insightTitle}</div>
                        <div className="text-xs text-zinc-600 font-mono">
                          {ci.influencedTotal} influenced · {ci.baselineTotal} baseline
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border ${
                          ci.causalVerdict === 'helpful'
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : ci.causalVerdict === 'misleading'
                            ? 'bg-red-500/10 border-red-500/20 text-red-400'
                            : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
                        }`}
                        title={ci.reliable
                          ? `Causal: ${ci.causalScore > 0 ? '+' : ''}${ci.causalScore}% | Influenced: ${Math.round(ci.influencedRate * 100)}% (${ci.influencedTotal}) vs Baseline: ${Math.round(ci.baselineRate * 100)}% (${ci.baselineTotal})`
                          : `Insufficient data (${ci.influencedTotal} influenced, ${ci.baselineTotal} baseline)`
                        }
                      >
                        {ci.causalVerdict === 'helpful' ? <TrendingUp className="w-3 h-3" /> : ci.causalVerdict === 'misleading' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        {ci.reliable ? `${ci.causalScore > 0 ? '+' : ''}${ci.causalScore}%` : '?'}
                      </span>
                    </div>
                  ))}
              </motion.div>
            )}
          </>
        )}
      </div>
    </GlowCard>
  );
}
