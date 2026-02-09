/**
 * CrossContextDetail Component
 * Slide-out panel showing implementation logs that span two specific contexts,
 * with status and duration for each.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, XCircle, Clock, ArrowRight } from 'lucide-react';
import type { ContextGroup } from '@/stores/contextStore';

interface LogEntry {
  id: string;
  title: string;
  requirement_name: string;
  overview: string;
  tested: number;
  created_at: string;
  context_name: string | null;
}

interface CrossContextDetailProps {
  sourceGroup: ContextGroup | undefined;
  targetGroup: ContextGroup | undefined;
  logIds: string[];
  successRate: number;
  totalCount: number;
  onClose: () => void;
}

export default function CrossContextDetail({
  sourceGroup,
  targetGroup,
  logIds,
  successRate,
  totalCount,
  onClose,
}: CrossContextDetailProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        // Fetch individual log details
        const fetched: LogEntry[] = [];
        for (const logId of logIds.slice(0, 20)) {
          const res = await fetch(`/api/implementation-logs/${logId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
              fetched.push(data.data);
            }
          }
        }
        setLogs(fetched);
      } catch (err) {
        console.error('Error fetching cross-context logs:', err);
      } finally {
        setLoading(false);
      }
    };

    if (logIds.length > 0) {
      fetchLogs();
    } else {
      setLogs([]);
      setLoading(false);
    }
  }, [logIds]);

  const getSuccessColor = () => {
    if (successRate > 0.8) return 'text-green-400';
    if (successRate >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSuccessBg = () => {
    if (successRate > 0.8) return 'bg-green-500/10 border-green-500/30';
    if (successRate >= 0.5) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute right-0 top-0 h-full w-[480px] max-w-full bg-gray-900 border-l border-gray-700 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-800 bg-gray-900/95">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Cross-Context Flow</h3>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Context pair header */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className="px-2 py-1 rounded-md text-xs font-medium border"
                style={{
                  backgroundColor: `${sourceGroup?.color || '#6b7280'}15`,
                  borderColor: `${sourceGroup?.color || '#6b7280'}40`,
                  color: sourceGroup?.color || '#9ca3af',
                }}
              >
                {sourceGroup?.name || 'Unknown'}
              </div>
              <ArrowRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <div
                className="px-2 py-1 rounded-md text-xs font-medium border"
                style={{
                  backgroundColor: `${targetGroup?.color || '#6b7280'}15`,
                  borderColor: `${targetGroup?.color || '#6b7280'}40`,
                  color: targetGroup?.color || '#9ca3af',
                }}
              >
                {targetGroup?.name || 'Unknown'}
              </div>
            </div>

            {/* Stats row */}
            <div className={`flex items-center gap-4 p-2 rounded-lg border ${getSuccessBg()}`}>
              <div className="text-center">
                <div className="text-lg font-bold text-white font-mono">{totalCount}</div>
                <div className="text-[10px] text-gray-400 uppercase">Total</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold font-mono ${getSuccessColor()}`}>
                  {Math.round(successRate * 100)}%
                </div>
                <div className="text-[10px] text-gray-400 uppercase">Success</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white font-mono">{logIds.length}</div>
                <div className="text-[10px] text-gray-400 uppercase">Logs</div>
              </div>
            </div>
          </div>

          {/* Log list */}
          <div className="overflow-y-auto h-[calc(100%-200px)] p-3 space-y-2">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && logs.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm">No implementation logs found</p>
              </div>
            )}

            {!loading &&
              logs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg border border-gray-800 bg-gray-800/40 hover:bg-gray-800/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-medium text-white leading-tight line-clamp-2">
                      {log.title}
                    </h4>
                    {log.tested ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2 mb-2">{log.overview}</p>
                  <div className="flex items-center gap-3 text-[10px] text-gray-500">
                    <span className="font-mono">{log.requirement_name}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </motion.div>
              ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
