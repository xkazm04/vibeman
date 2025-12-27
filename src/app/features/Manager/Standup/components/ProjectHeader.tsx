/**
 * ProjectHeader Component
 * Header with project info and server/add goal actions
 */

'use client';

import { useState, useCallback } from 'react';
import {
  Target,
  Plus,
  Play,
  ExternalLink,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface ProjectHeaderProps {
  projectName: string;
  projectPath: string;
  projectType?: string;
  projectId: string;
  onAddGoal: () => void;
}

export function ProjectHeader({
  projectName,
  projectPath,
  projectType,
  projectId,
  onAddGoal,
}: ProjectHeaderProps) {
  const [isStartingServer, setIsStartingServer] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);

  const isNextJsProject = projectType === 'nextjs' || projectType === 'react';

  const handleStartServer = useCallback(async () => {
    setIsStartingServer(true);
    setServerError(null);
    setServerUrl(null);

    try {
      const response = await fetch('/api/server/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        let errorMessage = data.error || 'Failed to start server';
        if (data.stage === 'kill') {
          errorMessage = `Failed to kill existing process: ${data.error}`;
        } else if (data.stage === 'start') {
          errorMessage = `Unable to start server: ${data.error}`;
        }
        setServerError(errorMessage);
        return;
      }

      setServerUrl(data.url);
      setTimeout(() => {
        window.open(data.url, '_blank');
      }, 500);
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'Failed to start server'
      );
    } finally {
      setIsStartingServer(false);
    }
  }, [projectId]);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gray-800 rounded-xl border border-gray-700">
          <Target className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{projectName}</h2>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-500">{projectPath}</p>
            {projectType && (
              <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">
                {projectType}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Run Server Button - Only for Next.js projects */}
        {isNextJsProject && (
          <div className="flex flex-col items-end">
            {serverError && (
              <div className="flex items-center gap-1.5 mb-2 text-xs text-red-400 max-w-[250px]">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{serverError}</span>
              </div>
            )}
            <button
              onClick={handleStartServer}
              disabled={isStartingServer}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                serverError
                  ? 'bg-red-500/20 text-red-300 border-2 border-red-500/60 hover:bg-red-500/30'
                  : serverUrl
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isStartingServer ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting...
                </>
              ) : serverUrl ? (
                <>
                  <ExternalLink className="w-4 h-4" />
                  Open Preview
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Server
                </>
              )}
            </button>
          </div>
        )}

        <button
          onClick={onAddGoal}
          className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg border border-purple-500/40 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Goal
        </button>
      </div>
    </div>
  );
}
