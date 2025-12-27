/**
 * AutomationPanel Component
 * Compact icon-based controls for the standup automation system
 */

'use client';

import { useAutomation } from '../hooks';
import { AutomationControls } from './AutomationControls';
import {
  IntervalSelector,
  AutonomySelector,
  StrategySelector,
} from './ConfigSelectors';
import { AutomationStats } from './AutomationStats';
import { StatusMessages } from './StatusMessages';
import GoalCandidatesModal from './GoalCandidatesModal';

export default function AutomationPanel() {
  const {
    status,
    config,
    isLoading,
    isRunning,
    isGenerating,
    error,
    successMessage,
    projectCandidates,
    showCandidatesModal,
    handleStart,
    handleStop,
    handleRunNow,
    handleGenerateGoals,
    handleConfigUpdate,
    handleAcceptCandidates,
    setError,
    clearCandidates,
  } = useAutomation();

  if (isLoading) {
    return (
      <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 px-4 py-3">
      {/* Single Row Config Panel */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Status & Controls */}
        <AutomationControls
          status={status}
          isRunning={isRunning}
          isGenerating={isGenerating}
          onStart={handleStart}
          onStop={handleStop}
          onRunNow={handleRunNow}
          onGenerateGoals={handleGenerateGoals}
        />

        <div className="w-px h-6 bg-gray-700" />

        {/* Interval Selection */}
        <IntervalSelector
          currentInterval={config?.intervalMinutes}
          onSelect={(value) => handleConfigUpdate({ intervalMinutes: value })}
        />

        <div className="w-px h-6 bg-gray-700" />

        {/* Autonomy Level */}
        <AutonomySelector
          currentLevel={config?.autonomyLevel}
          onSelect={(level) => handleConfigUpdate({ autonomyLevel: level })}
        />

        <div className="w-px h-6 bg-gray-700" />

        {/* Strategy */}
        <StrategySelector
          currentStrategy={config?.strategy}
          onSelect={(strategy) => handleConfigUpdate({ strategy })}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stats and Status */}
        <AutomationStats status={status} />
      </div>

      {/* Status messages */}
      <StatusMessages
        error={error}
        successMessage={successMessage}
        onClearError={() => setError(null)}
      />

      {/* Goal Candidates Review Modal */}
      <GoalCandidatesModal
        isOpen={showCandidatesModal}
        onClose={clearCandidates}
        projectCandidates={projectCandidates}
        onAccept={handleAcceptCandidates}
      />
    </div>
  );
}
