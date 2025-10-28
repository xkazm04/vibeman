'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Loader2, AlertCircle } from 'lucide-react';
import ImplementationLogItem, { type ImplementationLog } from './ImplementationLogItem';

interface ImplementationLogListProps {
  projectId: string;
  limit?: number;
}

export default function ImplementationLogList({
  projectId,
  limit = 5,
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
    <div className="space-y-3">
      <AnimatePresence>
        {logs.map((log) => (
          <ImplementationLogItem
            key={log.id}
            log={log}
            onToggleTested={handleToggleTested}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
