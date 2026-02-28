'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCw, Loader2 } from 'lucide-react';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { useUnifiedProjectStore } from '@/stores/unifiedProjectStore';
import TinderItemsContent from '@/app/features/tinder/components/TinderItemsContent';
import TinderFilterTabs from '@/app/features/tinder/components/TinderFilterTabs';
import TestModeControls from '@/app/features/tinder/components/TestModeControls';
import IdeasCategorySidebar from '@/app/features/tinder/components/IdeasCategorySidebar';
import EffortRiskFilterSidebar from '@/app/features/tinder/components/EffortRiskFilterSidebar';
import { useTinderItems, useTinderItemsKeyboardShortcuts } from '@/app/features/tinder/lib/useTinderItems';
import { useTestMode, useTestModeIdeas } from '@/app/features/tinder/lib/useTestMode';
import { fetchContextsForProjects } from '@/app/features/Ideas/lib/contextLoader';
import { Context } from '@/lib/queries/contextQueries';
import { useDeviceMeshStore, useSelectedDevice } from '@/stores/deviceMeshStore';

const TinderLayout = () => {
  const { initializeProjects, projects } = useProjectConfigStore();
  const { selectedProjectId } = useUnifiedProjectStore();
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

  // Re-evaluation state
  const [isReEvaluating, setIsReEvaluating] = useState(false);
  const [reEvalCount, setReEvalCount] = useState<number | null>(null);

  // Effort/Risk filter state (must be declared before useTinderItems)
  const [effortRiskFilters, setEffortRiskFilters] = useState<{
    effortRange: [number, number] | null;
    riskRange: [number, number] | null;
  }>({ effortRange: null, riskRange: null });

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
  });

  // Show sidebar only in ideas mode with categories
  const showCategorySidebar = filterMode === 'ideas' && !isRemoteMode;

  // Check how many ideas need re-evaluation
  useEffect(() => {
    const checkReEvalCount = async () => {
      try {
        const projectParam = selectedProjectId && selectedProjectId !== 'all' ? `?projectId=${selectedProjectId}` : '';
        const res = await fetch(`/api/ideas/re-evaluate${projectParam}`);
        if (res.ok) {
          const data = await res.json();
          setReEvalCount(data.count || 0);
        }
      } catch {
        // Non-critical
      }
    };
    checkReEvalCount();
  }, [selectedProjectId, items]);

  // Handle re-evaluation
  const handleReEvaluate = useCallback(async () => {
    if (isReEvaluating) return;
    setIsReEvaluating(true);
    try {
      const body: Record<string, string> = {};
      if (selectedProjectId && selectedProjectId !== 'all') {
        body.projectId = selectedProjectId;
      }
      const res = await fetch('/api/ideas/re-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setReEvalCount(0);
        // Reload items to reflect updated estimations
        loadItems();
      }
    } catch {
      // Error handling
    } finally {
      setIsReEvaluating(false);
    }
  }, [isReEvaluating, selectedProjectId, loadItems]);

  // Setup keyboard shortcuts
  useTinderItemsKeyboardShortcuts(handleAccept, handleReject, !processing);

  const handleStartOver = () => {
    resetStats();
    loadItems();
  };

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

      {/* Filter Tabs + Re-evaluate Button */}
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

          {/* Re-evaluate Button */}
          {reEvalCount !== null && reEvalCount > 0 && (
            <>
              <div className="w-px h-6 bg-gray-700" />
              <motion.button
                onClick={handleReEvaluate}
                disabled={isReEvaluating || loading || processing}
                className={`
                  flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm
                  transition-all duration-300 ease-out cursor-pointer
                  ${isReEvaluating
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-gray-400 hover:text-amber-300 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30'
                  }
                  ${(isReEvaluating || loading || processing) ? 'opacity-60 cursor-not-allowed' : ''}
                `}
                whileHover={(isReEvaluating || loading || processing) ? {} : { scale: 1.02 }}
                whileTap={(isReEvaluating || loading || processing) ? {} : { scale: 0.98 }}
                title={isReEvaluating ? 'Evaluating ideas...' : `Re-evaluate ${reEvalCount} ideas without estimations`}
              >
                {isReEvaluating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCw className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {isReEvaluating ? 'Evaluating...' : 'Evaluate'}
                </span>
                <span className="px-1.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-300">
                  {reEvalCount}
                </span>
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* Mobile/tablet category chip bar - visible below xl breakpoint */}
      {showCategorySidebar && categories.length > 0 && (
        <div className="xl:hidden max-w-3xl mx-auto px-4 pt-2">
          <div
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
            role="tablist"
            aria-label="Filter by category"
          >
            <button
              role="tab"
              aria-selected={selectedCategory === null}
              onClick={() => setCategory(null)}
              disabled={loading || processing}
              className={`snap-start flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                loading || processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${
                selectedCategory === null
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'text-gray-400 border-gray-700/50 hover:border-gray-600/60 hover:text-gray-300'
              }`}
            >
              <span>🌟</span>
              <span>All</span>
              <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
                selectedCategory === null ? 'bg-purple-500/30 text-purple-200' : 'bg-gray-700/80 text-gray-400'
              }`}>
                {categories.reduce((sum, c) => sum + c.count, 0)}
              </span>
            </button>
            {categories.map(({ category, count }) => {
              const configMap: Record<string, { label: string; emoji: string; activeClass: string }> = {
                functionality: { label: 'Functionality', emoji: '⚡', activeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
                performance: { label: 'Performance', emoji: '📊', activeClass: 'bg-green-500/20 text-green-300 border-green-500/40' },
                maintenance: { label: 'Maintenance', emoji: '🔧', activeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
                ui: { label: 'UI/UX', emoji: '🎨', activeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
                code_quality: { label: 'Code Quality', emoji: '💻', activeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
                user_benefit: { label: 'User Benefit', emoji: '❤️', activeClass: 'bg-red-500/20 text-red-300 border-red-500/40' },
              };
              const cfg = configMap[category] || { label: category.replace(/_/g, ' '), emoji: '📌', activeClass: 'bg-gray-500/20 text-gray-300 border-gray-500/40' };
              const isActive = selectedCategory === category;

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
                  <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${
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

      {/* Left Sidebar - Category + Effort/Risk filters, only visible in ideas mode on large screens */}
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
            {/* Effort/Risk Filter - underneath category sidebar */}
            <EffortRiskFilterSidebar
              filters={effortRiskFilters}
              onFiltersChange={setEffortRiskFilters}
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
    </div>
  );
};

export default React.memo(TinderLayout);
