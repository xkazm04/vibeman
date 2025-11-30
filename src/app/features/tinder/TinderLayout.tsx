'use client';

import React, { useState, useEffect } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useUnifiedProjectStore } from '@/stores/unifiedProjectStore';
import ProjectToolbar, { ToolbarAction } from '@/components/ui/ProjectToolbar';
import TinderContent from '@/app/features/tinder/components/TinderContent';
import TestModeControls from '@/app/features/tinder/components/TestModeControls';
import { useTinderIdeas, useTinderKeyboardShortcuts } from '@/app/features/tinder/lib/tinderHooks';
import { useTestMode, useTestModeIdeas } from '@/app/features/tinder/lib/useTestMode';
import { fetchContextsForProjects } from '@/app/features/Ideas/lib/contextLoader';
import { Context } from '@/lib/queries/contextQueries';

const TinderLayout = () => {
  const { initializeProjects, projects } = useProjectConfigStore();
  const { selectedProjectId } = useUnifiedProjectStore();
  const [contextsMap, setContextsMap] = React.useState<Record<string, Context[]>>({});

  // Test mode hooks
  const testMode = useTestMode();
  const testModeIdeas = useTestModeIdeas();

  // Initialize projects on mount
  useEffect(() => {
    initializeProjects();
  }, [initializeProjects]);

  // Load contexts for all projects
  useEffect(() => {
    const loadContexts = async () => {
      const projectIds = projects.map(p => p.id);
      if (projectIds.length > 0) {
        const contexts = await fetchContextsForProjects(projectIds);
        setContextsMap(contexts);
      }
    };
    loadContexts();
  }, [projects]);

  // Use the custom hook for tinder functionality (real mode)
  const realModeIdeas = useTinderIdeas(selectedProjectId);

  // Select data source based on test mode
  const {
    ideas,
    currentIndex,
    currentIdea,
    loading,
    processing,
    stats,
    remainingCount,
    handleAccept,
    handleReject,
    handleDelete,
    resetStats,
    loadIdeas,
  } = testMode.isTestMode ? testModeIdeas : realModeIdeas;

  // Setup keyboard shortcuts
  useTinderKeyboardShortcuts(handleAccept, handleReject, !processing);

  const handleStartOver = () => {
    resetStats();
    loadIdeas();
  };

  // Toolbar actions
  const toolbarActions: ToolbarAction[] = React.useMemo(() => [
    {
      icon: Database,
      label: 'Sync ideas',
      onClick: async () => {
        await loadIdeas();
      },
      colorScheme: 'blue',
      tooltip: 'Refresh ideas from database',
    },
    {
      icon: RefreshCw,
      label: 'Reload',
      onClick: () => {
        resetStats();
        loadIdeas();
      },
      colorScheme: 'green',
      tooltip: 'Reset and reload all ideas',
    },
  ], [loadIdeas, resetStats]);

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Test Mode Controls - Only visible when test mode is enabled */}
      {testMode.isTestMode && (
        <TestModeControls
          testMode={testMode}
          stats={stats}
          remainingCount={remainingCount}
          onReload={loadIdeas}
        />
      )}

      <TinderContent
        ideas={ideas}
        currentIndex={currentIndex}
        currentIdea={currentIdea}
        loading={loading}
        processing={processing}
        onAccept={handleAccept}
        onReject={handleReject}
        onDelete={handleDelete}
        onStartOver={handleStartOver}
        onFlushComplete={loadIdeas}
        contextsMap={contextsMap}
      />
    </div>
  );
};

export default React.memo(TinderLayout);
