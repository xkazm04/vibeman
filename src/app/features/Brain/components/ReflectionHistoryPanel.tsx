'use client';

import { History, TrendingUp, Lightbulb, Clock, BarChart3 } from 'lucide-react';
import BrainPanelHeader from './BrainPanelHeader';
import GlowCard from './GlowCard';
import NeuralPulseLoader from './NeuralPulseLoader';
import BrainEmptyState from './BrainEmptyState';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import ReflectionHistoryItem, { type ReflectionHistoryEntry } from './ReflectionHistoryItem';
import { useReflectionHistory, useInvalidateBrain, useReflectionRevalidation } from '../lib/queries';

const ACCENT_COLOR = '#a855f7'; // Purple
const GLOW_COLOR = 'rgba(168, 85, 247, 0.15)';

interface AggregateStats {
  totalReflections: number;
  completedReflections: number;
  failedReflections: number;
  totalInsights: number;
  avgInsightsPerReflection: number;
  totalDurationMs: number;
  avgDurationMs: number;
}

interface Props {
  scope?: 'project' | 'global';
}

function formatDurationShort(ms: number): string {
  if (ms < 1000) return '< 1s';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m`;
}

export default function ReflectionHistoryPanel({ scope = 'project' }: Props) {
  const activeProject = useClientProjectStore((state) => state.activeProject);
  const { data, isLoading, error } = useReflectionHistory(activeProject?.id ?? null, scope, 20);
  const { invalidateReflections } = useInvalidateBrain();

  const history = (data?.history ?? []) as unknown as ReflectionHistoryEntry[];
  const aggregates = data?.aggregates ?? null;

  // Subscribe to reflection completion events for auto-refresh
  useReflectionRevalidation(scope, activeProject?.id, invalidateReflections);

  return (
    <GlowCard accentColor={ACCENT_COLOR} glowColor={GLOW_COLOR} borderColorClass="border-purple-500/20" animate={!isLoading}>
      <BrainPanelHeader
        icon={History}
        title="Reflection History"
        accentColor={ACCENT_COLOR}
        glowColor={GLOW_COLOR}
        trailing={scope === 'global' ? (
          <span className="px-2 py-0.5 bg-zinc-700/50 text-zinc-400 rounded text-xs font-mono">GLOBAL</span>
        ) : undefined}
      />
      <div className="p-6">
      {isLoading ? (
        <div className="h-32 flex items-center justify-center">
          <NeuralPulseLoader />
        </div>
      ) : error ? (
        <div className="text-sm text-red-400">{error.message}</div>
      ) : history.length === 0 ? (
        <div className="py-6 flex justify-center">
          <BrainEmptyState
            icon={<History className="w-10 h-10 text-zinc-600" />}
            title="No reflections yet"
            description="Reflections will appear here after Brain processes your activity."
          />
        </div>
      ) : (
        <>
          {/* Aggregate Stats */}
          {aggregates && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              <div className="bg-zinc-800/40 rounded-lg px-3 py-2 flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-zinc-500" />
                <div>
                  <div className="text-xs text-zinc-500">Total</div>
                  <div className="text-sm font-medium text-zinc-200">{aggregates.completedReflections}</div>
                </div>
              </div>
              <div className="bg-zinc-800/40 rounded-lg px-3 py-2 flex items-center gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <div>
                  <div className="text-xs text-zinc-500">Insights</div>
                  <div className="text-sm font-medium text-zinc-200">{aggregates.totalInsights}</div>
                </div>
              </div>
              <div className="bg-zinc-800/40 rounded-lg px-3 py-2 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                <div>
                  <div className="text-xs text-zinc-500">Avg/Run</div>
                  <div className="text-sm font-medium text-zinc-200">{aggregates.avgInsightsPerReflection}</div>
                </div>
              </div>
              <div className="bg-zinc-800/40 rounded-lg px-3 py-2 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <div>
                  <div className="text-xs text-zinc-500">Avg Time</div>
                  <div className="text-sm font-medium text-zinc-200">{formatDurationShort(aggregates.avgDurationMs)}</div>
                </div>
              </div>
            </div>
          )}

          {/* History list */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {history.map((entry) => (
              <ReflectionHistoryItem key={entry.id} entry={entry} />
            ))}
          </div>
        </>
      )}
      </div>
    </GlowCard>
  );
}
