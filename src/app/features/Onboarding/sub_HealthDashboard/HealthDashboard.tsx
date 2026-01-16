'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  RefreshCw,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ListChecks,
  BarChart3,
} from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import HealthScoreRing from './HealthScoreRing';
import ActionItemCard from './ActionItemCard';
import { AchievementGrid } from './AchievementBadge';
import type {
  HealthDashboardData,
  SetupDimension,
  ActionItem,
} from '@/lib/health/healthCalculator';
import { CATEGORY_CONFIG } from '@/lib/health/healthCalculator';
import type { QuickFixResult } from '@/lib/health/quickFixExecutor';

interface HealthDashboardProps {
  onOpenBlueprint?: () => void;
  onNavigate?: (path: string) => void;
  compact?: boolean;
}

export default function HealthDashboard({
  onOpenBlueprint,
  onNavigate,
  compact = false,
}: HealthDashboardProps) {
  const { activeProject } = useActiveProjectStore();
  const [dashboardData, setDashboardData] = useState<HealthDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [showAllActions, setShowAllActions] = useState(false);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (!activeProject?.id) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(`/api/health/dashboard?projectId=${activeProject.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeProject?.id]);

  // Initial load
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Execute quick fix
  const handleExecuteQuickFix = async (actionId: string, quickFixId: string) => {
    if (!activeProject?.id) return;

    setExecutingAction(actionId);

    try {
      const response = await fetch('/api/health/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          quickFixId,
        }),
      });

      const result: { success: boolean; result?: QuickFixResult; error?: string } = await response.json();

      if (result.success && result.result) {
        // Handle navigation if needed
        if (result.result.actionRequired === 'open_blueprint_modal' && onOpenBlueprint) {
          onOpenBlueprint();
        } else if (result.result.redirectTo && onNavigate) {
          onNavigate(result.result.redirectTo);
        }

        // Refresh dashboard data
        await fetchDashboard(true);
      }
    } catch (err) {
      console.error('Quick fix failed:', err);
    } finally {
      setExecutingAction(null);
    }
  };

  // Mark action as complete
  const handleMarkComplete = async (actionId: string) => {
    if (!activeProject?.id) return;

    try {
      await fetch('/api/health/dashboard', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          actionId,
          status: 'completed',
        }),
      });

      // Update local state
      setDashboardData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          actionItems: prev.actionItems.map(a =>
            a.id === actionId ? { ...a, status: 'completed' } : a
          ),
          completedActionsCount: prev.completedActionsCount + 1,
        };
      });
    } catch (err) {
      console.error('Failed to mark complete:', err);
    }
  };

  // Skip action
  const handleSkipAction = async (actionId: string) => {
    if (!activeProject?.id) return;

    try {
      await fetch('/api/health/dashboard', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject.id,
          actionId,
          status: 'skipped',
        }),
      });

      // Update local state
      setDashboardData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          actionItems: prev.actionItems.map(a =>
            a.id === actionId ? { ...a, status: 'skipped' } : a
          ),
        };
      });
    } catch (err) {
      console.error('Failed to skip action:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-sm text-gray-400">{error}</p>
        <button
          onClick={() => fetchDashboard()}
          className="mt-3 px-4 py-2 text-sm text-cyan-400 hover:text-cyan-300"
        >
          Try Again
        </button>
      </div>
    );
  }

  // No data
  if (!dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Activity className="w-10 h-10 text-gray-500 mb-3" />
        <p className="text-sm text-gray-400">No health data available</p>
        <p className="text-xs text-gray-500 mt-1">Run a health check to get started</p>
      </div>
    );
  }

  const pendingActions = dashboardData.actionItems.filter(a => a.status === 'pending');
  const displayedActions = showAllActions ? pendingActions : pendingActions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Project Health</h2>
            <p className="text-xs text-gray-400">Track your project's setup and health</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => fetchDashboard(true)}
          disabled={refreshing}
          className="p-2 rounded-lg bg-gray-800/50 border border-gray-700/50
            hover:border-gray-600/50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
        </motion.button>
      </div>

      {/* Score and Dimensions */}
      <div className={`grid gap-6 ${compact ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
        {/* Score Ring */}
        <div className="flex flex-col items-center justify-center p-6 rounded-xl
          bg-gradient-to-br from-gray-800/50 to-gray-900/50
          border border-gray-700/50">
          <HealthScoreRing
            score={dashboardData.overallScore}
            status={dashboardData.status}
            size={compact ? 'md' : 'lg'}
            trend={0}
            trendDirection="stable"
          />

          {/* Quick Stats */}
          <div className="flex items-center gap-4 mt-4">
            <div className="text-center">
              <span className="text-lg font-bold text-white">
                {dashboardData.completedActionsCount}
              </span>
              <span className="text-xs text-gray-500 block">Completed</span>
            </div>
            <div className="w-px h-8 bg-gray-700" />
            <div className="text-center">
              <span className="text-lg font-bold text-white">
                {pendingActions.length}
              </span>
              <span className="text-xs text-gray-500 block">Pending</span>
            </div>
            {dashboardData.streakDays > 0 && (
              <>
                <div className="w-px h-8 bg-gray-700" />
                <div className="text-center">
                  <span className="text-lg font-bold text-orange-400">
                    {dashboardData.streakDays}
                  </span>
                  <span className="text-xs text-gray-500 block">Day Streak</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Setup Dimensions */}
        <div className="p-4 rounded-xl bg-gray-800/30 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-white">Setup Progress</span>
          </div>

          <div className="space-y-3">
            {dashboardData.dimensions.map((dim, index) => (
              <DimensionProgress key={dim.id} dimension={dim} index={index} />
            ))}
          </div>
        </div>
      </div>

      {/* Action Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-white">Recommended Actions</span>
            <span className="text-xs text-gray-500">
              ({pendingActions.length} remaining)
            </span>
          </div>
          {pendingActions.length > 5 && (
            <button
              onClick={() => setShowAllActions(!showAllActions)}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              {showAllActions ? 'Show Less' : `Show All (${pendingActions.length})`}
              <ChevronRight className={`w-3 h-3 transition-transform ${showAllActions ? 'rotate-90' : ''}`} />
            </button>
          )}
        </div>

        <AnimatePresence mode="popLayout">
          {displayedActions.length > 0 ? (
            <div className="space-y-2">
              {displayedActions.map((action, index) => (
                <ActionItemCard
                  key={action.id}
                  action={action}
                  index={index}
                  isExecuting={executingAction === action.id}
                  onExecuteQuickFix={handleExecuteQuickFix}
                  onMarkComplete={handleMarkComplete}
                  onSkip={handleSkipAction}
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <Sparkles className="w-10 h-10 text-green-400 mb-3" />
              <p className="text-sm text-green-400 font-medium">All caught up!</p>
              <p className="text-xs text-gray-500 mt-1">
                No pending actions. Great job!
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Achievements */}
      {!compact && (
        <div className="pt-4 border-t border-gray-700/50">
          <AchievementGrid
            achievements={dashboardData.achievements}
            columns={5}
            showAll={false}
          />
        </div>
      )}
    </div>
  );
}

// Dimension Progress Bar Component
function DimensionProgress({
  dimension,
  index,
}: {
  dimension: SetupDimension;
  index: number;
}) {
  const config = CATEGORY_CONFIG[dimension.category];
  const colorClass = {
    amber: 'bg-amber-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    cyan: 'bg-cyan-500',
  }[config?.color || 'cyan'];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="space-y-1.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-300">{dimension.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {dimension.currentValue}/{dimension.maxValue}
          </span>
          {dimension.status === 'complete' && (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
          )}
        </div>
      </div>
      <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${dimension.completionPercentage}%` }}
          transition={{ delay: index * 0.05 + 0.2, duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${colorClass}`}
        />
      </div>
    </motion.div>
  );
}
