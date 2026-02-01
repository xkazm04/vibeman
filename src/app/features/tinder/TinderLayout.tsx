'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useUnifiedProjectStore } from '@/stores/unifiedProjectStore';
import TinderItemsContent from '@/app/features/tinder/components/TinderItemsContent';
import TinderFilterTabs from '@/app/features/tinder/components/TinderFilterTabs';
import TestModeControls from '@/app/features/tinder/components/TestModeControls';
import IdeasCategorySidebar from '@/app/features/tinder/components/IdeasCategorySidebar';
import { AnimatePresence } from 'framer-motion';
import { useTinderItems, useTinderItemsKeyboardShortcuts } from '@/app/features/tinder/lib/useTinderItems';
import { useTestMode, useTestModeIdeas } from '@/app/features/tinder/lib/useTestMode';
import { fetchContextsForProjects } from '@/app/features/Ideas/lib/contextLoader';
import { Context } from '@/lib/queries/contextQueries';
import { useEmulatorStore, useSelectedDevice } from '@/stores/emulatorStore';

const TinderLayout = () => {
  const { initializeProjects, projects } = useProjectConfigStore();
  const { selectedProjectId } = useUnifiedProjectStore();
  const [contextsMap, setContextsMap] = React.useState<Record<string, Context[]>>({});

  // Remote mode state
  const [isRemoteMode, setIsRemoteMode] = useState(false);
  const isRegistered = useEmulatorStore(s => s.isRegistered);
  const selectedDeviceId = useEmulatorStore(s => s.selectedDeviceId);
  const selectedDevice = useSelectedDevice();
  const isRemoteAvailable = isRegistered && !!selectedDeviceId;

  // Toggle remote mode
  const handleRemoteModeToggle = useCallback(() => {
    if (isRemoteMode) {
      setIsRemoteMode(false);
    } else if (isRemoteAvailable) {
      setIsRemoteMode(true);
    }
  }, [isRemoteMode, isRemoteAvailable]);

  // Auto-disable remote mode if connection lost
  useEffect(() => {
    if (!isRemoteAvailable && isRemoteMode) {
      setIsRemoteMode(false);
    }
  }, [isRemoteAvailable, isRemoteMode]);

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

  // Unified tinder items hook - handles both local and remote modes
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
    goalTitlesMap,
    // Category filtering
    selectedCategory,
    categories,
    categoriesLoading,
    setCategory,
    setFilterMode,
    handleAccept,
    handleReject,
    handleDelete,
    // Paired direction handlers
    handleAcceptPairVariant,
    handleRejectPair,
    handleDeletePair,
    resetStats,
    loadItems,
  } = useTinderItems({
    selectedProjectId,
    remoteDeviceId: isRemoteMode ? selectedDeviceId : null,
  });

  // Show sidebar only in ideas mode with categories
  const showCategorySidebar = filterMode === 'ideas' && !isRemoteMode;

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
      <div className="max-w-3xl mx-auto px-4 pt-2">
        <TinderFilterTabs
          filterMode={filterMode}
          onFilterChange={setFilterMode}
          counts={counts}
          disabled={loading || processing}
          isRemoteAvailable={isRemoteAvailable}
          isRemoteMode={isRemoteMode}
          remoteDeviceName={selectedDevice?.device_name}
          onRemoteModeToggle={handleRemoteModeToggle}
        />
      </div>

      {/* Category Sidebar - absolutely positioned on left, only visible in ideas mode on large screens */}
      <AnimatePresence>
        {showCategorySidebar && (
          <div className="hidden xl:block fixed left-4 top-32 z-40">
            <IdeasCategorySidebar
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setCategory}
              loading={categoriesLoading}
              disabled={loading || processing}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Main tinder content - unchanged width */}
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
        goalTitlesMap={goalTitlesMap}
        onAcceptPairVariant={handleAcceptPairVariant}
        onRejectPair={handleRejectPair}
        onDeletePair={handleDeletePair}
      />
    </div>
  );
};

export default React.memo(TinderLayout);
