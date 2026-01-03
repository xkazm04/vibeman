/**
 * ServerControlBar Component
 * Thin row panel with server start/stop controls
 */

'use client';

import { Play, Square, ExternalLink, Loader2, AlertCircle, Server } from 'lucide-react';
import { useServerControl } from '../hooks/useServerControl';

interface ServerControlBarProps {
  projectId: string;
  projectPath: string;
  projectType?: string;
}

export function ServerControlBar({
  projectId,
  projectPath,
  projectType,
}: ServerControlBarProps) {
  const { serverState, isLoading, startServer, stopServer, openInBrowser } =
    useServerControl(projectId, projectPath, projectType);

  const isNextJsOrReact = projectType === 'nextjs' || projectType === 'react';

  // Only show for Next.js/React projects
  if (!isNextJsOrReact) {
    return null;
  }

  const isRunning = serverState.status === 'running';
  const isStopped = serverState.status === 'stopped' || serverState.status === 'unknown';
  const isStarting = serverState.status === 'starting';
  const isStopping = serverState.status === 'stopping';
  const hasError = serverState.status === 'error';

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800/40 border-b border-gray-700/30">
      <div className="flex items-center gap-2">
        <Server className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">Dev Server</span>

        {/* Status indicator */}
        <div className="flex items-center gap-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isRunning
                ? 'bg-emerald-400 animate-pulse'
                : hasError
                ? 'bg-red-400'
                : isStarting || isStopping
                ? 'bg-yellow-400 animate-pulse'
                : 'bg-gray-600'
            }`}
          />
          <span
            className={`text-[10px] ${
              isRunning
                ? 'text-emerald-400'
                : hasError
                ? 'text-red-400'
                : isStarting || isStopping
                ? 'text-yellow-400'
                : 'text-gray-500'
            }`}
          >
            {isRunning && `localhost:${serverState.port || 3001}`}
            {isStopped && 'Stopped'}
            {isStarting && 'Starting...'}
            {isStopping && 'Stopping...'}
            {hasError && 'Error'}
          </span>
        </div>

        {/* Error message */}
        {hasError && serverState.error && (
          <div className="flex items-center gap-1 text-[10px] text-red-400">
            <AlertCircle className="w-3 h-3" />
            <span className="truncate max-w-[150px]">{serverState.error}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {/* Start button */}
        {(isStopped || hasError) && (
          <button
            onClick={startServer}
            disabled={isLoading}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 rounded border border-emerald-500/30 transition-colors disabled:opacity-50"
            title="Start dev server on localhost:3001"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            <span>Start</span>
          </button>
        )}

        {/* Starting indicator */}
        {isStarting && (
          <div className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-yellow-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Starting...</span>
          </div>
        )}

        {/* Running controls */}
        {isRunning && (
          <>
            <button
              onClick={openInBrowser}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-blue-400 bg-blue-500/15 hover:bg-blue-500/25 rounded border border-blue-500/30 transition-colors"
              title="Open in browser"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Open</span>
            </button>
            <button
              onClick={stopServer}
              disabled={isLoading}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-red-400 bg-red-500/15 hover:bg-red-500/25 rounded border border-red-500/30 transition-colors disabled:opacity-50"
              title="Stop dev server"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Square className="w-3 h-3" />
              )}
              <span>Stop</span>
            </button>
          </>
        )}

        {/* Stopping indicator */}
        {isStopping && (
          <div className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-yellow-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Stopping...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ServerControlBar;
