'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Mail,
  Facebook,
  MessageCircle,
  Star,
  Smartphone,
  Instagram,
  AlertCircle,
  AlertTriangle,
  Circle,
  Minus,
  type LucideIcon,
} from 'lucide-react';
import React from 'react';

// Custom X icon component
const XIcon = React.forwardRef<SVGSVGElement, { className?: string }>(
  ({ className }, ref) => (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
) as LucideIcon;

import type { FeedbackItem, KanbanChannel, KanbanPriority, Sentiment } from '../lib/types/feedbackTypes';
import type { GroupByField, SwimlaneData, SwimlaneConfig } from '../state/viewModeTypes';
import { CHANNEL_COLORS, PRIORITY_SWIM_COLORS, SENTIMENT_SWIM_COLORS } from '../state/viewModeTypes';

const CHANNEL_ICONS: Record<KanbanChannel, LucideIcon> = {
  email: Mail,
  x: XIcon,
  facebook: Facebook,
  support_chat: MessageCircle,
  trustpilot: Star,
  app_store: Smartphone,
  instagram: Instagram,
};

const PRIORITY_ICONS: Record<KanbanPriority, LucideIcon> = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: Circle,
  low: Minus,
};

const CHANNEL_ORDER: KanbanChannel[] = ['x', 'facebook', 'instagram', 'email', 'support_chat', 'trustpilot', 'app_store'];
const PRIORITY_ORDER: KanbanPriority[] = ['critical', 'high', 'medium', 'low'];
const SENTIMENT_ORDER: Sentiment[] = ['angry', 'frustrated', 'disappointed', 'neutral', 'constructive', 'helpful', 'mocking'];

function groupByChannel(items: FeedbackItem[]): SwimlaneData[] {
  const groups: Record<string, FeedbackItem[]> = {};
  items.forEach(item => {
    if (!groups[item.channel]) groups[item.channel] = [];
    groups[item.channel].push(item);
  });

  return CHANNEL_ORDER
    .filter(ch => groups[ch]?.length)
    .map(channel => ({
      id: channel,
      label: channel.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      icon: CHANNEL_ICONS[channel],
      color: CHANNEL_COLORS[channel],
      items: groups[channel],
      count: groups[channel].length,
    }));
}

function groupByPriority(items: FeedbackItem[]): SwimlaneData[] {
  const groups: Record<string, FeedbackItem[]> = {};
  items.forEach(item => {
    if (!groups[item.priority]) groups[item.priority] = [];
    groups[item.priority].push(item);
  });

  return PRIORITY_ORDER
    .filter(p => groups[p]?.length)
    .map(priority => ({
      id: priority,
      label: priority.charAt(0).toUpperCase() + priority.slice(1),
      icon: PRIORITY_ICONS[priority],
      color: PRIORITY_SWIM_COLORS[priority],
      items: groups[priority],
      count: groups[priority].length,
    }));
}

function groupBySentiment(items: FeedbackItem[]): SwimlaneData[] {
  const groups: Record<string, FeedbackItem[]> = {};
  items.forEach(item => {
    const sentiment = item.analysis?.sentiment || 'neutral';
    if (!groups[sentiment]) groups[sentiment] = [];
    groups[sentiment].push(item);
  });

  return SENTIMENT_ORDER
    .filter(s => groups[s]?.length)
    .map(sentiment => ({
      id: sentiment,
      label: sentiment.charAt(0).toUpperCase() + sentiment.slice(1),
      color: SENTIMENT_SWIM_COLORS[sentiment],
      items: groups[sentiment],
      count: groups[sentiment].length,
    }));
}

export function useSwimlanes(items: FeedbackItem[], initialGroupBy: GroupByField = 'none') {
  const [config, setConfig] = useState<SwimlaneConfig>({
    groupBy: initialGroupBy,
    collapsedLanes: new Set(),
  });

  const swimlanes = useMemo<SwimlaneData[]>(() => {
    switch (config.groupBy) {
      case 'channel':
        return groupByChannel(items);
      case 'priority':
        return groupByPriority(items);
      case 'sentiment':
        return groupBySentiment(items);
      default:
        return [{
          id: 'all',
          label: 'All Items',
          color: 'bg-gray-500',
          items,
          count: items.length,
        }];
    }
  }, [items, config.groupBy]);

  const setGroupBy = useCallback((groupBy: GroupByField) => {
    setConfig(prev => ({ ...prev, groupBy, collapsedLanes: new Set() }));
  }, []);

  const toggleCollapse = useCallback((laneId: string) => {
    setConfig(prev => {
      const newCollapsed = new Set(prev.collapsedLanes);
      if (newCollapsed.has(laneId)) {
        newCollapsed.delete(laneId);
      } else {
        newCollapsed.add(laneId);
      }
      return { ...prev, collapsedLanes: newCollapsed };
    });
  }, []);

  const isCollapsed = useCallback((laneId: string) => {
    return config.collapsedLanes.has(laneId);
  }, [config.collapsedLanes]);

  return {
    swimlanes,
    groupBy: config.groupBy,
    setGroupBy,
    toggleCollapse,
    isCollapsed,
  };
}
