'use client';

import React, { useEffect } from 'react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useUnifiedProjectStore } from '@/stores/unifiedProjectStore';
import TinderItemsContent from '@/app/features/tinder/components/TinderItemsContent';
import TinderFilterTabs from '@/app/features/tinder/components/TinderFilterTabs';
import TestModeControls from '@/app/features/tinder/components/TestModeControls';
import { useTinderItems, useTinderItemsKeyboardShortcuts } from '@/app/features/tinder/lib/useTinderItems';
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

  // Use the unified tinder items hook
  const tinderItems = useTinderItems(selectedProjectId);

  const {
    items,
    currentIndex,
    currentItem,
    loading,
    processing,
    combinedStats,
    remainingCount,
    filterMode,
    counts,
    setFilterMode,
    handleAccept,
    handleReject,
    handleDelete,
    resetStats,
    loadItems,
  } = tinderItems;

  // Setup keyboard shortcuts
  useTinderItemsKeyboardShortcuts(handleAccept, handleReject, !processing);

  const handleStartOver = () => {
    resetStats();
    loadItems();
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Test Mode Controls - Only visible when test mode is enabled */}
      {testMode.isTestMode && (
        <TestModeControls
          testMode={testMode}
          stats={combinedStats}
          remainingCount={remainingCount}
          onReload={loadItems}
        />
      )}

      {/* Filter Tabs */}
      <div className="max-w-2xl mx-auto px-6 pt-6">
        <TinderFilterTabs
          filterMode={filterMode}
          onFilterChange={setFilterMode}
          counts={counts}
          disabled={loading || processing}
        />
      </div>

      <TinderItemsContent
        items={items}
        currentIndex={currentIndex}
        currentItem={currentItem}
        loading={loading}
        processing={processing}
        filterMode={filterMode}
        stats={combinedStats}
        onAccept={handleAccept}
        onReject={handleReject}
        onDelete={handleDelete}
        onStartOver={handleStartOver}
        onFlushComplete={loadItems}
        contextsMap={contextsMap}
      />
    </div>
  );
};

export default React.memo(TinderLayout);
