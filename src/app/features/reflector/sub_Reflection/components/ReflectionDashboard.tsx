'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, FileText, BarChart3 } from 'lucide-react';
import FilterPanel from './FilterPanel';
import ScanTypeCard from './ScanTypeCard';
import AcceptanceChart from './AcceptanceChart';
import EffortImpactMatrix, { QuadrantType } from './EffortImpactMatrix';
import KPISummaryCards, { KPIFilterType } from './KPISummaryCards';
import ComparisonView from './ComparisonView';
import ExecutiveSummary from './ExecutiveSummary';
import { ComparisonFilterState, ReflectionStats, ComparisonStats } from '../lib/types';
import { fetchReflectionStats, fetchComparisonStats } from '../lib/statsApi';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { getEmptyFilterState } from '@/app/features/reflector/lib/filterIdeas';
import { buildURLFromFilters } from '@/app/features/reflector/lib/urlFilterSync';

type ViewMode = 'analytics' | 'executive';

interface Context {
  id: string;
  name: string;
  project_id: string;
}

export default function ReflectionDashboard() {
  const [stats, setStats] = useState<ReflectionStats | null>(null);
  const [comparisonStats, setComparisonStats] = useState<ComparisonStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contexts, setContexts] = useState<Context[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('analytics');
  const [filters, setFilters] = useState<ComparisonFilterState>({
    projectId: null,
    contextId: null,
    comparisonMode: false,
    timeWindow: 'all'
  });

  const router = useRouter();
  const { projects, initializeProjects } = useProjectConfigStore();

  /**
   * Navigate to the Total View with specific filters applied
   */
  const navigateToFilteredView = useCallback((filterParams: {
    statuses?: string[];
    scanTypes?: string[];
    effortLevels?: string[];
    impactLevels?: string[];
  }) => {
    const baseFilters = getEmptyFilterState();

    // Apply the current dashboard project/context filters if set
    if (filters.projectId) {
      baseFilters.projectIds = [filters.projectId];
    }
    if (filters.contextId) {
      baseFilters.contextIds = [filters.contextId];
    }

    // Apply the specific filter parameters
    if (filterParams.statuses) {
      baseFilters.statuses = filterParams.statuses;
    }
    if (filterParams.scanTypes) {
      baseFilters.scanTypes = filterParams.scanTypes;
    }
    if (filterParams.effortLevels) {
      baseFilters.effortLevels = filterParams.effortLevels;
    }
    if (filterParams.impactLevels) {
      baseFilters.impactLevels = filterParams.impactLevels;
    }

    const url = buildURLFromFilters(baseFilters, '/reflector');
    router.push(url);
  }, [filters.projectId, filters.contextId, router]);

  /**
   * Handle KPI card clicks - navigate to filtered view based on card type
   */
  const handleKPIFilterClick = useCallback((filterType: KPIFilterType) => {
    switch (filterType) {
      case 'all':
        // Show all ideas (no status filter)
        navigateToFilteredView({});
        break;
      case 'pending':
        navigateToFilteredView({ statuses: ['pending'] });
        break;
      case 'accepted':
        navigateToFilteredView({ statuses: ['accepted'] });
        break;
      case 'implemented':
        navigateToFilteredView({ statuses: ['implemented'] });
        break;
    }
  }, [navigateToFilteredView]);

  /**
   * Handle scan type card clicks - navigate to view filtered by scan type
   */
  const handleScanTypeClick = useCallback((scanType: ScanType) => {
    navigateToFilteredView({ scanTypes: [scanType] });
  }, [navigateToFilteredView]);

  /**
   * Handle quadrant clicks - navigate to view filtered by effort/impact levels
   */
  const handleQuadrantClick = useCallback((quadrant: QuadrantType) => {
    switch (quadrant) {
      case 'quickWins':
        // Low effort, high impact
        navigateToFilteredView({ effortLevels: ['low'], impactLevels: ['high'] });
        break;
      case 'majorProjects':
        // High effort, high impact
        navigateToFilteredView({ effortLevels: ['high'], impactLevels: ['high'] });
        break;
      case 'fillIns':
        // Low effort, low impact
        navigateToFilteredView({ effortLevels: ['low'], impactLevels: ['low'] });
        break;
      case 'thankless':
        // High effort, low impact
        navigateToFilteredView({ effortLevels: ['high'], impactLevels: ['low'] });
        break;
    }
  }, [navigateToFilteredView]);

  // Initialize projects
  useEffect(() => {
    initializeProjects();
  }, []);

  // Fetch stats when filters change
  useEffect(() => {
    loadStats();
  }, [filters]);

  // Fetch contexts when project filter changes
  useEffect(() => {
    if (filters.projectId) {
      loadContexts(filters.projectId);
    } else {
      setContexts([]);
    }
  }, [filters.projectId]);

  const loadStats = async () => {
    setLoading(true);
    setError(null);

    try {
      if (filters.comparisonMode && filters.period1 && filters.period2) {
        const compData = await fetchComparisonStats(
          filters.projectId,
          filters.contextId,
          filters.period1,
          filters.period2
        );
        setComparisonStats(compData);
        setStats(null);
      } else {
        // Use aggregated endpoint with time window for better performance
        const data = await fetchReflectionStats(
          filters.projectId,
          filters.contextId,
          filters.dateRange,
          { timeWindow: filters.timeWindow }
        );
        setStats(data);
        setComparisonStats(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadContexts = async (projectId: string) => {
    try {
      const response = await fetch(`/api/contexts?projectId=${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch contexts');
      }

      const data = await response.json();
      if (data.success && data.data.contexts) {
        const mappedContexts = data.data.contexts.map((ctx: { id: string; name: string; project_id: string }) => ({
          id: ctx.id,
          name: ctx.name,
          project_id: ctx.project_id
        }));
        setContexts(mappedContexts);
      }
    } catch (err) {
      setContexts([]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="reflection-loading">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        <span className="ml-3 text-gray-400">Loading reflection dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="reflection-error">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <span className="ml-3 text-red-400">{error}</span>
      </div>
    );
  }

  if (!stats && !comparisonStats) {
    return null;
  }

  return (
    <div className="space-y-6" data-testid="reflection-dashboard">
      {/* View Mode Toggle & Filters Row */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        {/* View Mode Toggle */}
        <div className="flex bg-gray-900/50 border border-gray-700/50 rounded-lg p-1 shrink-0">
          <button
            onClick={() => setViewMode('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'analytics'
                ? 'bg-gray-700/80 text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            data-testid="view-mode-analytics-btn"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={() => setViewMode('executive')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'executive'
                ? 'bg-indigo-600/80 text-white'
                : 'text-gray-400 hover:text-gray-300'
            }`}
            data-testid="view-mode-executive-btn"
          >
            <FileText className="w-4 h-4" />
            Executive Insights
          </button>
        </div>

        {/* Filters */}
        <div className="flex-1">
          <FilterPanel
            filters={filters}
            onFilterChange={setFilters}
            projects={projects}
            contexts={contexts}
          />
        </div>
      </div>

      {/* Executive Insights View */}
      {viewMode === 'executive' ? (
        <ExecutiveSummary filters={filters} />
      ) : (
        <>
          {/* Comparison Mode */}
          {filters.comparisonMode && comparisonStats ? (
            <ComparisonView comparisonStats={comparisonStats} />
          ) : stats ? (
            <>
              {/* KPI Summary Cards */}
              <KPISummaryCards stats={stats} onFilterClick={handleKPIFilterClick} />

              {/* Charts Row */}
              <div className="grid grid-cols-1">
                <AcceptanceChart scanTypeStats={stats.scanTypes} />
              </div>

              {/* Scan Type Cards Grid */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-lg font-semibold text-gray-300 mb-4">
                  Specialist Performance
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...stats.scanTypes]
                    .sort((a, b) => b.total - a.total)
                    .map((scanTypeStat, index) => (
                      <ScanTypeCard
                        key={scanTypeStat.scanType}
                        stats={scanTypeStat}
                        index={index}
                        onScanTypeClick={handleScanTypeClick}
                      />
                    ))}
                </div>
              </motion.div>

              {/* Effort vs Impact Matrix */}
              <EffortImpactMatrix filters={filters} onQuadrantClick={handleQuadrantClick} />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
