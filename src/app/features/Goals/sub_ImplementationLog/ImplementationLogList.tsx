'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import ImplementationLogItem, { type ImplementationLog } from './ImplementationLogItem';

interface ImplementationLogListProps {
  projectId: string;
  limit?: number;
}

export default function ImplementationLogList({
  projectId,
  limit = 10,
}: ImplementationLogListProps) {
  const [logs, setLogs] = useState<ImplementationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  // Fetch logs on mount and when projectId changes
  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      setError(undefined);

      try {
        const response = await fetch(
          `/api/implementation-logs?projectId=${encodeURIComponent(projectId)}&limit=${limit}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch implementation logs');
        }

        const data = await response.json();
        setLogs(data.logs || []);
      } catch (err) {
        console.error('Error fetching implementation logs:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      fetchLogs();
    }
  }, [projectId, limit]);

  const handleToggleTested = async (logId: string, tested: boolean) => {
    try {
      const response = await fetch('/api/implementation-logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: logId, tested }),
      });

      if (!response.ok) {
        throw new Error('Failed to update log');
      }

      // Update local state
      setLogs((prev) =>
        prev.map((log) =>
          log.id === logId ? { ...log, tested: tested ? 1 : 0 } : log
        )
      );
    } catch (err) {
      console.error('Error updating log:', err);
      setError(err instanceof Error ? err.message : 'Failed to update log');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
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

  // Filter to show only untested logs
  const untestedLogs = logs.filter(log => log.tested === 0);
  const untestedCount = untestedLogs.length;

  if (logs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-8"
      >
        <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No implementation logs yet</p>
        <p className="text-sm text-gray-600 mt-1">
          Logs will appear here after Claude Code executes requirements
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4 flex flex-col w-[500px]">
      {/* Header with untested count */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-purple-500/10 rounded-lg border border-purple-500/30">
            <History className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Implementation Logs</h2>
            <p className="text-xs text-gray-400 mt-0.5">Recent implementation tasks</p>
          </div>
        </div>

        {/* Untested Count Badge */}
        {untestedCount > 0 && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg"
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-medium text-amber-400">
              {untestedCount} Untested
            </span>
          </motion.div>
        )}

        {/* All Tested Badge */}
        {untestedCount === 0 && logs.length > 0 && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs font-medium text-green-400">
              All Tested
            </span>
          </motion.div>
        )}
      </div>

      {/* Logs List - Always visible, only showing untested */}
      <div className="space-y-2">
        <AnimatePresence>
          {untestedLogs.map((log) => (
            <ImplementationLogItem
              key={log.id}
              log={log}
              onToggleTested={handleToggleTested}
            />
          ))}
        </AnimatePresence>

        {/* Message if all logs are tested */}
        {untestedCount === 0 && logs.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-6"
          >
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-green-400 font-medium">All tasks have been tested</p>
            <p className="text-xs text-gray-500 mt-1">
              Great work! All {logs.length} implementation{logs.length !== 1 ? 's' : ''} marked as tested
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
