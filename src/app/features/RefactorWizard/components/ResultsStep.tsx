'use client';

import { useRefactorStore } from '@/stores/refactorStore';
import { CheckCircle, FileText, Package, Sparkles, AlertCircle, TrendingUp, Target, List as ListIcon } from 'lucide-react';
import {
  StepContainer,
  CyberCard,
  StatCard,
  WizardActions,
} from '@/components/ui/wizard';
import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BreakdownCard } from './BreakdownCard';
import { VirtualizedSuggestionList } from './VirtualizedSuggestionList';
import HeroBadge from './HeroBadge';

export default function ResultsStep() {
  const {
    opportunities,
    selectedOpportunities,
    packages,
    selectedPackages,
    closeWizard,
    resetWizard
  } = useRefactorStore();
  const [showHeroBadge, setShowHeroBadge] = useState(false);

  const selectedOpps = useMemo(() =>
    opportunities.filter(o => selectedOpportunities.has(o.id)),
    [opportunities, selectedOpportunities]
  );

  const selectedPkgs = useMemo(() =>
    packages.filter(pkg => selectedPackages.has(pkg.id))
      .sort((a, b) => a.executionOrder - b.executionOrder),
    [packages, selectedPackages]
  );

  // Calculate summary statistics
  const summary = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};
    const effortCounts: Record<string, number> = {};
    const packageCategoryCounts: Record<string, number> = {};

    selectedOpps.forEach(opp => {
      categoryCounts[opp.category] = (categoryCounts[opp.category] || 0) + 1;
      severityCounts[opp.severity] = (severityCounts[opp.severity] || 0) + 1;
      effortCounts[opp.effort] = (effortCounts[opp.effort] || 0) + 1;
    });

    selectedPkgs.forEach(pkg => {
      packageCategoryCounts[pkg.category] = (packageCategoryCounts[pkg.category] || 0) + 1;
    });

    const totalFiles = new Set(selectedOpps.flatMap(o => o.files)).size;
    const autoFixCount = selectedOpps.filter(o => o.autoFixAvailable).length;
    const totalIssues = selectedPkgs.reduce((sum, pkg) => sum + pkg.issueCount, 0);
    const foundationalPackages = selectedPkgs.filter(pkg => pkg.dependsOn.length === 0).length;

    return {
      categoryCounts,
      severityCounts,
      effortCounts,
      packageCategoryCounts,
      totalFiles,
      autoFixCount,
      packageCount: selectedPkgs.length,
      totalIssues,
      foundationalPackages,
    };
  }, [selectedOpps, selectedPkgs]);

  // Show hero badge automatically when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHeroBadge(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleFinish = () => {
    closeWizard();
    setTimeout(() => resetWizard(), 300);
  };

  return (
    <StepContainer
      title="Strategic Refactoring Plan Complete"
      description="Review your package-based refactoring strategy and next steps"
      icon={Target}
      currentStep={7}
      totalSteps={7}
      isLoading={false}
      data-testid="results-step-container"
    >

      {/* Success Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden bg-gradient-to-r from-green-500/10 via-cyan-500/10 to-blue-500/10 border border-green-500/30 rounded-xl p-6"
        data-testid="results-success-banner"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center border border-green-500/30">
              <CheckCircle className="w-7 h-7 text-green-400" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-medium text-green-300 mb-2">
              Strategic Requirements Generated!
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Your refactoring has been organized into <strong className="text-white">{summary.packageCount} strategic package{summary.packageCount !== 1 ? 's' : ''}</strong> in <code className="px-1.5 py-0.5 bg-black/30 rounded text-xs font-mono">.claude/commands/</code>
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Each package includes full project context from CLAUDE.md and dependency information for safe, systematic execution.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3" data-testid="results-stats-grid">
        <StatCard
          label="Strategic Packages"
          value={summary.packageCount}
          icon={Package}
          variant="success"
        />
        <StatCard
          label="Total Issues"
          value={summary.totalIssues}
          icon={AlertCircle}
          variant="info"
        />
        <StatCard
          label="Files Affected"
          value={summary.totalFiles}
          icon={FileText}
          variant="info"
        />
        <StatCard
          label="Foundational"
          value={summary.foundationalPackages}
          icon={Sparkles}
          variant="info"
        />
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Package Category Breakdown */}
        <BreakdownCard
          title="Packages by Category"
          icon={Package}
          iconColor="text-cyan-400"
          items={Object.entries(summary.packageCategoryCounts)
            .sort(([,a], [,b]) => b - a)
            .map(([category, count]) => ({
              label: category.replace('-', ' '),
              count,
              percentage: (count / summary.packageCount) * 100,
              colorGradient: 'from-cyan-500 to-blue-500',
            }))}
        />

        {/* Issue Category Breakdown */}
        <BreakdownCard
          title="Issues by Category"
          icon={TrendingUp}
          iconColor="text-purple-400"
          items={Object.entries(summary.categoryCounts)
            .sort(([,a], [,b]) => b - a)
            .map(([category, count]) => ({
              label: category.replace('-', ' '),
              count,
              percentage: (count / selectedOpps.length) * 100,
              colorGradient: 'from-purple-500 to-pink-500',
            }))}
        />
      </div>

      {/* Selected Suggestions List */}
      {selectedOpps.length > 0 && (
        <CyberCard variant="glow" data-testid="selected-suggestions-card">
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <ListIcon className="w-4 h-4 text-cyan-400" />
            Selected Suggestions ({selectedOpps.length})
          </h4>
          <div className="text-sm text-gray-400 mb-4">
            Review all selected refactoring opportunities below. Each will be included in the generated requirement files.
          </div>
          <VirtualizedSuggestionList
            opportunities={selectedOpps}
            height={500}
            itemHeight={120}
          />
        </CyberCard>
      )}

      {/* Package Execution Guide */}
      <CyberCard variant="glow" data-testid="package-execution-guide">
        <h4 className="text-white font-medium mb-4 flex items-center gap-2">
          <Package className="w-4 h-4 text-cyan-400" />
          Package Execution Order
        </h4>
        <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-2">
          {selectedPkgs.slice(0, 10).map((pkg, index) => (
            <div
              key={pkg.id}
              className="flex items-center gap-3 p-2 bg-white/5 border border-white/10 rounded-lg text-sm"
            >
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">
                #{pkg.executionOrder}
              </span>
              <span className="text-white flex-1">{pkg.name}</span>
              <span className="text-gray-400 text-xs">{pkg.issueCount} issues</span>
            </div>
          ))}
          {selectedPkgs.length > 10 && (
            <p className="text-gray-500 text-xs text-center pt-2">
              ... and {selectedPkgs.length - 10} more packages
            </p>
          )}
        </div>
      </CyberCard>

      {/* Next Steps */}
      <CyberCard variant="glow" data-testid="next-steps-card">
        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Next Steps
        </h4>
        <div className="space-y-3">
          <div className="flex items-start gap-3 text-sm">
            <div className="w-6 h-6 bg-cyan-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border border-cyan-500/30">
              <span className="text-xs font-mono text-cyan-400">1</span>
            </div>
            <div>
              <p className="text-white font-medium mb-1">Execute Packages in Order</p>
              <p className="text-gray-400 text-xs">
                Start with package #1 and follow the execution order to respect dependencies
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <div className="w-6 h-6 bg-cyan-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border border-cyan-500/30">
              <span className="text-xs font-mono text-cyan-400">2</span>
            </div>
            <div>
              <p className="text-white font-medium mb-1">Use Claude Code</p>
              <p className="text-gray-400 text-xs">
                Run <code className="px-1 py-0.5 bg-black/30 rounded text-xs font-mono">/package-...</code> commands to execute each strategic requirement
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <div className="w-6 h-6 bg-cyan-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border border-cyan-500/30">
              <span className="text-xs font-mono text-cyan-400">3</span>
            </div>
            <div>
              <p className="text-white font-medium mb-1">Validate Each Package</p>
              <p className="text-gray-400 text-xs">
                Each requirement includes validation criteria - check tests, types, and measurable outcomes
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <div className="w-6 h-6 bg-cyan-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border border-cyan-500/30">
              <span className="text-xs font-mono text-cyan-400">4</span>
            </div>
            <div>
              <p className="text-white font-medium mb-1">Review CLAUDE.md Context</p>
              <p className="text-gray-400 text-xs">
                Each package includes project context, priorities, and conventions for context-aware implementation
              </p>
            </div>
          </div>
        </div>
      </CyberCard>

      {/* Actions */}
      <WizardActions
        onNext={handleFinish}
        nextLabel="Finish"
        nextIcon={CheckCircle}
        nextVariant="success"
      />

      {/* Hero Badge */}
      <HeroBadge
        isVisible={showHeroBadge}
        onClose={() => setShowHeroBadge(false)}
        userName="Refactor Strategist"
        opportunitiesCount={summary.totalIssues}
        filesCount={summary.totalFiles}
        batchCount={summary.packageCount}
      />
    </StepContainer>
  );
}
