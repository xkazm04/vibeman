'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, Calendar, Settings } from 'lucide-react';
import { useClientProjectStore } from '@/stores/clientProjectStore';

import { ObsKPICards, EndpointUsageChart, EndpointTable, OnboardingStepper } from './components';
import {
  fetchObservabilityStats,
  checkProjectRegistration,
  updateObservabilityConfig
} from './lib/observabilityApi';
import { ObsStatsResponse, ObsEndpointSummary, ObsConfigResponse } from './lib/types';

interface DashboardState {
  loading: boolean;
  error: string | null;
  hasData: boolean;
  registered: boolean;
  enabled: boolean;
  stats: ObsStatsResponse | null;
  topEndpoints: ObsEndpointSummary[];
  highErrorEndpoints: ObsEndpointSummary[];
  config: ObsConfigResponse | null;
}

const DAYS_OPTIONS = [
  { value: 1, label: '24h' },
  { value: 7, label: '7d' },
  { value: 14, label: '14d' },
  { value: 30, label: '30d' }
];

export default function ObservabilityDashboard() {
  const { activeProject } = useClientProjectStore();
  const [days, setDays] = useState(7);
  const [showSettings, setShowSettings] = useState(false);
  const [state, setState] = useState<DashboardState>({
    loading: true,
    error: null,
    hasData: false,
    registered: false,
    enabled: false,
    stats: null,
    topEndpoints: [],
    highErrorEndpoints: [],
    config: null
  });

  const projectId = activeProject?.id || '';
  const projectPath = activeProject?.path || '';
  const projectName = activeProject?.name || 'Unknown Project';

  const loadData = useCallback(async () => {
    if (!projectId) {
      setState(s => ({
        ...s,
        loading: false,
        error: 'No project selected'
      }));
      return;
    }

    setState(s => ({ ...s, loading: true, error: null }));

    try {
      // Check registration status
      const registration = await checkProjectRegistration(projectId);

      if (!registration.hasData) {
        setState(s => ({
          ...s,
          loading: false,
          hasData: false,
          registered: registration.registered,
          enabled: registration.enabled,
          config: registration.config
        }));
        return;
      }

      // Fetch stats
      const statsResponse = await fetchObservabilityStats(projectId, days);

      setState({
        loading: false,
        error: null,
        hasData: statsResponse.hasData,
        registered: registration.registered,
        enabled: registration.enabled,
        stats: statsResponse.stats,
        topEndpoints: statsResponse.topEndpoints || [],
        highErrorEndpoints: statsResponse.highErrorEndpoints || [],
        config: registration.config
      });
    } catch (error) {
      setState(s => ({
        ...s,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load data'
      }));
    }
  }, [projectId, days]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleEnabled = async () => {
    if (!projectId || !state.config) return;

    try {
      await updateObservabilityConfig(projectId, { enabled: !state.config.enabled });
      loadData();
    } catch (error) {
      console.error('Failed to toggle observability:', error);
    }
  };

  // No project selected
  if (!projectId) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <Activity className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No Project Selected</h3>
          <p className="text-sm text-gray-500">
            Select a project to view API observability data.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading observability data...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="text-red-400 mb-4">{state.error}</div>
          <button
            onClick={loadData}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No data - show onboarding stepper
  if (!state.hasData) {
    return (
      <OnboardingStepper
        projectId={projectId}
        projectPath={projectPath}
        projectName={projectName}
        onComplete={loadData}
      />
    );
  }

  // Has data - show dashboard
  const { stats } = state;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-200">API Observability</h2>
          <p className="text-sm text-gray-400 mt-1">
            Tracking {stats?.summary.unique_endpoints || 0} endpoints • Last {days} days
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date range selector */}
          <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
            <Calendar className="w-4 h-4 text-gray-500 ml-2" />
            {DAYS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  days === opt.value
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${
              showSettings ? 'bg-gray-700 text-gray-200' : 'bg-gray-800/50 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Refresh */}
          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-gray-800/50 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && state.config && (
        <div className="rounded-xl bg-gray-800/50 border border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-200">Observability Settings</h3>
              <p className="text-sm text-gray-400">Provider: {state.config.provider}</p>
            </div>
            <button
              onClick={handleToggleEnabled}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                state.config.enabled
                  ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {state.config.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {stats && (
        <ObsKPICards
          totalCalls={stats.summary.total_calls}
          uniqueEndpoints={stats.summary.unique_endpoints}
          avgResponseTimeMs={stats.summary.avg_response_time_ms}
          errorRate={stats.summary.error_rate}
        />
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Endpoints Chart */}
        <div className="rounded-xl bg-gray-800/40 border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Top Endpoints by Usage</h3>
          <EndpointUsageChart endpoints={state.topEndpoints} />
        </div>

        {/* High Error Endpoints */}
        <div className="rounded-xl bg-gray-800/40 border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">
            Endpoints with High Error Rates
            {state.highErrorEndpoints.length === 0 && (
              <span className="text-sm font-normal text-green-400 ml-2">All healthy!</span>
            )}
          </h3>
          {state.highErrorEndpoints.length > 0 ? (
            <EndpointUsageChart endpoints={state.highErrorEndpoints} />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">🎉</div>
                <p>No high-error endpoints detected</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Endpoints Table */}
      <div className="rounded-xl bg-gray-800/40 border border-gray-700/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-gray-200">All Tracked Endpoints</h3>
        </div>
        {stats && (
          <EndpointTable
            endpoints={stats.endpoints}
            trends={stats.trends}
          />
        )}
      </div>
    </div>
  );
}
