'use client';

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Tag,
  BarChart3,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { FeedbackTheme, ThemeTimeWindow } from '../lib/themeExtractor';

interface Props {
  themes: FeedbackTheme[];
  timeline?: ThemeTimeWindow[];
  totalItems: number;
  onThemeClick?: (theme: FeedbackTheme) => void;
}

function TrendIcon({ trend }: { trend: 'increasing' | 'decreasing' | 'stable' }) {
  if (trend === 'increasing') return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
  if (trend === 'decreasing') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  return <Minus className="w-3.5 h-3.5 text-zinc-500" />;
}

function PriorityBar({ value }: { value: number }) {
  const colors = ['bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500'];
  const colorIdx = Math.min(Math.floor(value - 1), 3);
  const widthPercent = Math.min((value / 4) * 100, 100);

  return (
    <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-full ${colors[colorIdx]} rounded-full`}
        style={{ width: `${widthPercent}%` }}
      />
    </div>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return null;

  const colors: Record<string, string> = {
    angry: 'bg-red-500/10 text-red-400',
    frustrated: 'bg-orange-500/10 text-orange-400',
    disappointed: 'bg-amber-500/10 text-amber-400',
    neutral: 'bg-zinc-500/10 text-zinc-400',
    constructive: 'bg-blue-500/10 text-blue-400',
    helpful: 'bg-green-500/10 text-green-400',
    mocking: 'bg-purple-500/10 text-purple-400',
  };

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] ${colors[sentiment] || colors.neutral}`}>
      {sentiment}
    </span>
  );
}

function ThemeCard({
  theme,
  rank,
  onClick,
}: {
  theme: FeedbackTheme;
  rank: number;
  onClick?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-zinc-700/50 bg-zinc-800/30 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={() => {
          setExpanded(!expanded);
          onClick?.();
        }}
      >
        {/* Rank badge */}
        <div className="w-6 h-6 flex items-center justify-center bg-purple-500/20 text-purple-300 rounded-full text-xs font-bold">
          {rank}
        </div>

        {/* Theme info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200">{theme.label}</span>
            <TrendIcon trend={theme.trend} />
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {theme.keywords.slice(0, 3).map((kw) => (
              <span
                key={kw}
                className="px-1.5 py-0.5 bg-zinc-700/50 text-zinc-400 rounded text-[10px]"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <div className="text-zinc-200 font-medium">{theme.itemCount}</div>
            <div className="text-zinc-500">items</div>
          </div>
          <div className="text-right">
            <div className="text-zinc-200 font-medium">{theme.percentage}%</div>
            <div className="text-zinc-500">share</div>
          </div>
        </div>

        {expanded ? (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-500" />
        )}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-zinc-800/50 px-3 py-2.5 space-y-2">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-zinc-500 mb-1">Avg Priority</div>
              <div className="flex items-center gap-2">
                <PriorityBar value={theme.avgPriority} />
                <span className="text-zinc-300">{theme.avgPriority.toFixed(1)}</span>
              </div>
            </div>
            <div>
              <div className="text-zinc-500 mb-1">Sentiment</div>
              <SentimentBadge sentiment={theme.dominantSentiment} />
            </div>
            <div>
              <div className="text-zinc-500 mb-1">Channels</div>
              <div className="flex flex-wrap gap-1">
                {theme.channels.map((ch) => (
                  <span key={ch} className="px-1 py-0.5 bg-zinc-700/50 text-zinc-400 rounded text-[10px]">
                    {ch}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Keywords */}
          <div>
            <div className="text-zinc-500 text-xs mb-1">All Keywords</div>
            <div className="flex flex-wrap gap-1">
              {theme.keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/10 text-purple-300 rounded text-[10px]"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ThemeDashboard({ themes, timeline, totalItems, onThemeClick }: Props) {
  const sortedThemes = [...themes].sort((a, b) => b.itemCount - a.itemCount);
  const trendingUp = themes.filter((t) => t.trend === 'increasing').length;
  const trendingDown = themes.filter((t) => t.trend === 'decreasing').length;
  const coveragePercent = totalItems > 0
    ? Math.round((themes.reduce((sum, t) => sum + t.itemCount, 0) / totalItems) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            Themes
          </div>
          <div className="text-lg font-bold text-zinc-200">{themes.length}</div>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <Tag className="w-3.5 h-3.5" />
            Coverage
          </div>
          <div className="text-lg font-bold text-zinc-200">{coveragePercent}%</div>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-400" />
            Rising
          </div>
          <div className="text-lg font-bold text-green-400">{trendingUp}</div>
        </div>
        <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            Declining
          </div>
          <div className="text-lg font-bold text-red-400">{trendingDown}</div>
        </div>
      </div>

      {/* Theme list */}
      <div className="space-y-2">
        {sortedThemes.map((theme, idx) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            rank={idx + 1}
            onClick={() => onThemeClick?.(theme)}
          />
        ))}
      </div>

      {themes.length === 0 && (
        <div className="text-center py-8 text-zinc-500 text-sm">
          No themes detected yet. Add more feedback items to discover patterns.
        </div>
      )}
    </div>
  );
}
