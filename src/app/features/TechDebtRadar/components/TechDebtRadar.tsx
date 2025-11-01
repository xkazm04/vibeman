'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Scan, Filter, TrendingUp } from 'lucide-react';
import TechDebtCard from './TechDebtCard';
import TechDebtDetailModal from './TechDebtDetailModal';
import TechDebtStatsPanel from './TechDebtStatsPanel';
import type { DbTechDebt, TechDebtStats, TechDebtCategory, TechDebtSeverity, TechDebtStatus } from '@/app/db/models/tech-debt.types';

interface TechDebtRadarProps {
  projectId: string;
}

export default function TechDebtRadar({ projectId }: TechDebtRadarProps) {
  const [techDebtItems, setTechDebtItems] = useState<DbTechDebt[]>([]);
  const [stats, setStats] = useState<TechDebtStats | null>(null);
  const [selectedItem, setSelectedItem] = useState<DbTechDebt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<TechDebtCategory[]>([]);
  const [severityFilter, setSeverityFilter] = useState<TechDebtSeverity[]>([]);
  const [statusFilter, setStatusFilter] = useState<TechDebtStatus[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Load tech debt
  const loadTechDebt = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ projectId });
      if (categoryFilter.length > 0) params.set('category', categoryFilter.join(','));
      if (severityFilter.length > 0) params.set('severity', severityFilter.join(','));
      if (statusFilter.length > 0) params.set('status', statusFilter.join(','));

      const [itemsRes, statsRes] = await Promise.all([
        fetch(`/api/tech-debt?${params.toString()}`),
        fetch(`/api/tech-debt/stats?projectId=${projectId}`)
      ]);

      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setTechDebtItems(data.techDebt || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading tech debt:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadTechDebt();
    }
  }, [projectId, categoryFilter, severityFilter, statusFilter]);

  // Run scan
  const runScan = async () => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/tech-debt/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          scanTypes: [
            'code_quality',
            'security',
            'performance',
            'testing',
            'documentation',
            'dependencies',
            'architecture',
            'maintainability',
            'accessibility'
          ],
          maxItems: 50,
          autoCreateBacklog: false
        })
      });

      if (res.ok) {
        await loadTechDebt();
      }
    } catch (error) {
      console.error('Error running scan:', error);
    } finally {
      setIsScanning(false);
    }
  };

  // Create backlog item
  const handleCreateBacklog = async (techDebtId: string) => {
    try {
      const res = await fetch('/api/tech-debt/create-backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ techDebtId })
      });

      if (res.ok) {
        await loadTechDebt();
      }
    } catch (error) {
      console.error('Error creating backlog item:', error);
    }
  };

  const filteredItems = techDebtItems;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-lg">
            <Target className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Tech Debt Radar</h1>
            <p className="text-sm text-gray-400">
              Monitor and remediate technical debt
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg
              border transition-all ${
                showFilters
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                  : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600'
              }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          <button
            onClick={runScan}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg
              bg-gradient-to-r from-emerald-500 to-teal-500
              hover:from-emerald-600 hover:to-teal-600
              text-white font-medium transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Scan className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Scanning...' : 'Run Scan'}
          </button>
        </div>
      </div>

      {/* Stats Panel */}
      {stats && (
        <div className="p-6 border-b border-gray-700/50">
          <TechDebtStatsPanel stats={stats} />
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="p-6 border-b border-gray-700/50 bg-gray-800/30"
        >
          <div className="grid grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Category
              </label>
              <select
                multiple
                value={categoryFilter}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value) as TechDebtCategory[];
                  setCategoryFilter(values);
                }}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg
                  text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="code_quality">Code Quality</option>
                <option value="security">Security</option>
                <option value="performance">Performance</option>
                <option value="maintainability">Maintainability</option>
                <option value="testing">Testing</option>
                <option value="documentation">Documentation</option>
                <option value="dependencies">Dependencies</option>
                <option value="architecture">Architecture</option>
                <option value="accessibility">Accessibility</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Severity
              </label>
              <select
                multiple
                value={severityFilter}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value) as TechDebtSeverity[];
                  setSeverityFilter(values);
                }}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg
                  text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Status
              </label>
              <select
                multiple
                value={statusFilter}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value) as TechDebtStatus[];
                  setStatusFilter(values);
                }}
                className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg
                  text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="detected">Detected</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tech Debt Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Loading tech debt...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Target className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No technical debt found</p>
            <p className="text-sm">Run a scan to detect issues</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <TechDebtCard
                key={item.id}
                techDebt={item}
                onSelect={() => setSelectedItem(item)}
                onCreateBacklog={() => handleCreateBacklog(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <TechDebtDetailModal
          techDebt={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={loadTechDebt}
        />
      )}
    </div>
  );
}
