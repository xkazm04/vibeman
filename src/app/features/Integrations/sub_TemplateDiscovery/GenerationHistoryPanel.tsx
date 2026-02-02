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
      <div className="p-6 text-center text-gray-400">
        <div className="animate-pulse">Loading history...</div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-6 text-center">
        <Clock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
        <p className="text-sm text-gray-400">No generation history yet</p>
        <p className="text-xs text-gray-500 mt-1">Generate a prompt to see it here</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/5">
      {history.map((entry) => (
        <div
          key={entry.id}
          className="p-4 hover:bg-white/5 transition-colors duration-200"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Template name with icon */}
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-100 truncate">
                  {entry.template_name || entry.template_id}
                </span>
              </div>

              {/* Query snippet */}
              <p className="mt-1 text-sm text-gray-400 truncate">
                {truncateQuery(entry.query)}
              </p>
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0">
              <Clock className="w-3 h-3" />
              <span>{formatRelativeTime(entry.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});
