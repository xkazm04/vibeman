'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Loader2, AlertCircle } from 'lucide-react';
import { BLUEPRINT_COLUMNS } from '../../Onboarding/sub_Blueprint/lib/blueprintConfig';

interface EventStat {
  title: string;
  count: number;
}

interface EventsBarChartProps {
  projectId: string;
  limit?: number;
}

// Helper function to map event title to short label
const getEventLabel = (eventTitle: string): string => {
  for (const column of BLUEPRINT_COLUMNS) {
    for (const button of column.buttons) {
      if (button.eventTitle === eventTitle) {
        return button.label;
      }
    }
  }
  // If not found in config, try to extract a short name
  // e.g., "Vision Scan Completed" -> "Vision"
  const match = eventTitle.match(/^(\w+)/);
  return match ? match[1] : eventTitle;
};

// Helper function to get color for event
const getEventColor = (eventTitle: string): string => {
  for (const column of BLUEPRINT_COLUMNS) {
    for (const button of column.buttons) {
      if (button.eventTitle === eventTitle) {
        switch (button.color) {
          case 'cyan': return 'bg-cyan-500/80';
          case 'blue': return 'bg-blue-500/80';
          case 'purple': return 'bg-purple-500/80';
          case 'green': return 'bg-green-500/80';
          case 'amber': return 'bg-amber-500/80';
          case 'red': return 'bg-red-500/80';
          case 'pink': return 'bg-pink-500/80';
          case 'indigo': return 'bg-indigo-500/80';
          default: return 'bg-blue-500/80';
        }
      }
    }
  }
  return 'bg-blue-500/80';
};

export default function EventsBarChart({
  projectId,
  limit = 10,
}: EventsBarChartProps) {
  const [stats, setStats] = useState<EventStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  // Fetch stats on mount and when projectId changes
  useEffect(() => {
    if (!projectId) return;

    const controller = new AbortController();
    const fetchStats = async () => {
      setIsLoading(true);
      setError(undefined);

      try {
        const response = await fetch(
          `/api/blueprint/events/stats?projectId=${encodeURIComponent(projectId)}&limit=${limit}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch event stats');
        }

        const data = await response.json();
        setStats(data.stats || []);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    return () => controller.abort();
  }, [projectId, limit]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
        <AlertCircle className="w-4 h-4 text-red-400" />
        <span className="text-sm text-red-400">{error}</span>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-8"
      >
        <BarChart3 className="w-8 h-8 text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No events logged yet</p>
        <p className="text-sm text-gray-600 mt-1">
          Activity will appear here after running scans
        </p>
      </motion.div>
    );
  }

  // Calculate max count for scaling bars
  const maxCount = Math.max(...stats.map(s => s.count));

  return (
    <div className="w-full space-y-3">
        <AnimatePresence>
          {stats.map((stat, index) => {
            const label = getEventLabel(stat.title);
            const color = getEventColor(stat.title);
            const percentage = (stat.count / maxCount) * 100;

            return (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  transition: {
                    delay: index * 0.05,
                    duration: 0.3
                  }
                }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-1.5"
              >
                {/* Label and count */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-300">{label}</span>
                  <span className="text-xs font-mono text-gray-400">{stat.count}</span>
                </div>

                {/* Bar */}
                <div className="relative h-2 bg-gray-800/50 rounded-full overflow-hidden border border-gray-700/30">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${percentage}%`,
                      transition: {
                        delay: index * 0.05 + 0.2,
                        duration: 0.6,
                        ease: 'easeOut'
                      }
                    }}
                    className={`h-full ${color} rounded-full`}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
    </div>
  );
}
