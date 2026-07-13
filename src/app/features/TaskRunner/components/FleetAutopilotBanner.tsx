'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PauseCircle, Play } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useFleetAutopilotStore } from '@/components/cli/store/fleetAutopilotStore';
import { resumeFleet } from '@/components/cli/store/cliExecutionManager';

/** Format a millisecond remaining span as `m:ss` (or `s` under a minute). */
function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Fleet-wide banner shown while the rate-limit autopilot has paused all task
 * launches. Displays the cause, a live resume countdown, and how many tasks are
 * held waiting; offers a manual "Resume now" override.
 */
const FleetAutopilotBanner: React.FC = () => {
  const { paused, resumeAt, reason, waitingCount } = useFleetAutopilotStore(
    useShallow((s) => ({
      paused: s.paused,
      resumeAt: s.resumeAt,
      reason: s.reason,
      waitingCount: s.waitingTaskIds.length,
    })),
  );

  // Tick every second so the countdown stays live while paused.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!paused) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [paused]);

  const remainingMs = resumeAt ? resumeAt - now : 0;

  return (
    <AnimatePresence>
      {paused && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <PauseCircle className="w-5 h-5 text-amber-400 flex-shrink-0 motion-safe:animate-pulse" />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-200">
                Fleet paused — {reason || 'rate limit reached'}
              </p>
              <p className="text-xs text-amber-300/70">
                {remainingMs > 0 ? (
                  <>Auto-resume in <span className="font-mono">{formatCountdown(remainingMs)}</span></>
                ) : (
                  'Resuming…'
                )}
                {waitingCount > 0 && (
                  <> · {waitingCount} task{waitingCount === 1 ? '' : 's'} waiting</>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => resumeFleet()}
              className="flex items-center gap-1.5 flex-shrink-0 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-200 transition-colors hover:bg-amber-400/20"
            >
              <Play className="w-3.5 h-3.5" />
              Resume now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FleetAutopilotBanner;
