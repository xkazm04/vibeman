/**
 * Behavioral Focus Panel
 * Shows current user focus areas and activity patterns
 * with drill-down capability for signal details
 * Styled to match Reflector KPI cards
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, Minus, GitCommit, ChevronRight } from 'lucide-react';
import { useBrainStore } from '@/stores/brainStore';
import SignalDetailDrawer, { type DrillDownTarget } from './SignalDetailDrawer';
import ContextSignalDetail from './ContextSignalDetail';
import GlowCard from './GlowCard';

interface Props {
  isLoading: boolean;
  scope?: 'project' | 'global';
}

const ACCENT_COLOR = '#06b6d4'; // Cyan
const GLOW_COLOR = 'rgba(6, 182, 212, 0.15)';

export default function BehavioralFocusPanel({ isLoading, scope = 'project' }: Props) {
  const { behavioralContext } = useBrainStore();
  const [drillTarget, setDrillTarget] = useState<DrillDownTarget | null>(null);

  if (scope === 'global') {
    return (
      <GlowCard accentColor={ACCENT_COLOR} glowColor={GLOW_COLOR} borderColorClass="border-cyan-500/20">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <motion.div
              className="p-2 rounded-xl border"
              style={{
                backgroundColor: `${ACCENT_COLOR}15`,
                borderColor: `${ACCENT_COLOR}40`,
                boxShadow: `0 0 20px ${GLOW_COLOR}`
              }}
            >
              <Activity className="w-5 h-5" style={{ color: ACCENT_COLOR }} />
            </motion.div>
            <h2 className="text-lg font-semibold text-zinc-200">Cross-Project Focus</h2>
          </div>
          <p className="text-zinc-500 text-sm mb-3">
            Global mode shows cross-project patterns from global reflections.
            Select a specific project to see detailed behavioral focus data.
          </p>
          <div
            className="p-3 rounded-lg"
            style={{
              background: 'rgba(168, 85, 247, 0.08)',
              border: '1px solid rgba(168, 85, 247, 0.2)'
            }}
          >
            <p className="text-xs text-purple-300/70">
              Trigger a global reflection to analyze patterns across all your projects.
            </p>
          </div>
        </div>
      </GlowCard>
    );
  }

  if (isLoading) {
    return (
      <GlowCard accentColor={ACCENT_COLOR} glowColor={GLOW_COLOR} borderColorClass="border-cyan-500/20" animate={false}>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-zinc-200">Current Focus</h2>
          </div>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-zinc-800 rounded w-3/4" />
            <div className="h-4 bg-zinc-800 rounded w-1/2" />
            <div className="h-4 bg-zinc-800 rounded w-2/3" />
          </div>
        </div>
      </GlowCard>
    );
  }

  if (!behavioralContext?.hasData) {
    return (
      <GlowCard accentColor={ACCENT_COLOR} glowColor={GLOW_COLOR} borderColorClass="border-cyan-500/20">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <motion.div
              className="p-2 rounded-xl border"
              style={{
                backgroundColor: `${ACCENT_COLOR}15`,
                borderColor: `${ACCENT_COLOR}40`,
                boxShadow: `0 0 20px ${GLOW_COLOR}`
              }}
            >
              <Activity className="w-5 h-5" style={{ color: ACCENT_COLOR }} />
            </motion.div>
            <h2 className="text-lg font-semibold text-zinc-200">Current Focus</h2>
          </div>
          <p className="text-zinc-500 text-sm">
            No behavioral data yet. Activity will be tracked as you work on directions and implementations.
          </p>
        </div>
      </GlowCard>
    );
  }

  const { currentFocus, trending } = behavioralContext;

  return (
    <>
      <GlowCard accentColor={ACCENT_COLOR} glowColor={GLOW_COLOR} borderColorClass="border-cyan-500/20">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <motion.div
              className="p-2 rounded-xl border"
              style={{
                backgroundColor: `${ACCENT_COLOR}15`,
                borderColor: `${ACCENT_COLOR}40`,
                boxShadow: `0 0 20px ${GLOW_COLOR}`
              }}
              whileHover={{ scale: 1.05 }}
            >
              <Activity className="w-5 h-5" style={{ color: ACCENT_COLOR }} />
            </motion.div>
            <h2 className="text-lg font-semibold text-zinc-200">Current Focus</h2>
          </div>

          {/* Active Contexts */}
          {currentFocus.activeContexts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-mono text-zinc-500 mb-3 uppercase tracking-wider">Active Areas (Last 7 Days)</h3>
              <div className="space-y-2">
                {currentFocus.activeContexts.map((ctx) => (
                  <button
                    key={ctx.id}
                    onClick={() => setDrillTarget({ type: 'context', id: ctx.id, name: ctx.name })}
                    className="w-full flex items-center justify-between p-3 rounded-xl transition-all group cursor-pointer text-left"
                    style={{
                      background: 'rgba(6, 182, 212, 0.05)',
                      border: '1px solid rgba(6, 182, 212, 0.15)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <FreshnessBadge score={ctx.activityScore} />
                      <span className="text-sm text-zinc-300">{ctx.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(ctx.activityScore * 20, 100)}%` }}
                          className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
                          style={{ boxShadow: '0 0 10px rgba(6, 182, 212, 0.5)' }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500 font-mono w-10 text-right">
                        {ctx.activityScore.toFixed(1)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Commit Themes */}
          {currentFocus.recentCommitThemes.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-mono text-zinc-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                <GitCommit className="w-3.5 h-3.5" />
                Recent Commit Themes
              </h3>
              <div className="flex flex-wrap gap-2">
                {currentFocus.recentCommitThemes.slice(0, 5).map((theme, i) => (
                  <button
                    key={i}
                    onClick={() => setDrillTarget({ type: 'theme', theme })}
                    className="px-3 py-1.5 text-xs rounded-lg truncate max-w-[200px] transition-all cursor-pointer font-mono"
                    style={{
                      background: 'rgba(168, 85, 247, 0.1)',
                      border: '1px solid rgba(168, 85, 247, 0.2)',
                      color: '#c084fc'
                    }}
                    title={`Click to view commits: ${theme}`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* API Trends */}
          {trending.hotEndpoints.length > 0 && (
            <div>
              <h3 className="text-xs font-mono text-zinc-500 mb-3 uppercase tracking-wider">API Usage Trends</h3>
              <div className="space-y-2">
                {trending.hotEndpoints.slice(0, 5).map((endpoint, i) => (
                  <button
                    key={i}
                    onClick={() => setDrillTarget({ type: 'endpoint', path: endpoint.path, trend: endpoint.trend, changePercent: endpoint.changePercent })}
                    className="w-full flex items-center justify-between p-3 rounded-xl transition-all group cursor-pointer text-left"
                    style={{
                      background: 'rgba(6, 182, 212, 0.03)',
                      border: '1px solid rgba(6, 182, 212, 0.1)'
                    }}
                  >
                    <code className="text-xs text-zinc-400 truncate max-w-[200px] font-mono">
                      {endpoint.path}
                    </code>
                    <div className="flex items-center gap-3">
                      {endpoint.trend === 'up' ? (
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      ) : endpoint.trend === 'down' ? (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      ) : (
                        <Minus className="w-4 h-4 text-zinc-500" />
                      )}
                      <span
                        className="text-xs font-mono font-bold"
                        style={{
                          color: endpoint.trend === 'up' ? '#10b981' : endpoint.trend === 'down' ? '#ef4444' : '#71717a',
                          textShadow: endpoint.trend === 'up' ? '0 0 10px rgba(16, 185, 129, 0.5)' : undefined
                        }}
                      >
                        {endpoint.changePercent > 0 ? '+' : ''}
                        {endpoint.changePercent.toFixed(0)}%
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Neglected Areas */}
          {trending.neglectedAreas.length > 0 && (
            <div className="mt-6 pt-4 border-t border-zinc-800/50">
              <h3 className="text-xs font-mono text-zinc-600 mb-2 uppercase tracking-wider">Lower Activity Areas</h3>
              <p className="text-xs text-zinc-600 font-mono">
                {trending.neglectedAreas.slice(0, 3).join(' · ')}
              </p>
            </div>
          )}
        </div>
      </GlowCard>

      {/* Signal Detail Drawer */}
      <SignalDetailDrawer target={drillTarget} onClose={() => setDrillTarget(null)}>
        {drillTarget && <ContextSignalDetail target={drillTarget} />}
      </SignalDetailDrawer>
    </>
  );
}

/**
 * FreshnessBadge - Small colored dot indicating signal freshness
 * based on activity score (higher = fresher/more active)
 */
function FreshnessBadge({ score }: { score: number }) {
  // Score ranges: 0-1 = stale, 1-3 = moderate, 3+ = fresh
  const config = score >= 3
    ? { color: '#10b981', glow: 'rgba(16, 185, 129, 0.5)', title: 'Fresh (high activity)' }
    : score >= 1
    ? { color: '#f59e0b', glow: 'rgba(245, 158, 11, 0.5)', title: 'Moderate activity' }
    : { color: '#71717a', glow: 'none', title: 'Stale (low activity)' };

  return (
    <span
      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{
        backgroundColor: config.color,
        boxShadow: config.glow !== 'none' ? `0 0 8px ${config.glow}` : undefined
      }}
      title={config.title}
    />
  );
}
