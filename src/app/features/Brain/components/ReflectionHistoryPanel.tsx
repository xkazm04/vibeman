'use client';

import { useEffect, useState, useCallback } from 'react';
import { History, TrendingUp, Lightbulb, Clock, BarChart3 } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import ReflectionHistoryItem, { type ReflectionHistoryEntry } from './ReflectionHistoryItem';

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
  const [history, setHistory] = useState<ReflectionHistoryEntry[]>([]);
  const [aggregates, setAggregates] = useState<AggregateStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeProject = useActiveProjectStore((state) => state.activeProject);

  const fetchHistory = useCallback(async () => {
    if (!activeProject?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/brain/reflection?mode=history&projectId=${activeProject.id}&limit=20`
      );
      const data = await res.json();

      if (data.success) {
        setHistory(data.history);
        setAggregates(data.aggregates);
      } else {
        setError(data.error || 'Failed to load history');
      }
    } catch {
      setError('Failed to fetch reflection history');
    } finally {
      setIsLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (isLoading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-zinc-200">Reflection History</h2>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-zinc-800 rounded w-1/2" />
          <div className="h-12 bg-zinc-800 rounded" />
          <div className="h-12 bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-zinc-200">Reflection History</h2>
        </div>
        <div className="text-sm text-red-400">{error}</div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-zinc-200">Reflection History</h2>
        </div>
        <div className="text-sm text-zinc-500">No reflections recorded yet.</div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-purple-400" />
        <h2 className="text-lg font-semibold text-zinc-200">Reflection History</h2>
        {scope === 'global' && (
          <span className="px-2 py-0.5 bg-zinc-700/50 text-zinc-400 rounded text-xs">Global</span>
        )}
      </div>

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
    </div>
  );
}
