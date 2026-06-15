/**
 * BatchProgressBar
 *
 * Live aggregate progress + ETA for an executing batch, shown in the
 * TaskRunner header (finding #3). Counts are derived from the CLI session
 * queues (the authoritative source of in-flight work) and supplemented by
 * the header's own processedCount/totalCount. ETA is computed from the mean
 * duration of completed tasks in the queues.
 */

'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useCLISessionStore } from '@/components/cli/store/cliSessionStore';

interface BatchProgressBarProps {
  /** Whether the header believes a batch is running (local TaskRunner flag) */
  isRunning: boolean;
  /** Tasks processed so far, per the header's own counter */
  processedCount: number;
  /** Total selected/known tasks, per the header */
  totalCount: number;
}

/** Format a millisecond duration as a compact ETA string (e.g. "2m 5s", "45s"). */
function formatEta(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function BatchProgressBar({ isRunning, processedCount, totalCount }: BatchProgressBarProps) {
  const sessions = useCLISessionStore((s) => s.sessions);

  const { total, done, running, failed, etaMs } = useMemo(() => {
    let total = 0;
    let done = 0;
    let running = 0;
    let failed = 0;
    let durationSum = 0;
    let durationSamples = 0;

    for (const session of Object.values(sessions)) {
      for (const task of session.queue) {
        total += 1;
        switch (task.status.type) {
          case 'completed':
            done += 1;
            if (task.startedAt && task.completedAt && task.completedAt > task.startedAt) {
              durationSum += task.completedAt - task.startedAt;
              durationSamples += 1;
            }
            break;
          case 'failed':
            failed += 1;
            break;
          case 'running':
            running += 1;
            break;
        }
      }
    }

    const finished = done + failed;
    const remaining = Math.max(0, total - finished);
    const meanDuration = durationSamples > 0 ? durationSum / durationSamples : 0;
    // Account for parallelism: remaining work is spread across active runners.
    const parallelism = Math.max(1, running);
    const etaMs = meanDuration > 0 ? (remaining * meanDuration) / parallelism : 0;

    return { total, done, running, failed, etaMs };
  }, [sessions]);

  // Prefer queue-derived totals; fall back to the header's own counters.
  const effectiveTotal = total > 0 ? total : totalCount;
  const effectiveDone = total > 0 ? done + failed : processedCount;

  // Show whenever there's active queue work OR the header flagged a run.
  const active = running > 0 || (isRunning && effectiveTotal > 0);

  if (!active || effectiveTotal === 0) return null;

  const ratio = Math.min(1, effectiveDone / effectiveTotal);
  const pct = Math.round(ratio * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-gray-800/40 bg-gray-900/40 px-3 py-2.5 backdrop-blur-sm"
      data-testid="batch-progress-bar"
    >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <Loader2 className="w-3.5 h-3.5 text-purple-400 motion-safe:animate-spin motion-reduce:animate-pulse" />
            <span className="font-medium tabular-nums">
              {effectiveDone} of {effectiveTotal} done
            </span>
            {running > 0 && (
              <>
                <span className="text-gray-600">·</span>
                <span className="text-purple-300 tabular-nums">{running} running</span>
              </>
            )}
            {failed > 0 && (
              <>
                <span className="text-gray-600">·</span>
                <span className="text-red-400 tabular-nums">{failed} failed</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-2xs tabular-nums">
            {etaMs > 0 && (
              <span className="text-gray-400">~{formatEta(etaMs)} left</span>
            )}
            <span className="text-gray-500">{pct}%</span>
          </div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-800/60 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
    </motion.div>
  );
}

export default BatchProgressBar;
