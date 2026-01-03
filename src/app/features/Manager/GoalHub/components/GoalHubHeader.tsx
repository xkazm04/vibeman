/**
 * GoalHubHeader Component
 * Header section with view mode toggle
 */

'use client';

import { Target, Sparkles } from 'lucide-react';

type ViewMode = 'goals' | 'standup';

interface GoalHubHeaderProps {
  projectName: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  children?: React.ReactNode;
}

export default function GoalHubHeader({
  projectName,
  viewMode,
  onViewModeChange,
  children,
}: GoalHubHeaderProps) {
  return (
    <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-xl border border-cyan-500/30">
              <Target className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Goal Hub
              </h1>
              <p className="text-sm text-gray-500">
                {projectName} - Goal-driven development
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 ml-4 bg-gray-800/50 rounded-lg p-1">
              <button
                onClick={() => onViewModeChange('goals')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'goals'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Target className="w-4 h-4" />
                Goals
              </button>
              <button
                onClick={() => onViewModeChange('standup')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'standup'
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Standup
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
