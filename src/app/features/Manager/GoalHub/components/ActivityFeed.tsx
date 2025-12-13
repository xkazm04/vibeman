/**
 * Activity Feed Component
 * Shows implementation logs and activity related to the project/goal
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface ActivityFeedProps {
  projectId: string;
}

export default function ActivityFeed({ projectId }: ActivityFeedProps) {
  const [logs, setLogs] = useState<EnrichedImplementationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<EnrichedImplementationLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/implementation-logs/untested?projectId=${projectId}`
      );
      const data = await response.json();
      if (data.success) {
        setLogs(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-white">Recent Activity</h3>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
            {logs.length}
          </span>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      {logs.length === 0 ? (
        <div className="text-center py-12 bg-gray-900/30 border border-gray-800 rounded-xl">
          <Activity className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <h4 className="text-gray-300 font-medium mb-1">No Recent Activity</h4>
          <p className="text-sm text-gray-500">
            Implementation logs will appear here as you work
          </p>
        </div>
      ) : (
        <div className="space-y-2">
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
        </div>
      )}
    </div>
  );
}
