'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  GitBranch,
  RefreshCw,
  Settings,
  Plus,
  Filter,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { useAutonomousCIStore, useFilteredPipelines, useCILoading } from '@/stores/autonomousCIStore';
import CIDashboardStats from './CIDashboardStats';
import PipelineCard from './PipelineCard';
import BuildHistoryList from './BuildHistoryList';
import CreatePipelineModal from './CreatePipelineModal';
import type { BuildStatus } from '@/app/db/models/autonomous-ci.types';

interface AutonomousCIDashboardProps {
  projectId: string;
  projectName?: string;
}

export default function AutonomousCIDashboard({
  projectId,
  projectName,
}: AutonomousCIDashboardProps) {
  const {
    stats,
    builds,
    config,
    error,
    viewMode,
    filterStatus,
    filterActive,
    showCreatePipelineModal,
    selectedPipelineId,
    fetchDashboard,
    fetchRecentBuilds,
    fetchFlakyTests,
    setViewMode,
    setFilterStatus,
    setFilterActive,
    setShowCreatePipelineModal,
    setSelectedPipelineId,
    createPipeline,
    startBuild,
  } = useAutonomousCIStore();

  const pipelines = useFilteredPipelines();
  const loading = useCILoading();

  // Fetch data on mount and project change
  useEffect(() => {
    if (projectId) {
      fetchDashboard(projectId);
      fetchRecentBuilds(projectId, 7);
      fetchFlakyTests(projectId);
    }
  }, [projectId, fetchDashboard, fetchRecentBuilds, fetchFlakyTests]);

  const handleCreatePipeline = async (data: {
    name: string;
    description?: string;
    triggerType: string;
    scheduleCron?: string;
  }) => {
    await createPipeline({
      projectId,
      name: data.name,
      description: data.description,
      triggerType: data.triggerType,
      scheduleCron: data.scheduleCron,
    });
  };

  const handleStartBuild = async (pipelineId: string) => {
    await startBuild(pipelineId, projectId);
  };

  const filterOptions: Array<{ value: 'all' | BuildStatus; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'success', label: 'Passing' },
    { value: 'failure', label: 'Failing' },
    { value: 'running', label: 'Running' },
  ];

  if (loading && pipelines.length === 0) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="ci-dashboard-loading">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-gray-400">Loading CI dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="autonomous-ci-dashboard">
      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-500/20 border border-red-500/40 rounded-lg flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-400">Error</h3>
              <p className="text-red-400/80 text-sm">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Filter buttons */}
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilterStatus(option.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filterStatus === option.value
                  ? 'bg-amber-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
              data-testid={`filter-${option.value}`}
            >
              {option.label}
            </button>
          ))}

          <div className="w-px h-6 bg-white/10 mx-2" />

          {/* Active only toggle */}
          <button
            onClick={() => setFilterActive(!filterActive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
              filterActive
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
            data-testid="toggle-active-filter"
          >
            <Activity className="w-4 h-4" />
            Active Only
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={() => fetchDashboard(projectId)}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Refresh"
            data-testid="refresh-dashboard-btn"
          >
            <RefreshCw className={`w-5 h-5 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Create pipeline button */}
          <button
            onClick={() => setShowCreatePipelineModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg
              bg-gradient-to-r from-amber-500 to-orange-500
              hover:from-amber-600 hover:to-orange-600
              text-white font-medium transition-all shadow-lg shadow-amber-500/20"
            data-testid="create-pipeline-btn"
          >
            <Plus className="w-5 h-5" />
            New Pipeline
          </button>
        </div>
      </div>

      {/* Dashboard stats */}
      {stats && <CIDashboardStats stats={stats} />}

      {/* Main content grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Pipelines */}
        <div className="col-span-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-amber-400" />
              Pipelines
            </h2>
            <span className="text-sm text-gray-500">
              {pipelines.length} pipeline{pipelines.length !== 1 ? 's' : ''}
            </span>
          </div>

          {pipelines.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {pipelines.map((pipeline) => (
                <PipelineCard
                  key={pipeline.id}
                  pipeline={pipeline}
                  isSelected={selectedPipelineId === pipeline.id}
                  onSelect={setSelectedPipelineId}
                  onStartBuild={handleStartBuild}
                  onConfigure={(id) => {
                    // TODO: Open config modal
                  }}
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 rounded-xl border border-white/10 bg-white/5"
            >
              <GitBranch className="w-16 h-16 text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-300 mb-2">No Pipelines Yet</h3>
              <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
                Create your first CI pipeline to start automating builds and tests.
              </p>
              <button
                onClick={() => setShowCreatePipelineModal(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-lg
                  bg-gradient-to-r from-amber-500 to-orange-500
                  text-white font-medium transition-all"
                data-testid="create-first-pipeline-btn"
              >
                <Plus className="w-5 h-5" />
                Create Pipeline
              </button>
            </motion.div>
          )}
        </div>

        {/* Recent builds sidebar */}
        <div className="col-span-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              Recent Builds
            </h2>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <BuildHistoryList builds={builds} maxItems={8} />
          </div>
        </div>
      </div>

      {/* Create pipeline modal */}
      <CreatePipelineModal
        isOpen={showCreatePipelineModal}
        onClose={() => setShowCreatePipelineModal(false)}
        onCreate={handleCreatePipeline}
        isLoading={loading}
      />
    </div>
  );
}
