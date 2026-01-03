/**
 * StandupPanel Component
 * Integrated standup automation panel for GoalHub
 */

'use client';

import { useCallback, lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { StandupHeader } from '../../Standup/components/StandupHeader';
import { ControlToolbar } from '../../Standup/components/ControlToolbar';
import { StatusMessages } from '../../Standup/components/StatusMessages';
import { useStandupAutomation } from '../../Standup/hooks/useStandupAutomation';

// Lazy load heavy components
const SessionDashboard = lazy(() => import('../../Standup/components/SessionDashboard'));
const CandidatesTable = lazy(() => import('./CandidatesTable'));

interface StandupPanelProps {
  projectId: string;
  projectName: string;
  projectPath: string;
  onGoalCreated?: () => void;
}

function LoadingPlaceholder() {
  return <div className="h-24 animate-pulse bg-gray-800/30 rounded-lg" />;
}

export default function StandupPanel({
  projectId,
  projectName,
  projectPath,
  onGoalCreated,
}: StandupPanelProps) {
  const {
    status,
    config,
    isLoading,
    isRunning,
    error,
    successMessage,
    handleStart,
    handleStop,
    handleRunNow,
    handleConfigUpdate,
    clearError,
  } = useStandupAutomation({ projectId, projectPath, projectName });

  const handleCandidateAccepted = useCallback(() => {
    onGoalCreated?.();
  }, [onGoalCreated]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        <span className="ml-2 text-gray-400">Loading automation...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StandupHeader projectName={projectName} />
      <StatusMessages error={error} successMessage={successMessage} onClearError={clearError} />
      <ControlToolbar
        status={status}
        config={config}
        isRunning={isRunning}
        isGenerating={false}
        onStart={handleStart}
        onStop={handleStop}
        onRunNow={handleRunNow}
        onConfigUpdate={handleConfigUpdate}
      />
      <Suspense fallback={<LoadingPlaceholder />}>
        <SessionDashboard />
      </Suspense>
      <Suspense fallback={<LoadingPlaceholder />}>
        <CandidatesTable projectId={projectId} onCandidateAccepted={handleCandidateAccepted} />
      </Suspense>
    </div>
  );
}
