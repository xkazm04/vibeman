'use client';

import React, { forwardRef } from 'react';
import { Network } from 'lucide-react';
import type { Workspace } from '@/stores/workspaceStore';
import BatchProjectOnboarding from '../sub_WorkspaceArchitecture/components/BatchProjectOnboarding';

interface MatrixEmptyStateProps {
  activeWorkspace: Workspace | null;
  onBatchOnboarding?: (prompt: string, onboardingId: string) => void;
  onRefresh: () => void;
}

const MatrixEmptyState = forwardRef<HTMLDivElement, MatrixEmptyStateProps>(
  ({ activeWorkspace, onBatchOnboarding, onRefresh }, ref) => {
    const handleBatchOnboarding = (
      prompt: string,
      folders: Array<{ name: string; path: string; selected: boolean }>
    ) => {
      if (!activeWorkspace || !onBatchOnboarding) return;
      const onboardingId = `onboard-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      onBatchOnboarding(prompt, onboardingId);
    };

    // If workspace has base_path, show batch onboarding option
    if (activeWorkspace?.base_path && onBatchOnboarding) {
      return (
        <div
          ref={ref}
          className="relative w-full h-full bg-[#0a0a0c] flex items-center justify-center"
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

    // Default empty state
    return (
      <div
        ref={ref}
        className="relative w-full h-full bg-[#0a0a0c] flex items-center justify-center"
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
  }
);

MatrixEmptyState.displayName = 'MatrixEmptyState';

export default MatrixEmptyState;
