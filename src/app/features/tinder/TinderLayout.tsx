'use client';

import React, { useState, useEffect } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useUnifiedProjectStore } from '@/stores/unifiedProjectStore';
import ProjectToolbar, { ToolbarAction } from '@/components/ui/ProjectToolbar';
import TinderContent from '@/app/features/tinder/components/TinderContent';
import { useTinderIdeas, useTinderKeyboardShortcuts } from '@/app/features/tinder/lib/tinderHooks';

const TinderLayout = () => {
  const { initializeProjects } = useProjectConfigStore();
  const { selectedProjectId } = useUnifiedProjectStore();

  // Initialize projects on mount
  useEffect(() => {
    initializeProjects();
  }, [initializeProjects]);

  // Use the custom hook for tinder functionality
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
  } = useTinderIdeas(selectedProjectId);

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
      />
    </div>
  );
};

export default React.memo(TinderLayout);
