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
import BrainPanelHeader from './BrainPanelHeader';
import BrainEmptyState from './BrainEmptyState';
import FocusEmptySvg from './FocusEmptySvg';
import { useBrainStore } from '@/stores/brainStore';
import SignalDetailDrawer, { type DrillDownTarget } from './SignalDetailDrawer';
import ContextSignalDetail from './ContextSignalDetail';
import GlowCard from './GlowCard';
import NeuralSkeleton from './NeuralSkeleton';
import SectionHeading from './SectionHeading';
import { BRAIN_CHART } from '../lib/brainChartColors';

interface Props {
  isLoading: boolean;
  scope?: 'project' | 'global';
}

const ACCENT_COLOR = BRAIN_CHART.panel.focus;
const GLOW_COLOR = BRAIN_CHART.panel.focusGlow;

export default function BehavioralFocusPanel({ isLoading, scope = 'project' }: Props) {
  const { behavioralContext } = useBrainStore();
  const [drillTarget, setDrillTarget] = useState<DrillDownTarget | null>(null);

  const hasData = !isLoading && scope !== 'global' && behavioralContext?.hasData;
  const { currentFocus, trending } = hasData ? behavioralContext : { currentFocus: null, trending: null };

  const headerTitle = scope === 'global' ? 'Cross-Project Focus' : 'Current Focus';

  return (
    <>
      <GlowCard accentColor={ACCENT_COLOR} glowColor={GLOW_COLOR} borderColorClass="border-cyan-500/20" animate={!isLoading}>
        <BrainPanelHeader
          icon={Activity}
          title={headerTitle}
          accentColor={ACCENT_COLOR}
          glowColor={GLOW_COLOR}
          glow={hasData}
        />
        <div className="p-6">
        {scope === 'global' ? (
          <div className="py-6 flex justify-center">
            <BrainEmptyState
              icon={<Activity className="w-10 h-10 text-zinc-600" />}
              title="Project scope only"
              description="Select a specific project to see detailed behavioral focus data, or trigger a global reflection to analyze cross-project patterns."
            />
          </div>
        ) : isLoading ? (
          <NeuralSkeleton accentColor={ACCENT_COLOR} lines={3} />
        ) : !hasData ? (
          <div className="py-6 flex justify-center">
            <BrainEmptyState
              icon={<FocusEmptySvg />}
              title="No behavioral data yet"
              description="Activity will be tracked as you work on directions and implementations."
            />
          </div>
        ) : (
          <>
            {/* Active Contexts */}
            {currentFocus!.activeContexts.length > 0 && (
              <div className="mb-6">
                <SectionHeading>Active Areas (Last 7 Days)</SectionHeading>
                <div className="space-y-2">
                  {currentFocus!.activeContexts.map((ctx) => (
                    <button
                      key={ctx.id}
                      onClick={() => setDrillTarget({ type: 'context', id: ctx.id, name: ctx.name })}
                      aria-label={`View details for ${ctx.name}`}
                      className="w-full flex items-center justify-between p-3 rounded-xl transition-all group cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 outline-none"
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
            {currentFocus!.recentCommitThemes.length > 0 && (
              <div className="mb-6">
                <SectionHeading className="flex items-center gap-2">
                  <GitCommit className="w-3.5 h-3.5" />
                  Recent Commit Themes
                </SectionHeading>
                <div className="flex flex-wrap gap-2">
                  {currentFocus!.recentCommitThemes.slice(0, 5).map((theme, i) => (
                    <button
                      key={i}
                      onClick={() => setDrillTarget({ type: 'theme', theme })}
                      className="px-3 py-1.5 text-xs rounded-lg truncate max-w-[200px] transition-all cursor-pointer font-mono focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 outline-none"
                      style={{
                        background: `${BRAIN_CHART.brand.accent}1a`,
                        border: `1px solid ${BRAIN_CHART.brand.accent}33`,
                        color: '#c084fc'
                      }}
                      aria-label={`View commits for theme: ${theme}`}
                      title={`Click to view commits: ${theme}`}
                    >
                      {theme}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* API Trends */}
            {trending!.hotEndpoints.length > 0 && (
              <div>
                <SectionHeading>API Usage Trends</SectionHeading>
                <div className="space-y-2">
                  {trending!.hotEndpoints.slice(0, 5).map((endpoint, i) => (
                    <button
                      key={i}
                      onClick={() => setDrillTarget({ type: 'endpoint', path: endpoint.path, trend: endpoint.trend, changePercent: endpoint.changePercent })}
                      aria-label={`View details for endpoint ${endpoint.path}, trend ${endpoint.trend} ${endpoint.changePercent}%`}
                      className="w-full flex items-center justify-between p-3 rounded-xl transition-all group cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 outline-none"
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
                            color: endpoint.trend === 'up' ? BRAIN_CHART.positive : endpoint.trend === 'down' ? BRAIN_CHART.negative : BRAIN_CHART.neutral,
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
            {trending!.neglectedAreas.length > 0 && (
              <div className="mt-6 pt-4 border-t border-zinc-800/50">
                <SectionHeading>Lower Activity Areas</SectionHeading>
                <p className="text-xs text-zinc-600 font-mono">
                  {trending!.neglectedAreas.slice(0, 3).join(' · ')}
                </p>
              </div>
            )}
          </>
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
    ? { ...BRAIN_CHART.freshness.fresh, label: 'Fresh (high activity)' }
    : score >= 1
    ? { ...BRAIN_CHART.freshness.moderate, label: 'Moderate activity' }
    : { ...BRAIN_CHART.freshness.stale, label: 'Stale (low activity)' };

  return (
    <span
      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
      role="img"
      aria-label={config.label}
      style={{
        backgroundColor: config.color,
        boxShadow: config.glow !== 'none' ? `0 0 8px ${config.glow}` : undefined
      }}
      title={config.label}
    />
  );
}
