'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Play } from 'lucide-react';
import { useZenStore, type ActivityItem } from '../lib/zenStore';
import { cn } from '@/lib/utils';

const EVENT_ICONS = {
  completed: CheckCircle,
  failed: XCircle,
  running: Play,
};

const EVENT_COLORS = {
  completed: 'bg-green-500/10 text-green-400',
  failed: 'bg-red-500/10 text-red-400',
  running: 'bg-blue-500/10 text-blue-400',
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface EventItemProps {
  event: ActivityItem;
}

function EventItem({ event }: EventItemProps) {
  const Icon = EVENT_ICONS[event.status];
  const colorClass = EVENT_COLORS[event.status];
  const timestamp = event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="px-4 py-2 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
    >
      <div className="flex items-start gap-2">
        <div className={cn("mt-0.5 p-1 rounded shrink-0", colorClass)}>
          <Icon className="w-3 h-3" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-300 truncate">{event.title}</p>
          <div className="flex items-center gap-2 text-[10px] text-gray-600 mt-0.5">
            <span>{formatTimeAgo(timestamp)}</span>
            {event.error && (
              <span className="text-red-400 truncate" title={event.error}>
                Error
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Zen Event Sidebar
 *
 * Shows recent activity feed with task events.
 * Displays last 20 events with status icons and timestamps.
 */
export function ZenEventSidebar() {
  const recentActivity = useZenStore((state) => state.recentActivity);

  const events = useMemo(() =>
    recentActivity.slice(0, 20),
    [recentActivity]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 shrink-0">
        <h3 className="text-sm font-medium text-gray-300">Event Feed</h3>
        <p className="text-[10px] text-gray-500 mt-0.5">
          {events.length > 0 ? `${events.length} recent events` : 'No events yet'}
        </p>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence initial={false} mode="popLayout">
          {events.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4 py-8 text-center text-xs text-gray-600"
            >
              Events will appear here when tasks run
            </motion.div>
          ) : (
            events.map((event) => (
              <EventItem key={event.id} event={event} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
