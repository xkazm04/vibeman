'use client';

import { useRefactorStore } from '@/stores/refactorStore';
import { CheckCircle, Package, TrendingUp, Target, List as ListIcon, ArrowLeft, RotateCcw } from 'lucide-react';
import { StepContainer, CyberCard, StepHeader } from '@/components/ui/wizard';
import { useMemo, useState, useEffect } from 'react';
import { BreakdownCard } from '../../components/BreakdownCard';
import { VirtualizedSuggestionList } from '../../components/VirtualizedSuggestionList';
import ResultsToolbar from '../../components/ResultsToolbar';
import HeroBadge from '../../components/HeroBadge';
import { ResultsSummaryBanner } from './sub_ResultsStep/ResultsSummaryBanner';
import { ResultsStatsGrid } from './sub_ResultsStep/ResultsStatsGrid';
import { ResultsNextSteps } from './sub_ResultsStep/ResultsNextSteps';

/**
 * ResultsStep - Final step (7/7) of the RefactorWizard workflow.
 * Displays a comprehensive summary of the refactoring session.
 */
export default function ResultsStep() {
  const {
    opportunities, selectedOpportunities, packages, selectedPackages,
    closeWizard, resetWizard, setCurrentStep,
  } = useRefactorStore();
  const [showHeroBadge, setShowHeroBadge] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const selectedOpps = useMemo(() =>
    opportunities.filter(o => selectedOpportunities.has(o.id)),
    [opportunities, selectedOpportunities]
  );
  const filteredSelectedOpps = useMemo(() => {
    if (!searchTerm) return selectedOpps;
    const s = searchTerm.toLowerCase();
    return selectedOpps.filter(o => `${o.title} ${o.category} ${o.files.join(' ')}`.toLowerCase().includes(s));
  }, [selectedOpps, searchTerm]);

  const selectedPkgs = useMemo(() =>
    packages.filter(pkg => selectedPackages.has(pkg.id))
      .sort((a, b) => a.executionOrder - b.executionOrder),
    [packages, selectedPackages]
  );

  const summary = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    const packageCategoryCounts: Record<string, number> = {};
    selectedOpps.forEach(opp => { categoryCounts[opp.category] = (categoryCounts[opp.category] || 0) + 1; });
    selectedPkgs.forEach(pkg => { packageCategoryCounts[pkg.category] = (packageCategoryCounts[pkg.category] || 0) + 1; });
    const totalFiles = new Set(selectedOpps.flatMap(o => o.files)).size;
    const totalIssues = selectedPkgs.reduce((sum, pkg) => sum + pkg.issueCount, 0);
    const foundationalPackages = selectedPkgs.filter(pkg => pkg.dependsOn.length === 0).length;
    return { categoryCounts, packageCategoryCounts, totalFiles, packageCount: selectedPkgs.length, totalIssues, foundationalPackages };
  }, [selectedOpps, selectedPkgs]);

  useEffect(() => {
    const timer = setTimeout(() => setShowHeroBadge(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleFinish = () => { closeWizard(); setTimeout(() => resetWizard(), 300); };
  const isDirectMode = packages.length === 0 && selectedOpportunities.size > 0;

  return (
    <StepContainer isLoading={false} data-testid="results-step-container">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setCurrentStep('execute')} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors" data-testid="results-back-button">
          <ArrowLeft className="w-4 h-4" />Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => resetWizard()} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors" title="Start over with a new scan">
            <RotateCcw className="w-4 h-4" />New Scan
          </button>
          <button onClick={handleFinish} className="flex items-center gap-2 px-4 py-2 text-sm bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-all" data-testid="results-finish-button">
            <CheckCircle className="w-4 h-4" />Finish
          </button>
        </div>
      </div>

      <StepHeader title="Refactoring Plan Complete" description={isDirectMode ? 'Review your batch requirement files and next steps' : 'Review your package-based refactoring strategy and next steps'} icon={Target} currentStep={7} totalSteps={7} />
      <ResultsSummaryBanner packageCount={summary.packageCount} isDirectMode={isDirectMode} />
      <ResultsStatsGrid packageCount={summary.packageCount} totalIssues={summary.totalIssues} totalFiles={summary.totalFiles} foundationalPackages={summary.foundationalPackages} />

      <div className="grid grid-cols-2 gap-4">
        <BreakdownCard title="Packages by Category" icon={Package} iconColor="text-cyan-400" items={Object.entries(summary.packageCategoryCounts).sort(([,a], [,b]) => b - a).map(([category, count]) => ({ label: category.replace('-', ' '), count, percentage: (count / summary.packageCount) * 100, colorGradient: 'from-cyan-500 to-blue-500' }))} />
        <BreakdownCard title="Issues by Category" icon={TrendingUp} iconColor="text-purple-400" items={Object.entries(summary.categoryCounts).sort(([,a], [,b]) => b - a).map(([category, count]) => ({ label: category.replace('-', ' '), count, percentage: (count / selectedOpps.length) * 100, colorGradient: 'from-purple-500 to-pink-500' }))} />
      </div>

      {selectedOpps.length > 0 && (
        <CyberCard variant="glow" data-testid="selected-suggestions-card">
          <h4 className="text-white font-medium mb-3 flex items-center gap-2"><ListIcon className="w-4 h-4 text-cyan-400" />Selected Suggestions ({selectedOpps.length})</h4>
          <div className="text-sm text-gray-400 mb-4">Review all selected refactoring opportunities below.</div>
          <ResultsToolbar onSearchChange={setSearchTerm} />
          <VirtualizedSuggestionList opportunities={filteredSelectedOpps} height={500} itemHeight={120} />
        </CyberCard>
      )}

      <CyberCard variant="glow" data-testid="package-execution-guide">
        <h4 className="text-white font-medium mb-4 flex items-center gap-2"><Package className="w-4 h-4 text-cyan-400" />Package Execution Order</h4>
        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-2">
          {selectedPkgs.slice(0, 10).map((pkg) => (
            <div key={pkg.id} className="flex items-center gap-3 p-2 bg-white/5 border border-white/10 rounded-lg text-sm">
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">#{pkg.executionOrder}</span>
              <span className="text-white flex-1">{pkg.name}</span>
              <span className="text-gray-400 text-xs">{pkg.issueCount} issues</span>
            </div>
          ))}
          {selectedPkgs.length > 10 && <p className="text-gray-500 text-xs text-center pt-2">... and {selectedPkgs.length - 10} more packages</p>}
        </div>
      </CyberCard>

      <ResultsNextSteps isDirectMode={isDirectMode} />

      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <p className="text-gray-500 text-sm">{summary.packageCount > 0 ? `${summary.packageCount} requirement files ready for execution` : `${Math.ceil(selectedOpps.length / 20)} batch files ready for execution`}</p>
        <button onClick={handleFinish} className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-medium rounded-lg shadow-lg shadow-green-500/20 transition-all flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />Close Wizard
        </button>
      </div>

      <HeroBadge isVisible={showHeroBadge} onClose={() => setShowHeroBadge(false)} userName="Refactor Strategist" opportunitiesCount={summary.totalIssues} filesCount={summary.totalFiles} batchCount={summary.packageCount} />
    </StepContainer>
  );
}
