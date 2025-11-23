'use client';

import { useRefactorStore } from '@/stores/refactorStore';
import { useMemo } from 'react';
import {
  ArrowRight,
  Info,
  Filter,
  CheckSquare,
  ArrowLeft,
  Package
} from 'lucide-react';
import { StepContainer } from '@/components/ui/wizard';
import { StepHeader } from '@/components/ui/wizard/StepHeader';
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
    // New package state
    packages,
    selectedPackages,
  } = useRefactorStore();

  // Get the currently selected package (assuming single selection for detail view)
  // If multiple are selected, we might want to show a combined view or just the first one
  // For now, let's assume we're viewing the "active" package or all selected packages
  // But wait, the store doesn't have an "activePackage" concept, just "selectedPackages".
  // Let's infer the context: if we came from PlanStep, we likely want to review ALL selected packages
  // OR we want to review the specific one we clicked.

  // Let's assume we show ALL selected packages' opportunities.
  const activePackageIds = Array.from(selectedPackages);
  const activePackages = packages.filter(p => selectedPackages.has(p.id));

  // Filter opportunities to only those in the selected packages
  const packageOpportunities = useMemo(() => {
    if (activePackages.length === 0) return opportunities; // Fallback to all if none selected (legacy behavior)

    const pkgOppIds = new Set(activePackages.flatMap(p => p.opportunities.map(o => o.id)));
    return opportunities.filter(o => pkgOppIds.has(o.id));
  }, [opportunities, activePackages]);

  const filteredOpportunities = useMemo(() => {
    return packageOpportunities.filter(opp => {
      const categoryMatch = filterCategory === 'all' || opp.category === filterCategory;
      const severityMatch = filterSeverity === 'all' || opp.severity === filterSeverity;
      return categoryMatch && severityMatch;
    });
  }, [packageOpportunities, filterCategory, filterSeverity]);

  const handleContinue = () => {
    if (selectedOpportunities.size === 0) {
      alert('Please select at least one opportunity');
      return;
    }
    setCurrentStep('execute'); // Skip package step (legacy) -> Go straight to execute
    // In the new flow, "PackageStep" is replaced by "PlanStep", so we go to Execute.
  };

  const handleSelectAll = () => {
    // Select only filtered opportunities
    filteredOpportunities.forEach(opp => {
      if (!selectedOpportunities.has(opp.id)) {
        toggleOpportunity(opp.id);
      }
    });
  };

  const packageName = activePackages.length === 1
    ? activePackages[0].name
    : `${activePackages.length} Packages Selected`;

  const packageDescription = activePackages.length === 1
    ? activePackages[0].description
    : 'Review opportunities across selected packages';

  return (
    <StepContainer
      isLoading={false}
      data-testid="review-step-container"
    >
      <StepHeader
        title={activePackages.length > 0 ? packageName : "Review Opportunities"}
        description={activePackages.length > 0 ? packageDescription : `Found ${opportunities.length} refactoring opportunities`}
        icon={activePackages.length > 0 ? Package : CheckSquare}
        currentStep={4}
        totalSteps={6}
      />

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
            <button
              onClick={handleContinue}
              disabled={selectedOpportunities.size === 0}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/30 disabled:shadow-none flex items-center space-x-2"
              data-testid="continue-to-execute-top"
            >
              <span>Continue to Execute</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-500 text-xs text-right">
            Review and fine-tune selected issues before execution
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

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <button
          onClick={() => setCurrentStep('plan')}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all flex items-center gap-2"
          data-testid="back-to-plan-button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Plan
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
