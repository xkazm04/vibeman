'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Map,
  Sparkles,
  Filter,
  Eye,
  EyeOff,
  LayoutGrid,
  Calendar,
  GitBranch,
  Target,
} from 'lucide-react';
import {
  useStrategicRoadmapStore,
  type ViewMode,
  type FilterType,
} from '@/stores/strategicRoadmapStore';

interface RoadmapHeaderProps {
  projectId: string;
  onGenerate: () => void;
}

export default function RoadmapHeader({ projectId, onGenerate }: RoadmapHeaderProps) {
  const {
    viewMode,
    setViewMode,
    filterType,
    setFilterType,
    showPredictions,
    togglePredictions,
    showInteractions,
    toggleInteractions,
    isGenerating,
    summary,
  } = useStrategicRoadmapStore();

  const viewModes: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'timeline', icon: <Map className="w-4 h-4" />, label: 'Timeline' },
    { mode: 'kanban', icon: <LayoutGrid className="w-4 h-4" />, label: 'Kanban' },
    { mode: 'calendar', icon: <Calendar className="w-4 h-4" />, label: 'Calendar' },
    { mode: 'matrix', icon: <Target className="w-4 h-4" />, label: 'Matrix' },
  ];

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'feature', label: 'Features' },
    { value: 'refactoring', label: 'Refactoring' },
    { value: 'debt_reduction', label: 'Debt Reduction' },
    { value: 'security', label: 'Security' },
    { value: 'performance', label: 'Performance' },
    { value: 'infrastructure', label: 'Infrastructure' },
  ];

  return (
    <div className="flex flex-col gap-4 p-6 border-b border-gray-700/50">
      {/* Title Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg">
            <Map className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Strategic Roadmap</h1>
            <p className="text-sm text-gray-400">
              6-month predictive development planning
            </p>
          </div>
        </div>

        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg
            bg-gradient-to-r from-cyan-500 to-blue-500
            hover:from-cyan-600 hover:to-blue-600
            text-white font-medium transition-all
            disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="generate-roadmap-btn"
        >
          <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Generating...' : 'Generate Roadmap'}
        </button>
      </div>

      {/* Stats Row */}
      {summary && (
        <div className="grid grid-cols-5 gap-4">
          <StatCard
            label="Health Score"
            value={summary.healthScore}
            suffix="%"
            trend={summary.predictions.debtTrend === 'improving' ? 'up' : summary.predictions.debtTrend === 'worsening' ? 'down' : 'stable'}
            color="cyan"
          />
          <StatCard
            label="Initiatives"
            value={summary.initiatives.total}
            color="blue"
          />
          <StatCard
            label="Synergies"
            value={summary.interactions.synergies}
            color="emerald"
          />
          <StatCard
            label="Conflicts"
            value={summary.interactions.conflicts}
            color="red"
          />
          <StatCard
            label="Risk Level"
            value={summary.predictions.riskLevel}
            isText
            color={summary.predictions.riskLevel === 'low' ? 'emerald' : summary.predictions.riskLevel === 'medium' ? 'yellow' : 'red'}
          />
        </div>
      )}

      {/* Controls Row */}
      <div className="flex items-center justify-between">
        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 p-1 bg-gray-800/50 rounded-lg">
          {viewModes.map(({ mode, icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all
                ${viewMode === mode
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-400 hover:text-gray-300'
                }`}
              data-testid={`view-mode-${mode}-btn`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Filters and Toggles */}
        <div className="flex items-center gap-3">
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="px-3 py-1.5 bg-gray-800/50 border border-gray-700/50 rounded-lg
                text-sm text-gray-300 focus:outline-none focus:border-cyan-500/50"
              data-testid="filter-type-select"
            >
              {filterOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Buttons */}
          <button
            onClick={togglePredictions}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all
              ${showPredictions
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-gray-800/50 text-gray-400 border border-gray-700/50'
              }`}
            data-testid="toggle-predictions-btn"
          >
            {showPredictions ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            Predictions
          </button>

          <button
            onClick={toggleInteractions}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all
              ${showInteractions
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-gray-800/50 text-gray-400 border border-gray-700/50'
              }`}
            data-testid="toggle-interactions-btn"
          >
            <GitBranch className="w-4 h-4" />
            Interactions
          </button>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  suffix?: string;
  trend?: 'up' | 'down' | 'stable';
  isText?: boolean;
  color: string;
}

function StatCard({ label, value, suffix, trend, isText, color }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-lg border ${colorClasses[color]}`}
    >
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-bold ${isText ? 'capitalize' : ''}`}>
          {value}
        </span>
        {suffix && <span className="text-sm">{suffix}</span>}
        {trend && (
          <span className={`text-xs ml-1 ${
            trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </span>
        )}
      </div>
    </motion.div>
  );
}
