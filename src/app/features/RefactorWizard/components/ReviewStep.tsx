'use client';

import { useRefactorStore } from '@/stores/refactorStore';
import { useMemo } from 'react';
import {
  ArrowRight,
  Info,
  Filter,
  CheckSquare
} from 'lucide-react';
import { StepContainer } from '@/components/ui/wizard';
import { VirtualizedOpportunityList } from './VirtualizedOpportunityList';
import { UniversalSelect } from '@/components/ui/UniversalSelect';

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
    <StepContainer
      title="Review Opportunities"
      description={`Found ${opportunities.length} refactoring opportunities`}
      icon={CheckSquare}
      currentStep={2}
      totalSteps={4}
      isLoading={false}
      data-testid="review-step-container"
    >
      {/* Stats Header */}
      <div className="flex items-center justify-center">
        <div className="text-center p-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl">
          <p className="text-cyan-400 text-4xl font-light mb-1">
            {selectedOpportunities.size}
          </p>
          <p className="text-gray-400 text-sm">opportunities selected</p>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />

          {/* Category Filter */}
          <UniversalSelect
            value={filterCategory}
            onChange={(value) => setFilterCategory(value as any)}
            options={[
              { value: 'all', label: 'All Categories' },
              { value: 'performance', label: 'Performance' },
              { value: 'maintainability', label: 'Maintainability' },
              { value: 'security', label: 'Security' },
              { value: 'code-quality', label: 'Code Quality' },
              { value: 'duplication', label: 'Duplication' },
              { value: 'architecture', label: 'Architecture' },
            ]}
            variant="default"
            data-testid="filter-category-select"
          />

          {/* Severity Filter */}
          <UniversalSelect
            value={filterSeverity}
            onChange={(value) => setFilterSeverity(value as any)}
            options={[
              { value: 'all', label: 'All Severities' },
              { value: 'critical', label: 'Critical' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
            variant="default"
            data-testid="filter-severity-select"
          />
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
      <div data-testid="opportunities-list">
        {filteredOpportunities.length > 0 ? (
          <VirtualizedOpportunityList
            opportunities={filteredOpportunities}
            selectedOpportunities={selectedOpportunities}
            onToggle={toggleOpportunity}
            height={400}
            itemHeight={140}
          />
        ) : (
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
    </StepContainer>
  );
}
