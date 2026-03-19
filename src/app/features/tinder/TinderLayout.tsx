'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useServerProjectStore } from '@/stores/serverProjectStore';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import TinderItemsContent from '@/app/features/tinder/components/TinderItemsContent';
import TinderFilterTabs from '@/app/features/tinder/components/TinderFilterTabs';
import TestModeControls from '@/app/features/tinder/components/TestModeControls';
import IdeasCategorySidebar from '@/app/features/tinder/components/IdeasCategorySidebar';
import EffortRiskFilterSidebar from '@/app/features/tinder/components/EffortRiskFilterSidebar';
import ContextFilterSidebar from '@/app/features/tinder/components/ContextFilterSidebar';
import KeyboardShortcutOverlay from '@/app/features/tinder/components/KeyboardShortcutOverlay';
import AutoTriageButton from '@/app/features/tinder/components/AutoTriageButton';
import { useTinderItems, useTinderItemsKeyboardShortcuts } from '@/app/features/tinder/lib/useTinderItems';
import { useTestMode, useTestModeIdeas } from '@/app/features/tinder/lib/useTestMode';
import { fetchContextsForProjects } from '@/app/features/Ideas/lib/contextLoader';
import { Context } from '@/lib/queries/contextQueries';
import { useDeviceMeshStore, useSelectedDevice } from '@/stores/deviceMeshStore';

