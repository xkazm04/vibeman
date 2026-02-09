'use client';

import React, { forwardRef } from 'react';
import { Loader2, AlertCircle, RefreshCw, Network } from 'lucide-react';
import type { DbWorkspace } from '@/app/db/models/types';
import BatchProjectOnboarding from '../sub_WorkspaceArchitecture/components/BatchProjectOnboarding';
import { archTheme } from './lib/archTheme';

type MatrixStateProps =
  | { variant: 'loading'; message?: string }
  | { variant: 'error'; error: string; onRetry: () => void }
  | {
      variant: 'empty';
      activeWorkspace: DbWorkspace | null;
      onBatchOnboarding?: (prompt: string, onboardingId: string) => void;
      onRefresh: () => void;
    };

const MatrixState = forwardRef<HTMLDivElement, MatrixStateProps>((props, ref) => {
  if (props.variant === 'loading') {
    return (
      <div
        ref={ref}
        className="relative w-full h-full flex items-center justify-center"
        style={{ backgroundColor: archTheme.surface.canvas }}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-sm text-zinc-500">
            {props.message ?? 'Loading architecture data...'}
          </span>
        </div>
      </div>
    );
  }

  if (props.variant === 'error') {
    return (
      <div
        ref={ref}
        className="relative w-full h-full flex items-center justify-center"
        style={{ backgroundColor: archTheme.surface.canvas }}
      >
        <div className="flex flex-col items-center gap-4 max-w-md text-center px-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-zinc-300 mb-2">
              Failed to Load Architecture
            </h3>
            <p className="text-sm text-zinc-500 mb-4">{props.error}</p>
            <button
              onClick={props.onRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // variant === 'empty'
  const { activeWorkspace, onBatchOnboarding, onRefresh } = props;

  const handleBatchOnboarding = (
    prompt: string,
    _folders: Array<{ name: string; path: string; selected: boolean }>
  ) => {
    if (!activeWorkspace || !onBatchOnboarding) return;
    const onboardingId = `onboard-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    onBatchOnboarding(prompt, onboardingId);
  };

  if (activeWorkspace?.base_path && onBatchOnboarding) {
    return (
      <div
        ref={ref}
        className="relative w-full h-full flex items-center justify-center"
        style={{ backgroundColor: archTheme.surface.canvas }}
      >
        <div className="flex flex-col items-center gap-6 px-6">
          <div className="text-center mb-2">
            <h3 className="text-lg font-medium text-zinc-300 mb-2">
              Batch Add Projects to {activeWorkspace.name}
            </h3>
            <p className="text-sm text-zinc-500">
              Select folders to add as projects using Claude Code
            </p>
          </div>
          <BatchProjectOnboarding
            workspaceId={activeWorkspace.id}
            workspaceName={activeWorkspace.name}
            basePath={activeWorkspace.base_path}
            onStartOnboarding={handleBatchOnboarding}
            onRefresh={onRefresh}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="relative w-full h-full flex items-center justify-center"
      style={{ backgroundColor: archTheme.surface.canvas }}
    >
      <div className="flex flex-col items-center gap-4 max-w-md text-center px-6">
        <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center">
          <Network className="w-8 h-8 text-zinc-500" />
        </div>
        <div>
          <h3 className="text-lg font-medium text-zinc-300 mb-2">
            No Projects in Workspace
          </h3>
          <p className="text-sm text-zinc-500 mb-4">
            Add projects to this workspace to visualize their architecture and
            discover cross-project connections.
          </p>
        </div>
        {/* Ghosted example preview */}
        <div className="w-full max-w-xs opacity-30 pointer-events-none">
          <div className="flex items-center justify-center gap-8 mb-6">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-lg bg-cyan-500/20 border border-cyan-500/30" />
              <span className="text-xs text-zinc-600 mt-1">Frontend</span>
            </div>
            <div className="w-8 h-0.5 bg-zinc-700" />
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-lg bg-violet-500/20 border border-violet-500/30" />
              <span className="text-xs text-zinc-600 mt-1">Backend</span>
            </div>
          </div>
          <p className="text-xs text-zinc-600 text-center">
            Architecture visualization will appear here
          </p>
        </div>
      </div>
    </div>
  );
});

MatrixState.displayName = 'MatrixState';

export default MatrixState;
