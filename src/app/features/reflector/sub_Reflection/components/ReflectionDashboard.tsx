'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import FilterPanel from './FilterPanel';
import ScanTypeCard from './ScanTypeCard';
import AcceptanceChart from './AcceptanceChart';
import EffortImpactMatrix from './EffortImpactMatrix';
import KPISummaryCards from './KPISummaryCards';
import { FilterState, ReflectionStats } from '../lib/types';
import { fetchReflectionStats } from '../lib/statsApi';
import { useProjectConfigStore } from '@/stores/projectConfigStore';

interface Context {
  id: string;
  name: string;
  project_id: string;
}

export default function ReflectionDashboard() {
  const [stats, setStats] = useState<ReflectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contexts, setContexts] = useState<Context[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    projectId: null,
    contextId: null
  });

  const { projects, initializeProjects } = useProjectConfigStore();

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
      const data = await fetchReflectionStats(filters.projectId, filters.contextId);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
      console.error('Error loading stats:', err);
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
        const mappedContexts = data.data.contexts.map((ctx: any) => ({
          id: ctx.id,
          name: ctx.name,
          project_id: ctx.project_id
        }));
        setContexts(mappedContexts);
      }
    } catch (err) {
      console.error('Error loading contexts:', err);
      setContexts([]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
        <span className="ml-3 text-gray-400">Loading reflection dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <span className="ml-3 text-red-400">{error}</span>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <FilterPanel
        filters={filters}
        onFilterChange={setFilters}
        projects={projects}
        contexts={contexts}
      />

      {/* KPI Summary Cards */}
      <KPISummaryCards stats={stats} />

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
              />
            ))}
        </div>
      </motion.div>

      {/* Effort vs Impact Matrix */}
      <EffortImpactMatrix filters={filters} />
    </div>
  );
}
