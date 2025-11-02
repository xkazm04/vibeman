'use client';

import { motion } from 'framer-motion';
import { useRefactorStore } from '@/stores/refactorStore';
import { useMemo } from 'react';
import {
  CheckSquare,
  Square,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
  Info,
  Zap,
  FileCode,
  Filter
} from 'lucide-react';

const severityIcons = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: Info,
  low: Zap,
};

const severityColors = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  low: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
};

const categoryColors = {
  performance: 'bg-green-500/20 text-green-300',
  maintainability: 'bg-blue-500/20 text-blue-300',
  security: 'bg-red-500/20 text-red-300',
  'code-quality': 'bg-purple-500/20 text-purple-300',
  duplication: 'bg-orange-500/20 text-orange-300',
  architecture: 'bg-cyan-500/20 text-cyan-300',
};

export default function ReviewStep() {
  const {
    opportunities,
    selectedOpportunities,
    toggleOpportunity,
    selectAllOpportunities,
    clearSelection,
    filterCategory,
    filterSeverity,
    setFilterCategory,
    setFilterSeverity,
    generateScript,
    setCurrentStep,
  } = useRefactorStore();

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => {
      const categoryMatch = filterCategory === 'all' || opp.category === filterCategory;
      const severityMatch = filterSeverity === 'all' || opp.severity === filterSeverity;
      return categoryMatch && severityMatch;
    });
  }, [opportunities, filterCategory, filterSeverity]);

  const handleNext = async () => {
    if (selectedOpportunities.size === 0) {
      alert('Please select at least one opportunity');
      return;
    }
    await generateScript();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-light text-white mb-2">Review Opportunities</h3>
          <p className="text-gray-400 text-sm">
            Found {opportunities.length} refactoring opportunities
          </p>
        </div>
        <div className="text-right">
          <p className="text-cyan-400 text-2xl font-light">
            {selectedOpportunities.size}
          </p>
          <p className="text-gray-400 text-xs">selected</p>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as any)}
            className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Categories</option>
            <option value="performance">Performance</option>
            <option value="maintainability">Maintainability</option>
            <option value="security">Security</option>
            <option value="code-quality">Code Quality</option>
            <option value="duplication">Duplication</option>
            <option value="architecture">Architecture</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as any)}
            className="bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={selectAllOpportunities}
            className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 transition-all"
            data-testid="select-all-opportunities"
          >
            Select All
          </button>
          <button
            onClick={clearSelection}
            className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 transition-all"
            data-testid="clear-selection"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Opportunities List */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {filteredOpportunities.map((opp, index) => {
          const isSelected = selectedOpportunities.has(opp.id);
          const SeverityIcon = severityIcons[opp.severity];

          return (
            <motion.div
              key={opp.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => toggleOpportunity(opp.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'bg-cyan-500/10 border-cyan-500/40'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
              data-testid={`opportunity-${opp.id}`}
            >
              <div className="flex items-start space-x-3">
                {/* Checkbox */}
                <div className="mt-1">
                  {isSelected ? (
                    <CheckSquare className="w-5 h-5 text-cyan-400" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-500" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="text-white font-medium">{opp.title}</h4>
                    <div className={`px-2 py-1 rounded text-xs border ${severityColors[opp.severity]}`}>
                      <SeverityIcon className="w-3 h-3 inline mr-1" />
                      {opp.severity}
                    </div>
                  </div>

                  <p className="text-gray-400 text-sm mb-3">{opp.description}</p>

                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Category Badge */}
                    <span className={`px-2 py-1 rounded-md text-xs ${categoryColors[opp.category]}`}>
                      {opp.category}
                    </span>

                    {/* Effort Badge */}
                    <span className="px-2 py-1 bg-white/10 text-gray-300 rounded-md text-xs">
                      Effort: {opp.effort}
                    </span>

                    {/* Files */}
                    <span className="flex items-center text-gray-400 text-xs">
                      <FileCode className="w-3 h-3 mr-1" />
                      {opp.files.length} file{opp.files.length !== 1 ? 's' : ''}
                    </span>

                    {/* Auto-fix indicator */}
                    {opp.autoFixAvailable && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded-md text-xs">
                        Auto-fix available
                      </span>
                    )}

                    {/* Time estimate */}
                    {opp.estimatedTime && (
                      <span className="text-gray-500 text-xs">
                        ~{opp.estimatedTime}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {filteredOpportunities.length === 0 && (
          <div className="text-center py-12">
            <Info className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No opportunities match your filters</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <button
          onClick={() => setCurrentStep('scan')}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all"
        >
          Back
        </button>

        <button
          onClick={handleNext}
          disabled={selectedOpportunities.size === 0}
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/30 disabled:shadow-none flex items-center space-x-2"
          data-testid="generate-refactor-script"
        >
          <span>Generate Script</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}
