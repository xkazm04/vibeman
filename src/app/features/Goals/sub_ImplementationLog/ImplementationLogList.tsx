'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Loader2, AlertCircle, CheckCircle2, Terminal, ChevronRight } from 'lucide-react';
import ImplementationLogItem, { type ImplementationLog } from './ImplementationLogItem';

interface ImplementationLogListProps {
  projectId: string;
  limit?: number;
}

export default function ImplementationLogList({
  projectId,
  limit = 40,
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
      setError(err instanceof Error ? err.message : 'Failed to update log');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
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

  const untestedLogs = logs.filter(log => log.tested === 0);
  const untestedCount = untestedLogs.length;

  return (
    <div className="w-full font-mono text-sm">
      {/* Terminal Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
        <div className="flex items-center gap-2 text-cyan-400">
          <Terminal className="w-4 h-4" />
          <span className="font-bold tracking-wider">/&gt; EXECUTION_STREAM</span>
        </div>

        <div className="flex items-center gap-3">
          {untestedCount > 0 ? (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded border border-amber-500/30 animate-pulse">
              {untestedCount} PENDING VERIFICATION
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30">
              ALL SYSTEMS NOMINAL
            </span>
          )}
        </div>
      </div>

      {/* Logs Stream */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {untestedLogs.length > 0 ? (
            untestedLogs.map((log, index) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative pl-4 border-l-2 border-white/10 hover:border-cyan-500 transition-colors"
              >
                <div className="absolute left-[-5px] top-2 w-2 h-2 bg-black border border-white/30 rounded-full group-hover:border-cyan-400 group-hover:bg-cyan-400 transition-all" />

                <ImplementationLogItem
                  log={log}
                  onToggleTested={handleToggleTested}
                />
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-white/20"
            >
              <div className="mb-2 text-4xl">_</div>
              <p>No pending operations</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
