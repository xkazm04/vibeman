'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Scan,
  Wrench,
  Shield,
  Rocket,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  LucideIcon,
} from 'lucide-react';
import { LifecycleEvent, LifecyclePhase } from '../lib/lifecycleTypes';

type EventFilterCategory = 'phases' | 'scans' | 'gates' | 'errors';

const EVENT_FILTER_CATEGORIES: Array<{ id: EventFilterCategory; label: string; types: LifecycleEvent['event_type'][] }> = [
  { id: 'phases', label: 'Phase Changes', types: ['phase_change'] },
  { id: 'scans', label: 'Scans', types: ['scan_start', 'scan_complete'] },
  { id: 'gates', label: 'Gates', types: ['gate_start', 'gate_complete'] },
  { id: 'errors', label: 'Errors', types: ['error', 'warning'] },
];

interface LifecycleTimelineProps {
  events: LifecycleEvent[];
  maxEvents?: number;
  compact?: boolean;
}

interface EventConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

const EVENT_ICONS: Record<LifecycleEvent['event_type'], EventConfig> = {
  phase_change: {
    icon: CheckCircle,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  scan_start: {
    icon: Scan,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
  },
  scan_complete: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
  },
  idea_resolved: {
    icon: Wrench,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  gate_start: {
    icon: Shield,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
  },
  gate_complete: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
  },
  deploy_start: {
    icon: Rocket,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
  },
  deploy_complete: {
    icon: CheckCircle,
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
  },
  error: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
  },
  info: {
    icon: Info,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
  },
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 60000) {
    return 'Just now';
  }

  if (diffMs < 3600000) {
    const mins = Math.floor(diffMs / 60000);
    return `${mins}m ago`;
  }

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function LifecycleTimeline({
  events,
  maxEvents = 20,
  compact = false,
}: LifecycleTimelineProps) {
  const [activeFilters, setActiveFilters] = useState<Set<EventFilterCategory>>(new Set());

  const toggleFilter = (category: EventFilterCategory) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const allEvents = events.slice(-maxEvents).reverse();

  // When no filters active, show all events; otherwise show only matching types
  const allowedTypes = activeFilters.size > 0
    ? new Set(EVENT_FILTER_CATEGORIES.filter((c) => activeFilters.has(c.id)).flatMap((c) => c.types))
    : null;

  const displayEvents = allowedTypes
    ? allEvents.filter((e) => allowedTypes.has(e.event_type))
    : allEvents;

  if (allEvents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500" data-testid="lifecycle-timeline-empty">
        <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No lifecycle events yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-1" data-testid="lifecycle-timeline">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5 pb-2">
        {EVENT_FILTER_CATEGORIES.map((cat) => {
          const isActive = activeFilters.has(cat.id);
          const count = allEvents.filter((e) => cat.types.includes(e.event_type)).length;
          return (
            <button
              key={cat.id}
              onClick={() => toggleFilter(cat.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'bg-gray-700/30 text-gray-400 border border-gray-700/40 hover:bg-gray-700/50 hover:text-gray-300'
              }`}
            >
              {cat.label}
              {count > 0 && (
                <span className={`ml-1.5 ${isActive ? 'text-blue-400/70' : 'text-gray-500'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="popLayout">
        {displayEvents.map((event, index) => {
          const config = EVENT_ICONS[event.event_type];
          const Icon = config.icon;

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2, delay: index * 0.02 }}
              className={`flex items-start gap-3 ${compact ? 'py-1' : 'py-2'}`}
              data-testid={`lifecycle-event-${event.id}`}
            >
              {/* Timeline connector */}
              <div className="relative flex flex-col items-center">
                <div
                  className={`flex items-center justify-center w-6 h-6 rounded-full ${config.bgColor}`}
                >
                  <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                </div>
                {index < displayEvents.length - 1 && (
                  <div className="w-px h-full min-h-[16px] bg-gray-700/50 mt-1" />
                )}
              </div>

              {/* Event content */}
              <div className="flex-1 min-w-0">
                <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-300`}>
                  {event.message}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatTimestamp(event.created_at)}
                </p>

                {/* Event details (if any and not compact) */}
                {!compact && event.details && Object.keys(event.details).length > 0 && (
                  <div className="mt-1 p-2 bg-gray-800/30 rounded text-xs font-mono text-gray-400 overflow-x-auto">
                    {Object.entries(event.details).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-gray-500">{key}:</span>{' '}
                        <span>{JSON.stringify(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
