/**
 * Live Task Activity Hook
 *
 * Provides real-time agent activity for a running task card.
 * Correlates task ID with CLI sessions to extract phase + last message.
 * Only activates when the task is in 'running' status.
 */

'use client';

import { useMemo } from 'react';
import { useCLISessionStore } from '@/components/cli/store/cliSessionStore';
import { useManualSessionStore } from '../store/manualSessionStore';
import { useExecutionStream } from './useExecutionStream';
import type { TaskPhase } from '../lib/constants';

export interface LiveTaskActivity {
  lastMessage: string | null;
  phase: TaskPhase;
  isConnected: boolean;
}

const PHASE_COLORS: Record<string, string> = {
  analyzing: 'bg-blue-400',
  planning: 'bg-violet-400',
  implementing: 'bg-emerald-400',
  validating: 'bg-amber-400',
  idle: 'bg-gray-400',
};

export function getPhaseColor(phase: TaskPhase): string {
  return PHASE_COLORS[phase] ?? PHASE_COLORS.idle;
}

export function useLiveTaskActivity(
  requirementId: string,
  statusType: string,
): LiveTaskActivity {
  const isRunning = statusType === 'running';

  // Find automated CLI session running this task
  const matchingSessionTaskId = useCLISessionStore((s) => {
    if (!isRunning) return undefined;
    for (const session of Object.values(s.sessions)) {
      if (session.currentTaskId === requirementId) {
        return requirementId;
      }
    }
    return undefined;
  });

  // Subscribe to execution stream for automated sessions
  const stream = useExecutionStream(matchingSessionTaskId, isRunning && !!matchingSessionTaskId, 5);

  // Check manual sessions for activity on this requirement's project
  const manualActivity = useManualSessionStore((s) => {
    if (!isRunning || matchingSessionTaskId) return null;
    // Find a manual session that's running and has recent assistant events
    for (const session of Object.values(s.sessions)) {
      if (session.status !== 'running') continue;
      // Look for the last assistant event with text
      const lastAssistant = [...session.events]
        .reverse()
        .find(e => e.type === 'assistant');
      if (lastAssistant) {
        const data = lastAssistant.data as Record<string, unknown>;
        const text = typeof data?.text === 'string' ? data.text : null;
        if (text) return text.slice(0, 80);
      }
    }
    return null;
  });

  // Extract last message from stream events
  const lastMessage = useMemo(() => {
    if (manualActivity) return manualActivity;
    if (!isRunning) return null;

    const events = stream.events;
    if (events.length === 0) return null;

    const last = events[events.length - 1];
    if (last.target) {
      return `${last.tool}: ${last.target}`;
    }
    return last.tool;
  }, [isRunning, stream.events, manualActivity]);

  if (!isRunning) {
    return { lastMessage: null, phase: 'idle', isConnected: false };
  }

  return {
    lastMessage,
    phase: stream.phase,
    isConnected: stream.isConnected || !!manualActivity,
  };
}
