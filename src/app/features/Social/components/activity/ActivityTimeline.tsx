'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { ActivityEvent } from '../../lib/types/activityTypes';
import { ActivityItem } from './ActivityItem';

interface ActivityTimelineProps {
  events: ActivityEvent[];
  showFeedbackId?: boolean;
  onJumpToItem?: (feedbackId: string) => void;
  maxItems?: number;
}

function groupEventsByDate(events: ActivityEvent[]): Map<string, ActivityEvent[]> {
  const groups = new Map<string, ActivityEvent[]>();

  events.forEach(event => {
    const date = new Date(event.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let key: string;
    if (date.toDateString() === today.toDateString()) {
      key = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = 'Yesterday';
    } else {
      key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(event);
  });

  return groups;
}

export function ActivityTimeline({
  events,
  showFeedbackId = false,
  onJumpToItem,
  maxItems = 50,
}: ActivityTimelineProps) {
  const limitedEvents = events.slice(0, maxItems);
  const groupedEvents = groupEventsByDate(limitedEvents);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <p className="text-sm">No activity yet</p>
        <p className="text-xs mt-1">Events will appear here as you work</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-700/50" />

      <AnimatePresence mode="popLayout">
        {Array.from(groupedEvents.entries()).map(([dateLabel, dateEvents]) => (
          <motion.div
            key={dateLabel}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4"
          >
            {/* Date header */}
            <div className="flex items-center gap-2 mb-2 pl-2">
              <div className="w-2 h-2 rounded-full bg-gray-600 z-10" />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {dateLabel}
              </span>
            </div>

            {/* Events */}
            <div className="pl-6 space-y-1">
              {dateEvents.map(event => (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <ActivityItem
                    event={event}
                    showFeedbackId={showFeedbackId}
                    onJumpToItem={onJumpToItem}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {events.length > maxItems && (
        <div className="text-center py-2 text-xs text-gray-500">
          Showing {maxItems} of {events.length} events
        </div>
      )}
    </div>
  );
}

export default ActivityTimeline;
