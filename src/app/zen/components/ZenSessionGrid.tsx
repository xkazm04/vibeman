'use client';

import { useCLISessionStore, type CLISessionId } from '@/components/cli/store';
import { ZenSessionPanel } from './ZenSessionPanel';

const SESSION_IDS: CLISessionId[] = ['cliSession1', 'cliSession2', 'cliSession3', 'cliSession4'];

/**
 * Zen Session Grid
 *
 * 2x2 grid of CLI session panels for monitoring parallel executions.
 */
export function ZenSessionGrid() {
  const sessions = useCLISessionStore((state) => state.sessions);

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      {SESSION_IDS.map((sessionId, index) => (
        <ZenSessionPanel
          key={sessionId}
          sessionId={sessionId}
          session={sessions[sessionId]}
          index={index}
        />
      ))}
    </div>
  );
}
