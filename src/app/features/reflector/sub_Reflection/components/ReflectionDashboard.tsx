'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, FileText, BarChart3 } from 'lucide-react';
import FilterPanel from './FilterPanel';
import ScanTypeCard from './ScanTypeCard';
import AcceptanceChart, { AcceptanceBarClickData } from './AcceptanceChart';
import EffortImpactMatrix, { QuadrantType, QuadrantDrillDownData } from './EffortImpactMatrix';
import KPISummaryCards, { KPIFilterType } from './KPISummaryCards';
import ComparisonView from './ComparisonView';
import ExecutiveSummary from './ExecutiveSummary';
import { ComparisonFilterState, ReflectionStats, ComparisonStats } from '../lib/types';
import { fetchReflectionStats, fetchComparisonStats } from '../lib/statsApi';
import { useProjectConfigStore } from '@/stores/projectConfigStore';
import { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { getEmptyFilterState } from '@/app/features/reflector/lib/filterIdeas';
import { buildURLFromFilters } from '@/app/features/reflector/lib/urlFilterSync';
import SuggestionTypeToggle from '../../components/SuggestionTypeToggle';
import DrillDownDrawer, { DrillDownContext, dbIdeaToDrillDown } from '../../components/DrillDownDrawer';
import { SuggestionFilter } from '../../lib/unifiedTypes';
import { DbIdea } from '@/app/db';

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
  const [drillDown, setDrillDown] = useState<DrillDownContext | null>(null);
  const [filters, setFilters] = useState<ComparisonFilterState>({
    projectId: null,
    contextId: null,
    comparisonMode: false,
    timeWindow: 'all',
    suggestionType: 'ideas'
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
        navigateToFilteredView({ effortLevels: ['low'], impactLevels: ['high'] });
        break;
      case 'majorProjects':
        navigateToFilteredView({ effortLevels: ['high'], impactLevels: ['high'] });
        break;
      case 'fillIns':
        navigateToFilteredView({ effortLevels: ['low'], impactLevels: ['low'] });
        break;
      case 'thankless':
        navigateToFilteredView({ effortLevels: ['high'], impactLevels: ['low'] });
        break;
    }
  }, [navigateToFilteredView]);

  /**
   * Handle acceptance chart bar click - fetch ideas for that scan type
   */
  const handleAcceptanceBarClick = useCallback(async (data: AcceptanceBarClickData) => {
    try {
      const params = new URLSearchParams();
      if (filters.projectId) params.set('projectId', filters.projectId);
      if (filters.contextId) params.set('contextId', filters.contextId);

      const response = await fetch(`/api/ideas?${params}`);
      if (!response.ok) return;
      const result = await response.json();
      const allIdeas: DbIdea[] = result.ideas || [];

      // Filter by scan type client-side
      const ideas = allIdeas.filter(i => i.scan_type === data.scanType);

      setDrillDown({
        title: data.label,
        subtitle: `${ideas.length} ideas · ${data.acceptanceRatio}% acceptance`,
        accentColor: data.acceptanceRatio >= 70 ? 'rgba(16, 185, 129, 0.4)'
          : data.acceptanceRatio >= 40 ? 'rgba(245, 158, 11, 0.4)'
          : 'rgba(239, 68, 68, 0.4)',
        ideas: ideas.map(dbIdeaToDrillDown),
        stats: {
          total: ideas.length,
          accepted: ideas.filter(i => i.status === 'accepted' || i.status === 'implemented').length,
          rejected: ideas.filter(i => i.status === 'rejected').length,
          pending: ideas.filter(i => i.status === 'pending').length,
          acceptanceRate: data.acceptanceRatio,
        },
      });
    } catch {
      // Silently fail
    }
  }, [filters.projectId, filters.contextId]);

  /**
   * Handle quadrant drill-down - show ideas from the quadrant
   */
  const handleQuadrantDrillDown = useCallback((data: QuadrantDrillDownData) => {
    setDrillDown({
      title: data.title,
      subtitle: data.description,
      accentColor: data.quadrant === 'quickWins' ? 'rgba(34, 197, 94, 0.4)'
        : data.quadrant === 'majorProjects' ? 'rgba(59, 130, 246, 0.4)'
        : data.quadrant === 'fillIns' ? 'rgba(234, 179, 8, 0.4)'
        : 'rgba(239, 68, 68, 0.4)',
      ideas: data.ideas.map(i => ({
        id: i.id,
        title: i.title,
        status: i.status as 'pending' | 'accepted' | 'rejected' | 'implemented',
      })),
      stats: {
        total: data.count,
        acceptanceRate: data.acceptanceRate,
      },
    });
  }, []);

  const handleIdeaAction = useCallback(() => {
    loadStats();
  }, []);

  /**
   * Handle suggestion type toggle change
   */
  const handleSuggestionTypeChange = useCallback((type: SuggestionFilter) => {
    setFilters(prev => ({ ...prev, suggestionType: type }));
  }, []);

  // Initialize projects
  useEffect(() => {
    initializeProjects();
  }, []);

  // Fetch stats when filters change
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
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
          if (!cancelled) {
            setComparisonStats(compData);
            setStats(null);
          }
        } else {
          const data = await fetchReflectionStats(
            filters.projectId,
            filters.contextId,
            filters.dateRange,
            { timeWindow: filters.timeWindow, suggestionType: filters.suggestionType }
          );
          if (!cancelled) {
            setStats(data);
            setComparisonStats(null);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load statistics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [filters]);

  // Fetch contexts when project filter changes
  useEffect(() => {
    if (!filters.projectId) {
      setContexts([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(`/api/contexts?projectId=${filters.projectId}`);
        if (!response.ok) throw new Error('Failed to fetch contexts');

        const data = await response.json();
        if (!cancelled && data.success && data.data.contexts) {
          const mappedContexts = data.data.contexts.map((ctx: { id: string; name: string; project_id: string }) => ({
            id: ctx.id,
            name: ctx.name,
            project_id: ctx.project_id,
          }));
          setContexts(mappedContexts);
        }
      } catch {
        if (!cancelled) setContexts([]);
      }
    };

    load();
    return () => { cancelled = true; };
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
          { timeWindow: filters.timeWindow, suggestionType: filters.suggestionType }
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
      {/* Type Toggle + View Mode Toggle & Filters Row */}
      <div className="flex flex-col gap-4">
        {/* Type Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <SuggestionTypeToggle
            value={filters.suggestionType || 'ideas'}
            onChange={handleSuggestionTypeChange}
            ideasCount={stats?.overall.total}
            directionsCount={stats?.directionsOverall?.total}
          />
        </div>

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
                <AcceptanceChart
                  scanTypeStats={stats.scanTypes}
                  onBarClick={handleAcceptanceBarClick}
                />
              </div>

              {/* Scan Type Cards Grid (Ideas) - Compact 6-column matrix */}
              {filters.suggestionType !== 'directions' && stats.scanTypes.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-sm font-semibold text-gray-400 mb-2">
                    Specialist Performance
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
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
              )}

              {/* Context Map Cards Grid (Directions) - Compact 6-column matrix */}
              {filters.suggestionType !== 'ideas' && stats.contextMaps && stats.contextMaps.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-sm font-semibold text-gray-400 mb-2">
                    Direction Sources (Context Maps)
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {[...stats.contextMaps]
                      .sort((a, b) => b.total - a.total)
                      .map((contextMapStat, index) => (
                        <motion.div
                          key={contextMapStat.contextMapId}
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: index * 0.03, duration: 0.2 }}
                          whileHover={{ scale: 1.02 }}
                          className="bg-gradient-to-br from-cyan-500/5 to-cyan-600/2 border border-cyan-500/40 rounded-md p-2 backdrop-blur-sm"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <h3 className="text-xs font-semibold text-gray-300 truncate flex-1">
                              {contextMapStat.contextMapTitle}
                            </h3>
                            <span className="text-xs text-cyan-400 opacity-50 font-mono">
                              {contextMapStat.total}
                            </span>
                          </div>
                          <div className="text-center mb-1">
                            <span className="text-lg font-bold text-cyan-400 font-mono">
                              {contextMapStat.acceptanceRatio}%
                            </span>
                          </div>
                          <div className="flex justify-between text-[10px] font-mono text-gray-500">
                            <span className="text-yellow-400">{contextMapStat.pending}p</span>
                            <span className="text-green-400">{contextMapStat.accepted}a</span>
                            <span className="text-red-400">{contextMapStat.rejected}r</span>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </motion.div>
              )}

              {/* Effort vs Impact Matrix (Ideas only - directions don't have scores) */}
              {filters.suggestionType !== 'directions' && (
                <EffortImpactMatrix
                  filters={filters}
                  onQuadrantClick={handleQuadrantClick}
                  onQuadrantDrillDown={handleQuadrantDrillDown}
                />
              )}
            </>
          ) : null}
        </>
      )}

      {/* Drill-Down Drawer */}
      <DrillDownDrawer
        context={drillDown}
        onClose={() => setDrillDown(null)}
        onIdeaAction={handleIdeaAction}
      />
    </div>
  );
}
