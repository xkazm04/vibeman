/**
 * Generation History Panel
 * Displays past template generations with template name, query snippet, and relative time
 */

'use client';

import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Clock, FileText } from 'lucide-react';
import { formatRelativeTime } from '@/lib/formatDate';
import type { DbGenerationHistoryWithTemplate } from '../../../db/models/types';

export interface GenerationHistoryPanelRef {
  refresh: () => void;
}

export const GenerationHistoryPanel = forwardRef<GenerationHistoryPanelRef>(
  function GenerationHistoryPanel(_, ref) {
  const [history, setHistory] = useState<DbGenerationHistoryWithTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/generation-history');
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Failed to load generation history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Expose refresh method via ref
  useImperativeHandle(ref, () => ({
    refresh: loadHistory,
  }));

  // Load on mount
  useEffect(() => {
    loadHistory();
  }, []);

  /**
   * Truncate query to max length with ellipsis
   */
  const truncateQuery = (query: string, maxLength: number = 60): string => {
    if (query.length <= maxLength) return query;
    return query.slice(0, maxLength) + '...';
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        Loading...
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        No generation history yet.
      </div>
    );
  }

  return (
    <div className="divide-y dark:divide-gray-700">
      {history.map((entry) => (
        <div
          key={entry.id}
          className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Template name */}
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">
                  {entry.template_name || entry.template_id}
                </span>
              </div>

              {/* Query snippet */}
              <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 truncate">
                {truncateQuery(entry.query)}
              </div>
            </div>

            {/* Relative time */}
            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
              <Clock className="w-3 h-3" />
              <span>{formatRelativeTime(entry.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});
