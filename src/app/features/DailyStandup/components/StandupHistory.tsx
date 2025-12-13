'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  ChevronDown,
  ChevronUp,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
} from 'lucide-react';
import { useStandupStore } from '@/stores/standupStore';

export default function StandupHistory() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { history, deleteSummary, setFilters, filters } = useStandupStore();

  if (history.length === 0) {
    return null;
  }

  const getTrendIcon = (trend: 'increasing' | 'stable' | 'decreasing' | null) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-3.5 h-3.5 text-green-400" />;
      case 'decreasing':
        return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
      default:
        return <Minus className="w-3.5 h-3.5 text-gray-500" />;
    }
  };

  const handleViewSummary = (item: (typeof history)[0]) => {
    // Calculate date offset from the period start
    const periodStart = new Date(item.periodStart);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dateOffset = 0;
    if (item.periodType === 'daily') {
      const dayDiff = Math.floor(
        (today.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      dateOffset = -dayDiff;
    } else {
      // Weekly - calculate week difference
      const dayOfWeek = today.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(today.getDate() - daysFromMonday);

      const weekDiff = Math.floor(
        (thisWeekStart.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24 * 7)
      );
      dateOffset = -weekDiff;
    }

    setFilters({
      periodType: item.periodType,
      dateOffset,
    });
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this standup summary?')) {
      await deleteSummary(id);
    }
  };

  const visibleHistory = isExpanded ? history : history.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mt-8"
      data-testid="standup-history-section"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-white">History</h3>
          <span className="text-sm text-gray-500">({history.length} summaries)</span>
        </div>
        {history.length > 5 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            data-testid="standup-history-toggle"
          >
            {isExpanded ? (
              <>
                Show Less <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                Show All <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>

      {/* History List */}
      <div className="grid gap-2">
        <AnimatePresence mode="popLayout">
          {visibleHistory.map((item, index) => {
            const periodStart = new Date(item.periodStart);
            const isActive =
              filters.periodType === item.periodType &&
              new Date(item.periodStart).toDateString() === periodStart.toDateString();

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => handleViewSummary(item)}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-blue-900/30 border-blue-500/40'
                    : 'bg-gray-800/30 border-gray-700/30 hover:bg-gray-800/50'
                }`}
                data-testid={`standup-history-item-${index}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      {periodStart.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      item.periodType === 'daily'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-purple-500/20 text-purple-300'
                    }`}
                  >
                    {item.periodType}
                  </span>

                  <span className="text-sm text-white truncate max-w-[200px]">{item.title}</span>
                </div>

                <div className="flex items-center gap-4">
                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400">
                    <span>{item.implementationsCount} impl</span>
                    <span>{item.ideasGenerated} ideas</span>
                    {getTrendIcon(item.velocityTrend)}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDelete(e, item.id)}
                    className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                    aria-label="Delete"
                    data-testid={`standup-history-delete-${index}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
