'use client';

import { useRefactorStore } from '@/stores/refactorStore';
import { useMemo } from 'react';
import {
  ArrowRight,
  Info,
  Filter,
  CheckSquare,
  ArrowLeft,
  Package,
  FileCode,
  AlertTriangle,
  Layers,
  FolderTree,
  Zap
} from 'lucide-react';
import { StepContainer, CyberCard, StepHeader } from '@/components/ui/wizard';
import { VirtualizedOpportunityList } from './VirtualizedOpportunityList';
import { UniversalSelect } from '@/components/ui/UniversalSelect';

export default function ReviewStep() {
  const {
    opportunities,
    selectedOpportunities,
    toggleOpportunity,
    clearSelection,
    filterCategory,
    filterSeverity,
    setFilterCategory,
    setFilterSeverity,
    setCurrentStep,
    packages,
    selectedPackages,
    selectedFolders,
    clearPackages,
  } = useRefactorStore();

  // Get opportunities from selected packages if packages exist and are selected
  // Otherwise show all opportunities (from scan results)
  const displayOpportunities = useMemo(() => {
    // If we have packages and some are selected, show only those opportunities
    if (packages.length > 0 && selectedPackages.size > 0) {
      const selectedPkgs = packages.filter(p => selectedPackages.has(p.id));
      const pkgOppIds = new Set(selectedPkgs.flatMap(p => p.opportunities.map(o => o.id)));
      // Filter from main opportunities list using package opportunity IDs
      const filtered = opportunities.filter(o => pkgOppIds.has(o.id));
      // If filtering yields results, use them; otherwise fall back to all
      return filtered.length > 0 ? filtered : opportunities;
    }
    // Default: show all opportunities from the scan
    return opportunities;
  }, [opportunities, packages, selectedPackages]);

  const filteredOpportunities = useMemo(() => {
    return displayOpportunities.filter(opp => {
      const categoryMatch = filterCategory === 'all' || opp.category === filterCategory;
      const severityMatch = filterSeverity === 'all' || opp.severity === filterSeverity;
      return categoryMatch && severityMatch;
    });
  }, [displayOpportunities, filterCategory, filterSeverity]);

  // Get summary stats
  const stats = useMemo(() => {
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const files = new Set<string>();

    displayOpportunities.forEach(opp => {
      byCategory[opp.category] = (byCategory[opp.category] || 0) + 1;
      bySeverity[opp.severity] = (bySeverity[opp.severity] || 0) + 1;
      opp.files.forEach(f => files.add(f));
    });

    return {
      total: displayOpportunities.length,
      byCategory,
      bySeverity,
      fileCount: files.size,
      critical: bySeverity['critical'] || 0,
      high: bySeverity['high'] || 0,
    };
  }, [displayOpportunities]);

  const handleContinue = () => {
    if (selectedOpportunities.size === 0) {
      alert('Please select at least one opportunity');
      return;
    }
    setCurrentStep('package');
  };

  // Skip packaging and go directly to execute step
  const handleSkipPackaging = () => {
    if (selectedOpportunities.size === 0) {
      alert('Please select at least one opportunity');
      return;
    }
    // Clear any existing packages so ExecuteStep knows we're in direct mode
    clearPackages();
    setCurrentStep('execute');
  };

  const handleSelectAll = () => {
    filteredOpportunities.forEach(opp => {
      if (!selectedOpportunities.has(opp.id)) {
        toggleOpportunity(opp.id);
      }
    });
  };

  const handleSelectByCategory = (category: string) => {
    displayOpportunities
      .filter(o => o.category === category)
      .forEach(opp => {
        if (!selectedOpportunities.has(opp.id)) {
          toggleOpportunity(opp.id);
        }
      });
  };

  const hasPackageContext = packages.length > 0 && selectedPackages.size > 0;
  const selectedPkgs = packages.filter(p => selectedPackages.has(p.id));

  return (
    <StepContainer
      isLoading={false}
      data-testid="review-step-container"
    >
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentStep('plan')}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          data-testid="review-back-button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSkipPackaging}
            disabled={selectedOpportunities.size === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="skip-packaging-button"
            title="Create requirement files directly without AI packaging (max 20 issues per file)"
          >
            <Zap className="w-4 h-4" />
            Quick Export
          </button>
          <button
            onClick={handleContinue}
            disabled={selectedOpportunities.size === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="continue-to-package-top"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <StepHeader
        title="Review Opportunities"
        description={`${stats.total} refactoring opportunities found across ${stats.fileCount} files`}
        icon={CheckSquare}
        currentStep={4}
        totalSteps={7}
      />

      {/* Context Banner */}
      {(selectedFolders.length > 0 || hasPackageContext) && (
        <CyberCard variant="dark" className="!p-4 mb-6">
          <div className="flex items-center gap-4 text-sm">
            {selectedFolders.length > 0 && (
              <div className="flex items-center gap-2 text-cyan-400">
                <FolderTree className="w-4 h-4" />
                <span>Scoped to {selectedFolders.length} folder(s)</span>
              </div>
            )}
            {hasPackageContext && (
              <div className="flex items-center gap-2 text-purple-400">
                <Package className="w-4 h-4" />
                <span>{selectedPkgs.length} package(s) selected</span>
              </div>
            )}
          </div>
        </CyberCard>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <CyberCard variant="dark" className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Layers className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-gray-400">Total Issues</p>
            </div>
          </div>
        </CyberCard>

        <CyberCard variant="dark" className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <FileCode className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.fileCount}</p>
              <p className="text-xs text-gray-400">Files Affected</p>
            </div>
          </div>
        </CyberCard>

        <CyberCard variant="dark" className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.critical + stats.high}</p>
              <p className="text-xs text-gray-400">High Priority</p>
            </div>
          </div>
        </CyberCard>

        <CyberCard variant="dark" className="!p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckSquare className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{selectedOpportunities.size}</p>
              <p className="text-xs text-gray-400">Selected</p>
            </div>
          </div>
        </CyberCard>
      </div>

      {/* Category Quick Selection */}
      {Object.keys(stats.byCategory).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-xs text-gray-400 self-center mr-2">Quick select:</span>
          {Object.entries(stats.byCategory).map(([category, count]) => (
            <button
              key={category}
              onClick={() => handleSelectByCategory(category)}
              className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-300 transition-all"
            >
              {category} ({count})
            </button>
          ))}
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />

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
            Select All ({filteredOpportunities.length})
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
      <div data-testid="opportunities-list" className="border border-white/10 rounded-xl overflow-hidden">
        {filteredOpportunities.length > 0 ? (
          <VirtualizedOpportunityList
            opportunities={filteredOpportunities}
            selectedOpportunities={selectedOpportunities}
            onToggle={toggleOpportunity}
            height={400}
            itemHeight={140}
          />
        ) : (
          <div className="text-center py-12 bg-black/20">
            <Info className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-2">
              {displayOpportunities.length === 0
                ? 'No opportunities found in the scan results'
                : 'No opportunities match your filters'}
            </p>
            {displayOpportunities.length === 0 && (
              <button
                onClick={() => setCurrentStep('scan')}
                className="text-cyan-400 text-sm hover:underline"
              >
                Go back to run a new scan
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Info & Quick Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
        <p className="text-gray-500 text-sm">
          {selectedOpportunities.size > 0
            ? `${selectedOpportunities.size} opportunities selected`
            : 'Select opportunities to continue'}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSkipPackaging}
            disabled={selectedOpportunities.size === 0}
            className="px-4 py-2 text-sm text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Skip AI packaging and batch opportunities into requirement files (max 20 per file)"
          >
            <Zap className="w-4 h-4" />
            Quick Export ({Math.ceil(selectedOpportunities.size / 20)} files)
          </button>
          <button
            onClick={handleContinue}
            disabled={selectedOpportunities.size === 0}
            className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-cyan-500/30 disabled:shadow-none flex items-center gap-2"
            data-testid="continue-to-package"
          >
            <Package className="w-4 h-4" />
            AI Packaging
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </StepContainer>
  );
}
