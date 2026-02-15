'use client';

import { Wifi, WifiOff, Power } from 'lucide-react';
import { useZenStore } from '../lib/zenStore';
import { useCLISessionStore } from '@/components/cli/store';
import { cn } from '@/lib/utils';
import { zen, zenSpacing } from '../lib/zenTheme';

/**
 * Zen Status Bar
 *
 * Shows zen mode toggle, session summary, and connection status.
 */
export function ZenStatusBar() {
  const { mode, setMode, isConnected } = useZenStore();
  const sessions = useCLISessionStore((state) => state.sessions);

  const activeSessions = Object.values(sessions).filter(s => s.isRunning).length;
  const totalQueued = Object.values(sessions).reduce(
    (sum, s) => sum + s.queue.filter(t => t.status === 'pending').length,
    0
  );

  const toggleMode = () => {
    setMode(mode === 'online' ? 'offline' : 'online');
  };

  return (
    <div className={`flex items-center justify-between px-6 py-3 border-b ${zen.surfaceDivider} bg-gray-950/50 shrink-0`}>
      {/* Left: Mode Toggle */}
      <button
        onClick={toggleMode}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
          mode === 'online'
            ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
        )}
      >
        <Power className="w-4 h-4" />
        <span className="text-sm font-medium">
          {mode === 'online' ? 'Zen Mode Active' : 'Zen Mode Off'}
        </span>
      </button>

      {/* Center: Session Status */}
      <div className={`flex items-center ${zenSpacing.gapSection} text-xs text-gray-400`}>
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "font-medium",
            activeSessions > 0 ? "text-green-400" : "text-gray-500"
          )}>
            {activeSessions}
          </span>
          <span>running</span>
        </div>
        <span className="text-gray-400">|</span>
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "font-medium",
            totalQueued > 0 ? "text-amber-400" : "text-gray-500"
          )}>
            {totalQueued}
          </span>
          <span>queued</span>
        </div>
      </div>

      {/* Right: Connection Status */}
      <div className="flex items-center gap-2 text-xs">
        {mode === 'online' ? (
          isConnected ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400">Connected</span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-amber-400">Connecting...</span>
            </>
          )
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-gray-500">Offline</span>
          </>
        )}
      </div>
    </div>
  );
}