const TinderLayout = () => {
  const { initializeProjects, projects } = useServerProjectStore();
  const { selectedProjectId } = useClientProjectStore();
  const [contextsMap, setContextsMap] = React.useState<Record<string, Context[]>>({});

  // Remote mode state
  const [isRemoteMode, setIsRemoteMode] = useState(false);
  const isRegistered = useDeviceMeshStore(s => s.isRegistered);
  const selectedDeviceId = useDeviceMeshStore(s => s.selectedDeviceId);
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

  // Effort/Risk filter state (must be declared before useTinderItems)
  const [effortRiskFilters, setEffortRiskFilters] = useState<{
    effortRange: [number, number] | null;
    riskRange: [number, number] | null;
  }>({ effortRange: null, riskRange: null });

  // Sort order: 'asc' = easiest first (default), 'desc' = hardest first
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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
    // Scan type filtering
    filterDimension,
    setFilterDimension,
    selectedScanType,
    setScanType,
    scanTypes,
    scanTypesLoading,
    // Context filtering
    selectedContextId,
    setContextId,
    contextCounts,
    contextCountsLoading,
    handleAccept,
    handleReject,
    handleDelete,
    // Idea variant handler
    handleAcceptIdeaVariant,
    // Paired direction handlers
    handleAcceptPairVariant,
    handleRejectPair,
    handleDeletePair,
    resetStats,
    loadItems,
    // Dependency awareness
    prerequisiteNotification,
    dismissPrerequisiteNotification,
  } = useTinderItems({
    selectedProjectId,
    remoteDeviceId: isRemoteMode ? selectedDeviceId : null,
    effortRange: effortRiskFilters.effortRange,
    riskRange: effortRiskFilters.riskRange,
    sortOrder,
  });

  // Show sidebars only in ideas mode
  const showCategorySidebar = filterMode === 'ideas' && !isRemoteMode;
  const showContextSidebar = filterMode === 'ideas' && !isRemoteMode && contextCounts.length > 0;

  // Keyboard shortcut overlay (toggle with '?')
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Setup keyboard shortcuts
  useTinderItemsKeyboardShortcuts(handleAccept, handleReject, !processing && !showShortcuts);

  const handleStartOver = () => {
    resetStats();
    loadItems();
  };

  // Derive mobile chip data based on filter dimension
  const mobileChipData = filterDimension === 'category'
    ? categories
    : scanTypes.map(st => ({ category: st.scan_type, count: st.count }));
  const mobileChipSelected = filterDimension === 'category' ? selectedCategory : selectedScanType;
  const mobileChipOnChange = filterDimension === 'category' ? setCategory : setScanType;

  return (
    <div className="h-dvh flex flex-col bg-gradient-to-br from-gray-900 via-purple-900/15 to-gray-900 overflow-hidden">
      {/* Top bar — fixed height */}
      <div className="flex-shrink-0">
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
        <div className="flex items-center justify-center gap-2">
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
          {/* Auto-Triage button — only in ideas mode */}
          {filterMode === 'ideas' && (
            <>
              <div className="w-px h-6 bg-gray-700" />
              <AutoTriageButton
                selectedProjectId={selectedProjectId}
                disabled={loading || processing}
              />
            </>
          )}
        </div>
      </div>

      {/* Mobile/tablet chip bar - visible below xl breakpoint */}
      {showCategorySidebar && mobileChipData.length > 0 && (
        <div className="xl:hidden max-w-3xl mx-auto px-4 pt-2">
          {/* Dimension switcher for mobile */}
          <div className="flex items-center gap-1 mb-2 p-0.5 bg-gray-900/50 rounded-lg border border-gray-700/40 w-fit mx-auto">
            <button
              onClick={() => setFilterDimension('category')}
              disabled={loading || processing}
              className={`
                px-3 py-1 rounded-md text-xs font-medium transition-all duration-200
                ${loading || processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${filterDimension === 'category'
                  ? 'bg-purple-500/20 text-purple-300 shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
                }
              `}
            >
              Type
            </button>
            <button
              onClick={() => setFilterDimension('scan_type')}
              disabled={loading || processing}
              className={`
                px-3 py-1 rounded-md text-xs font-medium transition-all duration-200
                ${loading || processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${filterDimension === 'scan_type'
                  ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
                }
              `}
            >
              Scan
            </button>
          </div>
          <div
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
            role="tablist"
            aria-label={`Filter by ${filterDimension === 'category' ? 'category' : 'scan type'}`}
          >
            <button
              role="tab"
              aria-selected={mobileChipSelected === null}
              onClick={() => mobileChipOnChange(null)}
              disabled={loading || processing}
              className={`snap-start flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                loading || processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${
                mobileChipSelected === null
                  ? filterDimension === 'category'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'text-gray-400 border-gray-700/50 hover:border-gray-600/60 hover:text-gray-300'
              }`}
            >
              <span>🌟</span>
              <span>All</span>
              <span className={`px-1.5 py-0.5 text-2xs font-semibold rounded-full ${
                mobileChipSelected === null
                  ? filterDimension === 'category' ? 'bg-purple-500/30 text-purple-200' : 'bg-cyan-500/30 text-cyan-200'
                  : 'bg-gray-700/80 text-gray-400'
              }`}>
                {mobileChipData.reduce((sum, c) => sum + c.count, 0)}
              </span>
            </button>
            {mobileChipData.map(({ category, count }) => {
              const isActive = mobileChipSelected === category;

              // Category mode: use rich config
              if (filterDimension === 'category') {
                const configMap: Record<string, { label: string; emoji: string; activeClass: string }> = {
                  functionality: { label: 'Functionality', emoji: '⚡', activeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
                  performance: { label: 'Performance', emoji: '📊', activeClass: 'bg-green-500/20 text-green-300 border-green-500/40' },
                  maintenance: { label: 'Maintenance', emoji: '🔧', activeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
                  ui: { label: 'UI/UX', emoji: '🎨', activeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
                  code_quality: { label: 'Code Quality', emoji: '💻', activeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
                  user_benefit: { label: 'User Benefit', emoji: '❤️', activeClass: 'bg-red-500/20 text-red-300 border-red-500/40' },
                };
                const cfg = configMap[category] || { label: category.replace(/_/g, ' '), emoji: '📌', activeClass: 'bg-gray-500/20 text-gray-300 border-gray-500/40' };

                return (
                  <button
                    key={category}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setCategory(category)}
                    disabled={(loading || processing) || count === 0}
                    className={`snap-start flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      (loading || processing) || count === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${
                      isActive
                        ? cfg.activeClass
                        : 'text-gray-400 border-gray-700/50 hover:border-gray-600/60 hover:text-gray-300'
                    }`}
                  >
                    <span>{cfg.emoji}</span>
                    <span className="capitalize">{cfg.label}</span>
                    <span className={`px-1.5 py-0.5 text-2xs font-semibold rounded-full ${
                      isActive ? 'bg-white/10' : 'bg-gray-700/80 text-gray-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              }

              // Scan type mode
              const SCAN_TYPE_ICONS: Record<string, string> = {
                overall: '🔍', brand_artist: '🎨', targeted: '🎯', context: '📁', goal: '🏆',
              };
              const icon = SCAN_TYPE_ICONS[category] || '📋';
              const label = category.replace(/_/g, ' ');

              return (
                <button
                  key={category}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setScanType(category)}
                  disabled={(loading || processing) || count === 0}
                  className={`snap-start flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    (loading || processing) || count === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                  } ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'text-gray-400 border-gray-700/50 hover:border-gray-600/60 hover:text-gray-300'
                  }`}
                >
                  <span>{icon}</span>
                  <span className="capitalize">{label}</span>
                  <span className={`px-1.5 py-0.5 text-2xs font-semibold rounded-full ${
                    isActive ? 'bg-white/10' : 'bg-gray-700/80 text-gray-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      </div>{/* end flex-shrink-0 top bar */}

      {/* Left Sidebar - Category/ScanType + Effort/Risk filters, only visible in ideas mode on large screens */}
      <AnimatePresence>
        {showCategorySidebar && (
          <div className="hidden xl:block fixed left-4 top-32 z-40">
            <IdeasCategorySidebar
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setCategory}
              loading={categoriesLoading}
              disabled={loading || processing}
              filterDimension={filterDimension}
              onFilterDimensionChange={setFilterDimension}
              scanTypes={scanTypes}
              selectedScanType={selectedScanType}
              onScanTypeChange={setScanType}
              scanTypesLoading={scanTypesLoading}
            />
            {/* Effort/Risk Filter - underneath category sidebar */}
            <EffortRiskFilterSidebar
              filters={effortRiskFilters}
              onFiltersChange={setEffortRiskFilters}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
              disabled={loading || processing}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Right Sidebar - Context filter, only visible in ideas mode on large screens */}
      <AnimatePresence>
        {showContextSidebar && (
          <div className="hidden xl:block fixed right-4 top-32 z-40">
            <ContextFilterSidebar
              contextCounts={contextCounts}
              selectedContextId={selectedContextId}
              onContextChange={setContextId}
              loading={contextCountsLoading}
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
        onAcceptIdeaVariant={handleAcceptIdeaVariant}
        onAcceptPairVariant={handleAcceptPairVariant}
        onRejectPair={handleRejectPair}
        onDeletePair={handleDeletePair}
        prerequisiteNotification={prerequisiteNotification}
        onDismissPrerequisiteNotification={dismissPrerequisiteNotification}
      />

      {/* Keyboard shortcut overlay — toggle with '?' */}
      <KeyboardShortcutOverlay open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
};

export default React.memo(TinderLayout);
