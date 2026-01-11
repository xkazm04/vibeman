/**
 * Activity Feed Component
 * Shows implementation logs and activity related to the project/goal
 * Features infinite scroll loading
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  FileCode,
  CheckCircle2,
  Clock,
  ChevronRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type { EnrichedImplementationLog } from '@/app/features/Manager/lib/types';

const PAGE_SIZE = 20;

interface ActivityFeedProps {
  projectId: string;
}

export default function ActivityFeed({ projectId }: ActivityFeedProps) {
  const [logs, setLogs] = useState<EnrichedImplementationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<EnrichedImplementationLog | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async (reset: boolean = true) => {
    if (reset) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    const offset = reset ? 0 : logs.length;

    try {
      const response = await fetch(
        `/api/implementation-logs/untested?projectId=${projectId}&limit=${PAGE_SIZE}&offset=${offset}`
      );
      const data = await response.json();
      if (data.success) {
        if (reset) {
          setLogs(data.data || []);
        } else {
          setLogs((prev) => [...prev, ...(data.data || [])]);
        }
        setHasMore(data.hasMore ?? false);
        setTotal(data.total ?? 0);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [projectId, logs.length]);

  // Initial load
  useEffect(() => {
    fetchLogs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isLoadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const scrollThreshold = 100; // pixels from bottom

    if (scrollHeight - scrollTop - clientHeight < scrollThreshold) {
      fetchLogs(false);
    }
  }, [fetchLogs, isLoadingMore, hasMore]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-900/60 backdrop-blur-sm border border-gray-800/80 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Recent Activity</h3>
            <p className="text-xs text-gray-500">
              Showing {logs.length} of {total} activities
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchLogs(true)}
          className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      {logs.length === 0 ? (
        <div className="relative overflow-hidden text-center py-16 bg-gradient-to-b from-gray-900/60 to-gray-900/30 backdrop-blur-sm border border-gray-800/80 rounded-2xl">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-700/50 shadow-xl">
              <Activity className="w-8 h-8 text-gray-500" />
            </div>
            <h4 className="text-lg font-medium text-gray-300 mb-2">No Recent Activity</h4>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Implementation logs will appear here as you work on your goals
            </p>
          </div>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar"
        >
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900/50 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
            >
              <button
                onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="p-2 bg-cyan-500/10 rounded-lg">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-white truncate">
                        {log.title || log.requirement_name || 'Implementation'}
                      </h4>
                      {log.tested === 1 && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {log.overview || 'No summary available'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(log.created_at)}
                      </span>
                      {log.context_name && (
                        <span className="px-1.5 py-0.5 bg-gray-800 rounded">
                          {log.context_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expand Icon */}
                  <ChevronRight
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      selectedLog?.id === log.id ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Expanded Details */}
              <AnimatePresence>
                {selectedLog?.id === log.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-800 overflow-hidden"
                  >
                    <div className="p-4 space-y-3">
                      {/* Full Overview */}
                      {log.overview && (
                        <div>
                          <label className="text-xs text-gray-500 uppercase tracking-wider">
                            Overview
                          </label>
                          <p className="text-sm text-gray-300 mt-1">{log.overview}</p>
                        </div>
                      )}

                      {/* Overview Bullets */}
                      {log.overview_bullets && (
                        <div>
                          <label className="text-xs text-gray-500 uppercase tracking-wider">
                            Details
                          </label>
                          <p className="text-sm text-gray-300 mt-1 whitespace-pre-line">{log.overview_bullets}</p>
                        </div>
                      )}

                      {/* Link to Full Log */}
                      <div className="pt-2">
                        <button
                          onClick={() => {
                            // TODO: Open full log viewer
                          }}
                          className="text-xs text-cyan-400 hover:text-cyan-300"
                        >
                          View Full Log
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}

          {/* Loading More Indicator */}
          {isLoadingMore && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Loading more...</span>
            </div>
          )}

          {/* End of List Indicator */}
          {!hasMore && logs.length > 0 && (
            <div className="text-center py-4 text-xs text-gray-600">
              All activities loaded
            </div>
          )}
        </div>
      )}
    </div>
  );
}
