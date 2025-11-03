'use client';

import { useRefactorStore } from '@/stores/refactorStore';
import { CheckCircle, FileText, Package, Sparkles, AlertCircle, TrendingUp } from 'lucide-react';
import {
  WizardStepContainer,
  WizardHeader,
  CyberCard,
  StatCard,
  WizardActions,
} from '@/components/ui/wizard';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

export default function ResultsStep() {
  const { opportunities, selectedOpportunities, closeWizard, resetWizard } = useRefactorStore();

  const selectedOpps = useMemo(() =>
    opportunities.filter(o => selectedOpportunities.has(o.id)),
    [opportunities, selectedOpportunities]
  );

  // Calculate summary statistics
  const summary = useMemo(() => {
    const categoryCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = {};
    const effortCounts: Record<string, number> = {};

    selectedOpps.forEach(opp => {
      categoryCounts[opp.category] = (categoryCounts[opp.category] || 0) + 1;
      severityCounts[opp.severity] = (severityCounts[opp.severity] || 0) + 1;
      effortCounts[opp.effort] = (effortCounts[opp.effort] || 0) + 1;
    });

    const totalFiles = new Set(selectedOpps.flatMap(o => o.files)).size;
    const autoFixCount = selectedOpps.filter(o => o.autoFixAvailable).length;
    const batchCount = Math.ceil(selectedOpps.length / 20);

    return {
      categoryCounts,
      severityCounts,
      effortCounts,
      totalFiles,
      autoFixCount,
      batchCount,
    };
  }, [selectedOpps]);

  const handleFinish = () => {
    closeWizard();
    setTimeout(() => resetWizard(), 300);
  };

  return (
    <WizardStepContainer>
      {/* Header */}
      <WizardHeader
        title="Refactoring Plan Complete"
        description="Review your refactoring summary and next steps"
      />

      {/* Success Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden bg-gradient-to-r from-green-500/10 via-cyan-500/10 to-blue-500/10 border border-green-500/30 rounded-xl p-6"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center border border-green-500/30">
              <CheckCircle className="w-7 h-7 text-green-400" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-medium text-green-300 mb-2">
              Ready for Implementation!
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              Your refactoring plan has been organized into <strong className="text-white">{summary.batchCount} requirement file{summary.batchCount !== 1 ? 's' : ''}</strong> in <code className="px-1.5 py-0.5 bg-black/30 rounded text-xs font-mono">.claude/commands/</code>
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Use Claude Code to execute these requirements and systematically improve your codebase.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          label="Total Issues"
          value={selectedOpps.length}
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
          label="Requirement Batches"
          value={summary.batchCount}
          icon={Package}
          variant="success"
        />
        <StatCard
          label="Auto-fixable"
          value={summary.autoFixCount}
          icon={Sparkles}
          variant="info"
        />
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Category Breakdown */}
        <CyberCard>
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            By Category
          </h4>
          <div className="space-y-2">
            {Object.entries(summary.categoryCounts)
              .sort(([,a], [,b]) => b - a)
              .map(([category, count]) => {
                const percentage = (count / selectedOpps.length) * 100;
                return (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-1"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300 capitalize">{category.replace('-', ' ')}</span>
                      <span className="text-white font-medium">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                      />
                    </div>
                  </motion.div>
                );
              })}
          </div>
        </CyberCard>

        {/* Severity Breakdown */}
        <CyberCard>
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-400" />
            By Severity
          </h4>
          <div className="space-y-2">
            {Object.entries(summary.severityCounts)
              .sort(([,a], [,b]) => b - a)
              .map(([severity, count]) => {
                const percentage = (count / selectedOpps.length) * 100;
                const colorMap: Record<string, string> = {
                  critical: 'from-red-500 to-orange-500',
                  high: 'from-orange-500 to-yellow-500',
                  medium: 'from-yellow-500 to-blue-500',
                  low: 'from-blue-500 to-cyan-500',
                };
                return (
                  <motion.div
                    key={severity}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-1"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300 capitalize">{severity}</span>
                      <span className="text-white font-medium">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className={`h-full bg-gradient-to-r ${colorMap[severity]} rounded-full`}
                      />
                    </div>
                  </motion.div>
                );
              })}
          </div>
        </CyberCard>
      </div>

      {/* Next Steps */}
      <CyberCard variant="glow">
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
              <p className="text-white font-medium mb-1">Open Claude Code</p>
              <p className="text-gray-400 text-xs">
                Launch Claude Code in your project directory to access the requirement files
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <div className="w-6 h-6 bg-cyan-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border border-cyan-500/30">
              <span className="text-xs font-mono text-cyan-400">2</span>
            </div>
            <div>
              <p className="text-white font-medium mb-1">Execute Requirements</p>
              <p className="text-gray-400 text-xs">
                Use <code className="px-1 py-0.5 bg-black/30 rounded text-xs font-mono">/refactor-batch-1</code> to start with the first batch
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <div className="w-6 h-6 bg-cyan-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border border-cyan-500/30">
              <span className="text-xs font-mono text-cyan-400">3</span>
            </div>
            <div>
              <p className="text-white font-medium mb-1">Review & Test</p>
              <p className="text-gray-400 text-xs">
                Review each change, run tests, and commit incrementally as suggested
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <div className="w-6 h-6 bg-cyan-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border border-cyan-500/30">
              <span className="text-xs font-mono text-cyan-400">4</span>
            </div>
            <div>
              <p className="text-white font-medium mb-1">Continue with Next Batches</p>
              <p className="text-gray-400 text-xs">
                Process remaining batches systematically for complete code improvement
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
    </WizardStepContainer>
  );
}
