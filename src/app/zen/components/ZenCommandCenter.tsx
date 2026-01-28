'use client';

import { ZenStatusBar } from './ZenStatusBar';
import { ZenSessionGrid } from './ZenSessionGrid';
import { ZenEventSidebar } from './ZenEventSidebar';

/**
 * Zen Command Center
 *
 * Main layout component for the Zen monitoring interface.
 * Features:
 * - Status bar with mode toggle and connection status
 * - 2x2 CLI session grid for parallel execution monitoring
 * - Event sidebar showing recent activity
 * - Footer with keyboard hint
 */
export function ZenCommandCenter() {
  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Status Bar */}
      <ZenStatusBar />

      {/* Main Content: Session Grid + Event Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* CLI Session Grid (2x2) */}
        <div className="flex-1 p-4 overflow-hidden">
          <ZenSessionGrid />
        </div>

        {/* Event Sidebar */}
        <div className="w-80 border-l border-gray-800 flex flex-col bg-gray-900/30 shrink-0">
          <ZenEventSidebar />
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-gray-800 flex items-center justify-center shrink-0">
        <span className="text-xs text-gray-600">
          Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded mx-1 text-gray-400">Esc</kbd> to exit Zen Mode
        </span>
      </div>
    </div>
  );
}
