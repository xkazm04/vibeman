/**
 * Behavioral Focus Panel
 * Shows current user focus areas and activity patterns
 */

'use client';

import { Activity, TrendingUp, TrendingDown, Minus, FileCode, GitCommit } from 'lucide-react';
import { useBrainStore } from '@/stores/brainStore';

interface Props {
  isLoading: boolean;
  scope?: 'project' | 'global';
}

export default function BehavioralFocusPanel({ isLoading, scope = 'project' }: Props) {
  const { behavioralContext } = useBrainStore();

  if (scope === 'global') {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-zinc-200">Cross-Project Focus</h2>
        </div>
        <p className="text-zinc-500 text-sm mb-3">
          Global mode shows cross-project patterns from global reflections.
          Select a specific project to see detailed behavioral focus data.
        </p>
        <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
          <p className="text-xs text-purple-300/70">
            Trigger a global reflection to analyze patterns across all your projects.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
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
    );
  }

  if (!behavioralContext?.hasData) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-zinc-200">Current Focus</h2>
        </div>
        <p className="text-zinc-500 text-sm">
          No behavioral data yet. Activity will be tracked as you work on directions and implementations.
        </p>
      </div>
    );
  }

  const { currentFocus, trending } = behavioralContext;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-semibold text-zinc-200">Current Focus</h2>
      </div>

      {/* Active Contexts */}
      {currentFocus.activeContexts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Active Areas (Last 7 Days)</h3>
          <div className="space-y-2">
            {currentFocus.activeContexts.map((ctx) => (
              <div
                key={ctx.id}
                className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/30"
              >
                <span className="text-sm text-zinc-300">{ctx.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"
                      style={{ width: `${Math.min(ctx.activityScore * 20, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500 w-8 text-right">
                    {ctx.activityScore.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Commit Themes */}
      {currentFocus.recentCommitThemes.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
            <GitCommit className="w-4 h-4" />
            Recent Commit Themes
          </h3>
          <div className="flex flex-wrap gap-2">
            {currentFocus.recentCommitThemes.slice(0, 5).map((theme, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs bg-zinc-800/50 text-zinc-400 rounded-md truncate max-w-[200px]"
                title={theme}
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* API Trends */}
      {trending.hotEndpoints.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-zinc-400 mb-3">API Usage Trends</h3>
          <div className="space-y-2">
            {trending.hotEndpoints.slice(0, 5).map((endpoint, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/30"
              >
                <code className="text-xs text-zinc-400 truncate max-w-[200px]">
                  {endpoint.path}
                </code>
                <div className="flex items-center gap-2">
                  {endpoint.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  ) : endpoint.trend === 'down' ? (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  ) : (
                    <Minus className="w-4 h-4 text-zinc-500" />
                  )}
                  <span
                    className={`text-xs ${
                      endpoint.trend === 'up'
                        ? 'text-green-400'
                        : endpoint.trend === 'down'
                        ? 'text-red-400'
                        : 'text-zinc-500'
                    }`}
                  >
                    {endpoint.changePercent > 0 ? '+' : ''}
                    {endpoint.changePercent.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Neglected Areas */}
      {trending.neglectedAreas.length > 0 && (
        <div className="mt-6 pt-4 border-t border-zinc-800/50">
          <h3 className="text-sm font-medium text-zinc-500 mb-2">Lower Activity Areas</h3>
          <p className="text-xs text-zinc-600">
            {trending.neglectedAreas.slice(0, 3).join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
