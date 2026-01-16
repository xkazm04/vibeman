'use client';
import { useRefactorStore } from '@/stores/refactorStore';
import { useMemo, useState } from 'react';
import { Info, CheckSquare, FolderTree, Package, Network, Eye } from 'lucide-react';
import { StepContainer, CyberCard, StepHeader } from '@/components/ui/wizard';
import { VirtualizedOpportunityList } from '../../components/VirtualizedOpportunityList';
import CommunityPatternRecommendations from '@/app/features/Marketplace/components/CommunityPatternRecommendations';
import type { PatternCategory } from '@/app/db/models/marketplace.types';
import { ReviewStatsGrid } from './sub_ReviewStep/ReviewStatsGrid';
import { ReviewFilters } from './sub_ReviewStep/ReviewFilters';
import { ReviewActionBar, ReviewBottomBar } from './sub_ReviewStep/ReviewActionBar';
import ReviewToolbar from '../../components/ReviewToolbar';
import { useResultsController } from '../../results/hooks/useResultsController';
import { ImpactVisualization } from '../../sub_Impact';

/** ReviewStep - Fourth step (4/7) of the RefactorWizard workflow. */
export default function ReviewStep() {
  const { opportunities, selectedOpportunities, toggleOpportunity, clearSelection, filterCategory,
    filterSeverity, setFilterCategory, setFilterSeverity, setCurrentStep, packages, selectedPackages,
    selectedFolders, clearPackages } = useRefactorStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showImpactViz, setShowImpactViz] = useState(false);

  const displayOpportunities = useMemo(() => {
    if (packages.length > 0 && selectedPackages.size > 0) {
      const pkgOppIds = new Set(packages.filter(p => selectedPackages.has(p.id)).flatMap(p => p.opportunities.map(o => o.id)));
      const filtered = opportunities.filter(o => pkgOppIds.has(o.id));
      return filtered.length > 0 ? filtered : opportunities;
    }
    return opportunities;
  }, [opportunities, packages, selectedPackages]);

  const controller = useResultsController(displayOpportunities);
  const filteredOpportunities = useMemo(() => {
    const ids = controller.getFilteredIds(filterSeverity, filterCategory, searchTerm);
    return displayOpportunities.filter(o => ids.includes(o.id));
  }, [controller, displayOpportunities, filterSeverity, filterCategory, searchTerm]);

  const stats = useMemo(() => {
    const byCategory: Record<string, number> = {}, bySeverity: Record<string, number> = {}, files = new Set<string>();
    displayOpportunities.forEach(opp => {
      byCategory[opp.category] = (byCategory[opp.category] || 0) + 1;
      bySeverity[opp.severity] = (bySeverity[opp.severity] || 0) + 1;
      opp.files.forEach(f => files.add(f));
    });
    return { total: displayOpportunities.length, byCategory, bySeverity, fileCount: files.size, critical: bySeverity['critical'] || 0, high: bySeverity['high'] || 0 };
  }, [displayOpportunities]);

  const handleContinue = () => { if (selectedOpportunities.size === 0) { alert('Please select at least one opportunity'); return; } setCurrentStep('package'); };
  const handleSkipPackaging = () => { if (selectedOpportunities.size === 0) { alert('Please select at least one opportunity'); return; } clearPackages(); setCurrentStep('execute'); };
  const handleSelectAll = () => filteredOpportunities.forEach(opp => { if (!selectedOpportunities.has(opp.id)) toggleOpportunity(opp.id); });
  const handleSelectByCategory = (category: string) => displayOpportunities.filter(o => o.category === category).forEach(opp => { if (!selectedOpportunities.has(opp.id)) toggleOpportunity(opp.id); });
  const hasPackageContext = packages.length > 0 && selectedPackages.size > 0;
  const selectedPkgs = packages.filter(p => selectedPackages.has(p.id));
  const categoryMap: Record<string, PatternCategory> = { 'performance': 'performance', 'maintainability': 'cleanup', 'security': 'security', 'code-quality': 'best-practices', 'duplication': 'cleanup', 'architecture': 'architecture' };

  return (
    <StepContainer isLoading={false} data-testid="review-step-container">
      <ReviewActionBar selectedCount={selectedOpportunities.size} onBack={() => setCurrentStep('plan')}
        onContinue={handleContinue} onSkipPackaging={handleSkipPackaging} />
      <StepHeader title="Review Opportunities" icon={CheckSquare} currentStep={4} totalSteps={7}
        description={`${stats.total} refactoring opportunities found across ${stats.fileCount} files`} />
      {(selectedFolders.length > 0 || hasPackageContext) && (
        <CyberCard variant="dark" className="!p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              {selectedFolders.length > 0 && <div className="flex items-center gap-2 text-cyan-400"><FolderTree className="w-4 h-4" /><span>Scoped to {selectedFolders.length} folder(s)</span></div>}
              {hasPackageContext && <div className="flex items-center gap-2 text-purple-400"><Package className="w-4 h-4" /><span>{selectedPkgs.length} package(s) selected</span></div>}
            </div>
            {selectedOpportunities.size > 0 && (
              <button
                onClick={() => setShowImpactViz(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 rounded-lg hover:border-purple-400/50 transition-colors"
              >
                <Network className="w-4 h-4 text-purple-400" />
                <span className="text-purple-300">View Impact</span>
              </button>
            )}
          </div>
        </CyberCard>
      )}
      <ReviewStatsGrid stats={stats} selectedCount={selectedOpportunities.size} />
      <ReviewFilters filterCategory={filterCategory} filterSeverity={filterSeverity}
        onCategoryChange={setFilterCategory} onSeverityChange={setFilterSeverity}
        filteredCount={filteredOpportunities.length} byCategory={stats.byCategory}
        onSelectByCategory={handleSelectByCategory} onSelectAll={handleSelectAll} onClearSelection={clearSelection} />
      <ReviewToolbar selectedCount={selectedOpportunities.size} filteredCount={filteredOpportunities.length} onSelectAll={handleSelectAll} onClearSelection={clearSelection} onSearchChange={setSearchTerm} />
      <div className="mb-6">
        <CommunityPatternRecommendations categories={Object.keys(stats.byCategory).map(cat => categoryMap[cat] || 'best-practices') as PatternCategory[]}
          language="typescript" framework="nextjs" maxRecommendations={3} />
      </div>
      <div data-testid="opportunities-list" className="border border-white/10 rounded-xl overflow-hidden">
        {filteredOpportunities.length > 0 ? (
          <VirtualizedOpportunityList opportunities={filteredOpportunities} selectedOpportunities={selectedOpportunities}
            onToggle={toggleOpportunity} height={400} itemHeight={140} />
        ) : (
          <div className="text-center py-12 bg-black/20">
            <Info className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-2">{displayOpportunities.length === 0 ? 'No opportunities found in the scan results' : 'No opportunities match your filters'}</p>
            {displayOpportunities.length === 0 && <button onClick={() => setCurrentStep('scan')} className="text-cyan-400 text-sm hover:underline">Go back to run a new scan</button>}
          </div>
        )}
      </div>
      {/* Impact Visualization Button - shown when no context card but opportunities selected */}
      {!(selectedFolders.length > 0 || hasPackageContext) && selectedOpportunities.size > 0 && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowImpactViz(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 rounded-lg hover:border-purple-400/50 transition-colors"
          >
            <Network className="w-4 h-4 text-purple-400" />
            <span className="text-purple-300">View Impact Analysis</span>
            <Eye className="w-4 h-4 text-cyan-400" />
          </button>
        </div>
      )}
      <ReviewBottomBar selectedCount={selectedOpportunities.size} onContinue={handleContinue} onSkipPackaging={handleSkipPackaging} />

      {/* Impact Visualization Modal */}
      <ImpactVisualization
        opportunities={displayOpportunities}
        selectedOpportunities={selectedOpportunities}
        isOpen={showImpactViz}
        onClose={() => setShowImpactViz(false)}
      />
    </StepContainer>
  );
}
