'use client';

import { useState } from 'react';
import { DbPersonaExecution } from '@/app/features/Personas/lib/types';
import { ChevronDown, ChevronRight, Clock, Calendar, FileText, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExecutionDetailProps {
  execution: DbPersonaExecution;
}

const STATUS_COLORS: Record<string, string> = {
  queued: 'bg-secondary/60 text-muted-foreground/60 border border-border/30',
  running: 'bg-primary/15 text-primary border border-primary/30',
  completed: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  failed: 'bg-red-500/15 text-red-400 border border-red-500/20',
  cancelled: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
};

export function ExecutionDetail({ execution }: ExecutionDetailProps) {
  const [showInputData, setShowInputData] = useState(false);
  const [showOutputData, setShowOutputData] = useState(false);

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  };

  const formatJson = (data: any) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1.5">
          <div className="text-[11px] font-mono text-muted-foreground/40 uppercase tracking-wider">Status</div>
          <div>
            <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium ${STATUS_COLORS[execution.status]}`}>
              {execution.status}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-[11px] font-mono text-muted-foreground/40 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Duration
          </div>
          <div className="text-sm text-foreground font-mono">
            {formatDuration(execution.duration_ms)}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-[11px] font-mono text-muted-foreground/40 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Started
          </div>
          <div className="text-sm text-foreground">
            {formatTimestamp(execution.started_at)}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-[11px] font-mono text-muted-foreground/40 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Completed
          </div>
          <div className="text-sm text-foreground">
            {formatTimestamp(execution.completed_at)}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {execution.error_message && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-mono font-medium text-red-400 mb-1.5 uppercase tracking-wider">Error</div>
              <pre className="text-xs text-red-300/80 whitespace-pre-wrap break-words font-mono">
                {execution.error_message}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Input Data */}
      {execution.input_data && Object.keys(execution.input_data).length > 0 && (
        <div>
          <button
            onClick={() => setShowInputData(!showInputData)}
            className="flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors mb-2"
          >
            {showInputData ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Input Data
          </button>

          <AnimatePresence>
            {showInputData && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <pre className="p-4 bg-background/50 border border-border/30 rounded-xl text-xs text-foreground/70 overflow-x-auto font-mono">
                  {formatJson(execution.input_data)}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Output Data */}
      {execution.output_data && Object.keys(execution.output_data).length > 0 && (
        <div>
          <button
            onClick={() => setShowOutputData(!showOutputData)}
            className="flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors mb-2"
          >
            {showOutputData ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Output Data
          </button>

          <AnimatePresence>
            {showOutputData && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <pre className="p-4 bg-background/50 border border-border/30 rounded-xl text-xs text-foreground/70 overflow-x-auto font-mono">
                  {formatJson(execution.output_data)}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Log File */}
      {execution.log_file_path && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground/40">
          <FileText className="w-4 h-4" />
          <span className="font-mono">{execution.log_file_path}</span>
        </div>
      )}
    </div>
  );
}
