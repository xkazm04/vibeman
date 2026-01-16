'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Reply,
  Ticket,
  CheckCircle,
  Tag,
  FileText,
  Clock,
  Mail,
  Twitter,
  Facebook,
  Instagram,
  MessageCircle,
  Star,
  Smartphone,
} from 'lucide-react';
import type { InteractionHistoryEntry } from '@/lib/social';
import type { KanbanChannel } from '../../lib/types/feedbackTypes';

interface HistoryTimelineProps {
  history: InteractionHistoryEntry[];
  maxItems?: number;
  showLoadMore?: boolean;
  onLoadMore?: () => void;
}

const TYPE_CONFIG: Record<InteractionHistoryEntry['type'], {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  label: string;
}> = {
  feedback: {
    icon: MessageSquare,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    label: 'Feedback received',
  },
  response: {
    icon: Reply,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    label: 'Response sent',
  },
  ticket_created: {
    icon: Ticket,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    label: 'Ticket created',
  },
  ticket_resolved: {
    icon: CheckCircle,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    label: 'Ticket resolved',
  },
  note_added: {
    icon: FileText,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    label: 'Note added',
  },
  tag_added: {
    icon: Tag,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    label: 'Tag added',
  },
};

const CHANNEL_ICONS: Record<KanbanChannel, React.ElementType> = {
  email: Mail,
  x: Twitter,
  facebook: Facebook,
  instagram: Instagram,
  support_chat: MessageCircle,
  trustpilot: Star,
  app_store: Smartphone,
};

export function HistoryTimeline({
  history,
  maxItems,
  showLoadMore = false,
  onLoadMore,
}: HistoryTimelineProps) {
  const displayedHistory = maxItems ? history.slice(0, maxItems) : history;
  const hasMore = maxItems && history.length > maxItems;

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No interaction history yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-700/50" />

      <div className="space-y-4">
        {displayedHistory.map((entry, index) => {
          const config = TYPE_CONFIG[entry.type];
          const Icon = config.icon;
          const ChannelIcon = entry.channel ? CHANNEL_ICONS[entry.channel] : null;

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative flex items-start gap-3 pl-8"
            >
              {/* Timeline dot */}
              <div
                className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center
                  ${config.bgColor} border border-gray-700`}
              >
                <Icon className={`w-3 h-3 ${config.color}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium ${config.color}`}>
                    {config.label}
                  </span>
                  {ChannelIcon && (
                    <ChannelIcon className="w-3 h-3 text-gray-500" />
                  )}
                  <span className="text-xs text-gray-500">
                    {formatRelativeTime(entry.timestamp)}
                  </span>
                </div>

                <p className="text-sm text-gray-300 line-clamp-2">
                  {entry.summary}
                </p>

                {entry.details && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {'status' in entry.details && entry.details.status != null && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400">
                        {String(entry.details.status)}
                      </span>
                    )}
                    {'priority' in entry.details && entry.details.priority != null && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400">
                        {String(entry.details.priority)}
                      </span>
                    )}
                    {'sentiment' in entry.details && entry.details.sentiment != null && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400">
                        {String(entry.details.sentiment)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Load more button */}
      {(hasMore || showLoadMore) && onLoadMore && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onLoadMore}
          className="mt-4 ml-8 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Load more history ({history.length - (maxItems || 0)} more)
        </motion.button>
      )}
    </div>
  );
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
