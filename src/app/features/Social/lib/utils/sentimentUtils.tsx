'use client';

import {
  Angry,
  Frown,
  Meh,
  ThumbsUp,
  Lightbulb,
  Heart,
  Ghost,
  type LucideIcon,
} from 'lucide-react';
import type { Sentiment, KanbanPriority } from '../types/feedbackTypes';

// Sentiment icons mapping
export const SENTIMENT_ICONS: Record<Sentiment, LucideIcon> = {
  angry: Angry,
  frustrated: Frown,
  disappointed: Meh,
  neutral: Meh,
  constructive: Lightbulb,
  helpful: Heart,
  mocking: Ghost,
};

// Sentiment colors
export const SENTIMENT_COLORS: Record<Sentiment, { bg: string; text: string; border: string }> = {
  angry: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  frustrated: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
  disappointed: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  neutral: { bg: 'bg-gray-500/15', text: 'text-gray-400', border: 'border-gray-500/30' },
  constructive: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  helpful: { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' },
  mocking: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
};

// Priority colors
export const PRIORITY_BADGE_COLORS: Record<KanbanPriority, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  high: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
  medium: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  low: { bg: 'bg-gray-500/15', text: 'text-gray-400', border: 'border-gray-500/30' },
};

// Confidence colors based on value
export function getConfidenceColors(confidence: number): { bg: string; text: string; border: string } {
  if (confidence >= 0.8) {
    return { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' };
  }
  if (confidence >= 0.6) {
    return { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' };
  }
  if (confidence >= 0.4) {
    return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' };
  }
  return { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' };
}

// Sentiment badge component
interface SentimentBadgeProps {
  sentiment: Sentiment;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export function SentimentBadge({ sentiment, showIcon = true, size = 'sm' }: SentimentBadgeProps) {
  const Icon = SENTIMENT_ICONS[sentiment];
  const colors = SENTIMENT_COLORS[sentiment];
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';

  return (
    <div className={`inline-flex items-center gap-1.5 ${padding} rounded-full border
      ${colors.bg} ${colors.text} ${colors.border}`}>
      {showIcon && <Icon className={iconSize} />}
      <span className={`${textSize} font-medium capitalize`}>{sentiment}</span>
    </div>
  );
}

// Priority badge component
interface PriorityBadgeProps {
  priority: KanbanPriority;
  size?: 'sm' | 'md';
}

export function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  const colors = PRIORITY_BADGE_COLORS[priority];
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';

  return (
    <div className={`inline-flex items-center gap-1.5 ${padding} rounded-full border
      ${colors.bg} ${colors.text} ${colors.border}`}>
      <span className={`${textSize} font-medium capitalize`}>{priority}</span>
    </div>
  );
}

// Confidence badge component
interface ConfidenceBadgeProps {
  confidence: number;
  size?: 'sm' | 'md';
}

export function ConfidenceBadge({ confidence, size = 'sm' }: ConfidenceBadgeProps) {
  const colors = getConfidenceColors(confidence);
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1';

  return (
    <div className={`inline-flex items-center gap-1.5 ${padding} rounded-full border
      ${colors.bg} ${colors.text} ${colors.border}`}>
      <span className={`${textSize} font-medium`}>{Math.round(confidence * 100)}%</span>
    </div>
  );
}
