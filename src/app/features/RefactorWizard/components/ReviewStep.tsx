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
    setCurrentStep('package');
  };

  const handleSelectAll = () => {
    // Select only filtered opportunities (not all opportunities)
    filteredOpportunities.forEach(opp => {
      if (!selectedOpportunities.has(opp.id)) {
        toggleOpportunity(opp.id);
      }
    });
  };

  return (
    <StepContainer
      title="Review Opportunities"
      description={`Found ${opportunities.length} refactoring opportunities`}
      icon={CheckSquare}
      currentStep={4}
      totalSteps={7}
      isLoading={false}
      data-testid="review-step-container"
    >
      {/* Stats Header with Actions */}
      <div className="flex items-center justify-between gap-6">
        {/* Selected Count */}
        <div className="text-center p-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl">
          <p className="text-cyan-400 text-4xl font-light mb-1">
            {selectedOpportunities.size}
          </p>
          <p className="text-gray-400 text-sm">opportunities selected</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            {/* Skip to Execute (Legacy mode) */}
            <button
              onClick={() => {
                // Auto-select all packages and skip to execute
                const store = useRefactorStore.getState();
                store.selectAllPackages();
                store.setCurrentStep('execute');
              }}
              disabled={selectedOpportunities.size === 0}
              className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="skip-package-step-top"
              title="Skip package selection and execute all refactorings"
            >
              Skip to Execute (Legacy)
            </button>

            <button
              onClick={handleContinue}
              disabled={selectedOpportunities.size === 0}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/30 disabled:shadow-none flex items-center space-x-2"
              data-testid="continue-to-packages-top"
            >
              <span>Continue to Packages</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-500 text-xs text-right">
            Select opportunities below, then continue to package them strategically
          </p>
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
            onClick={handleSelectAll}
            className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 transition-all"
            data-testid="select-all-opportunities"
            title={
              filterCategory !== 'all' || filterSeverity !== 'all'
                ? `Select all ${filteredOpportunities.length} filtered opportunities`
                : `Select all ${opportunities.length} opportunities`
            }
          >
            {filterCategory !== 'all' || filterSeverity !== 'all'
              ? `Select Filtered (${filteredOpportunities.length})`
              : 'Select All'}
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

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <button
          onClick={() => setCurrentStep('scan')}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all"
          data-testid="back-to-scan-button"
        >
          Back
        </button>

        <p className="text-gray-500 text-sm">
          {selectedOpportunities.size > 0
            ? `${selectedOpportunities.size} selected • Continue at the top ↑`
            : 'Select opportunities above to continue'}
        </p>
      </div>
    </StepContainer>
  );
}
