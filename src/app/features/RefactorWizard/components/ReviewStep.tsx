'use client';

import { motion } from 'framer-motion';
import { useRefactorStore } from '@/stores/refactorStore';
import { useMemo } from 'react';
import {
  ArrowRight,
  Info,
  Filter
} from 'lucide-react';
import { OpportunityCard } from './OpportunityCard';

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
    setCurrentStep,
  } = useRefactorStore();

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => {
      const categoryMatch = filterCategory === 'all' || opp.category === filterCategory;
      const severityMatch = filterSeverity === 'all' || opp.severity === filterSeverity;
      return categoryMatch && severityMatch;
    });
  }, [opportunities, filterCategory, filterSeverity]);

  const handleContinue = () => {
    if (selectedOpportunities.size === 0) {
      alert('Please select at least one opportunity');
      return;
    }
    setCurrentStep('execute');
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
            data-testid="filter-category-select"
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
            data-testid="filter-severity-select"
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
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2" data-testid="opportunities-list">
        {filteredOpportunities.map((opp, index) => (
          <OpportunityCard
            key={opp.id}
            opportunity={opp}
            isSelected={selectedOpportunities.has(opp.id)}
            index={index}
            onToggle={() => toggleOpportunity(opp.id)}
          />
        ))}

        {filteredOpportunities.length === 0 && (
          <div className="text-center py-12" data-testid="no-opportunities-message">
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
          data-testid="back-to-scan-button"
        >
          Back
        </button>

        <button
          onClick={handleContinue}
          disabled={selectedOpportunities.size === 0}
          className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/30 disabled:shadow-none flex items-center space-x-2"
          data-testid="continue-to-execute"
        >
          <span>Continue</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}
