'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Scan,
  Package,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Settings,
  ChevronRight,
  Code,
  Sparkles,
} from 'lucide-react';
import { useRefactorStore, RefactorOpportunity } from '@/stores/refactorStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import type { RefactoringPackage } from '../lib/types';

type QuickStep = 'idle' | 'scanning' | 'grouping' | 'ready' | 'executing' | 'done' | 'error';

interface QuickRefactorModeProps {
  onSwitchToAdvanced: () => void;
  onExecuteWithPackages?: () => void; // Switch to advanced mode and go to execute step
  className?: string;
}

// API response types
interface ScanIssue {
  id: string;
  file: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  score: number;
  category: string;
}

interface ApiPackage {
  id: string;
  name: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  issues: ScanIssue[];
  files: string[];
  estimatedEffort: 'small' | 'medium' | 'large';
  impact: 'high' | 'medium' | 'low';
}

/**
 * QuickRefactorMode - One-click refactoring for simple cases
 *
 * Streamlined flow: Scan → Auto-group → Execute
 * Users can switch to advanced mode for manual control.
 */
export default function QuickRefactorMode({
  onSwitchToAdvanced,
  onExecuteWithPackages,
  className = '',
}: QuickRefactorModeProps) {
  const [step, setStep] = useState<QuickStep>('idle');
  const [progress, setProgress] = useState(0);
  const [issueCount, setIssueCount] = useState(0);
  const [packageCount, setPackageCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Store scan results for later use
  const scanResultsRef = useRef<{ opportunities: RefactorOpportunity[]; packages: RefactoringPackage[] }>({
    opportunities: [],
    packages: [],
  });

  const { activeProject } = useActiveProjectStore();
  const {
    setCurrentStep,
    setOpportunities,
    setPackages,
    selectAllPackages,
  } = useRefactorStore();

  // Convert scan issues to RefactorOpportunity format
  const convertToOpportunities = (issues: ScanIssue[]): RefactorOpportunity[] => {
    return issues.map((issue) => ({
      id: issue.id,
      title: issue.message,
      description: `${issue.category} issue in ${issue.file}`,
      category: mapCategory(issue.type),
      severity: issue.severity,
      impact: `Score: ${issue.score}/100`,
      effort: mapEffort(issue.severity),
      files: [issue.file],
      autoFixAvailable: true,
    }));
  };

  // Convert API packages to RefactoringPackage format
  const convertToPackages = (apiPackages: ApiPackage[]): RefactoringPackage[] => {
    return apiPackages.map((pkg, index) => ({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      strategy: {
        type: 'pattern-based' as const,
        rationale: `Grouped ${pkg.issues.length} related issues`,
        approach: 'Apply systematic fixes to related code',
      },
      category: mapPackageCategory(pkg.issues[0]?.type || 'cleanup'),
      scope: 'module' as const,
      opportunities: convertToOpportunities(pkg.issues),
      issueCount: pkg.issues.length,
      impact: pkg.impact === 'high' ? 'high' : pkg.impact === 'medium' ? 'medium' : 'low',
      effort: pkg.estimatedEffort,
      estimatedHours: pkg.estimatedEffort === 'small' ? 2 : pkg.estimatedEffort === 'medium' ? 4 : 8,
      dependsOn: [],
      enables: [],
      executionOrder: index + 1,
      strategicGoal: pkg.description,
      expectedOutcomes: [`Fix ${pkg.issues.length} ${pkg.issues[0]?.type || 'code'} issues`],
      relatedDocs: [],
      selected: true,
      executed: false,
    }));
  };

  const mapCategory = (type: string): RefactorOpportunity['category'] => {
    if (type === 'complexity') return 'maintainability';
    if (type === 'duplication') return 'duplication';
    if (type === 'code-quality') return 'code-quality';
    if (type === 'churn') return 'maintainability';
    if (type === 'risk') return 'code-quality';
    return 'code-quality';
  };

  const mapPackageCategory = (type: string): RefactoringPackage['category'] => {
    if (type === 'complexity') return 'cleanup';
    if (type === 'security') return 'security';
    if (type === 'risk') return 'security';
    return 'cleanup';
  };

  const mapEffort = (severity: string): RefactorOpportunity['effort'] => {
    if (severity === 'critical' || severity === 'high') return 'high';
    if (severity === 'medium') return 'medium';
    return 'low';
  };

  const runQuickRefactor = useCallback(async () => {
    if (!activeProject?.path) {
      setError('No project selected');
      setStep('error');
      return;
    }

    setStep('scanning');
    setProgress(0);
    setError(null);

    try {
      // Step 1: Run scan
      setProgress(10);
      const scanResponse = await fetch('/api/refactor/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: activeProject.path,
          scanTypes: ['code-quality', 'complexity', 'duplication'],
        }),
      });

      if (!scanResponse.ok) {
        throw new Error('Scan failed');
      }

      const scanData = await scanResponse.json();
      setProgress(40);
      setIssueCount(scanData.issueCount || 0);

      if ((scanData.issueCount || 0) === 0) {
        setStep('done');
        return;
      }

      // Convert and store opportunities
      const opportunities = convertToOpportunities(scanData.issues || []);
      scanResultsRef.current.opportunities = opportunities;

      // Step 2: Auto-group issues
      setStep('grouping');
      setProgress(50);

      const groupResponse = await fetch('/api/refactor/auto-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectPath: activeProject.path,
          issues: scanData.issues || [],
        }),
      });

      if (!groupResponse.ok) {
        throw new Error('Auto-grouping failed');
      }

      const groupData = await groupResponse.json();
      setProgress(70);
      setPackageCount(groupData.packageCount || 1);

      // Convert and store packages
      const packages = convertToPackages(groupData.packages || []);
      scanResultsRef.current.packages = packages;

      // Step 3: Ready to execute
      setStep('ready');
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStep('error');
    }
  }, [activeProject?.path]);

  const executeRefactor = useCallback(async () => {
    setStep('executing');
    setProgress(80);

    try {
      // Store opportunities and packages in the refactor store
      setOpportunities(scanResultsRef.current.opportunities);
      setPackages(scanResultsRef.current.packages);

      // Select all packages for execution
      selectAllPackages();

      // Set step to execute before switching modes
      setCurrentStep('execute');

      // Switch to advanced mode to show ExecuteStep
      if (onExecuteWithPackages) {
        onExecuteWithPackages();
      } else {
        // Fallback: just switch to advanced mode
        onSwitchToAdvanced();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed');
      setStep('error');
    }
  }, [setCurrentStep, setOpportunities, setPackages, selectAllPackages, onExecuteWithPackages, onSwitchToAdvanced]);

  const reset = () => {
    setStep('idle');
    setProgress(0);
    setIssueCount(0);
    setPackageCount(0);
    setError(null);
    scanResultsRef.current = { opportunities: [], packages: [] };
  };

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-xl border border-cyan-500/30">
            <Zap className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Quick Refactor</h2>
            <p className="text-sm text-gray-400">One-click code improvements</p>
          </div>
        </div>

        <button
          onClick={onSwitchToAdvanced}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700
                     text-gray-300 rounded-lg transition-colors text-sm"
        >
          <Settings className="w-4 h-4" />
          Advanced Mode
        </button>
      </div>

      {/* Flow Visualization */}
      <div className="flex items-center justify-between mb-8 px-4">
        <FlowStep
          icon={Scan}
          label="Scan"
          active={step === 'scanning'}
          complete={['grouping', 'ready', 'executing', 'done'].includes(step)}
        />
        <FlowConnector active={['grouping', 'ready', 'executing', 'done'].includes(step)} />
        <FlowStep
          icon={Package}
          label="Group"
          active={step === 'grouping'}
          complete={['ready', 'executing', 'done'].includes(step)}
        />
        <FlowConnector active={['ready', 'executing', 'done'].includes(step)} />
        <FlowStep
          icon={Play}
          label="Execute"
          active={step === 'executing'}
          complete={step === 'done'}
        />
      </div>

      {/* Main Action Area */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-8">
        <AnimatePresence mode="wait">
          {step === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="mb-6">
                <Sparkles className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Ready to Improve Your Code
                </h3>
                <p className="text-gray-400 text-sm max-w-md mx-auto">
                  Quick Refactor automatically scans for issues, groups them into
                  logical packages, and executes improvements.
                </p>
              </div>

              <button
                onClick={runQuickRefactor}
                disabled={!activeProject}
                className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-purple-600
                           hover:from-cyan-500 hover:to-purple-500 rounded-xl
                           font-semibold text-white transition-all disabled:opacity-50
                           disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
              >
                <Zap className="w-5 h-5" />
                Start Quick Refactor
              </button>

              {!activeProject && (
                <p className="text-amber-400 text-sm mt-4">
                  Please select a project first
                </p>
              )}
            </motion.div>
          )}

          {(step === 'scanning' || step === 'grouping') && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                {step === 'scanning' ? 'Scanning Code...' : 'Grouping Issues...'}
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                {step === 'scanning'
                  ? 'Analyzing code quality, complexity, and duplication'
                  : 'Creating logical packages for refactoring'}
              </p>

              {/* Progress Bar */}
              <div className="max-w-xs mx-auto">
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">{progress}%</p>
              </div>
            </motion.div>
          )}

          {step === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Ready to Execute
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                Found {issueCount} issues grouped into {packageCount} package{packageCount !== 1 ? 's' : ''}
              </p>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={reset}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700
                             text-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeRefactor}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600
                             hover:from-emerald-500 hover:to-cyan-500 rounded-xl
                             font-semibold text-white transition-all flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Execute Refactor
                </button>
              </div>
            </motion.div>
          )}

          {step === 'executing' && (
            <motion.div
              key="executing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Executing Refactor...
              </h3>
              <p className="text-gray-400 text-sm">
                Applying improvements to your codebase
              </p>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                {issueCount === 0 ? 'Code Looks Great!' : 'Refactor Complete'}
              </h3>
              <p className="text-gray-400 text-sm mb-6">
                {issueCount === 0
                  ? 'No issues found - your code is in good shape'
                  : `Successfully processed ${issueCount} issues`}
              </p>

              <button
                onClick={reset}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700
                           text-gray-300 rounded-lg transition-colors"
              >
                Run Again
              </button>
            </motion.div>
          )}

          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Something Went Wrong
              </h3>
              <p className="text-red-400 text-sm mb-6">{error}</p>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={reset}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700
                             text-gray-300 rounded-lg transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={onSwitchToAdvanced}
                  className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30
                             text-amber-400 rounded-lg transition-colors"
                >
                  Use Advanced Mode
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* What Quick Refactor Does */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <InfoCard
          icon={Code}
          title="Code Quality"
          description="Finds complexity, duplication, and style issues"
        />
        <InfoCard
          icon={Package}
          title="Smart Grouping"
          description="Groups related issues for coherent changes"
        />
        <InfoCard
          icon={Zap}
          title="AI Execution"
          description="Claude applies improvements automatically"
        />
      </div>
    </div>
  );
}

/**
 * Flow step indicator
 */
function FlowStep({
  icon: Icon,
  label,
  active,
  complete,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`p-3 rounded-xl border transition-all ${
          complete
            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
            : active
            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 animate-pulse'
            : 'bg-gray-800/50 border-gray-700/50 text-gray-500'
        }`}
      >
        {complete ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : active ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Icon className="w-5 h-5" />
        )}
      </div>
      <span className={`text-xs ${complete || active ? 'text-gray-300' : 'text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}

/**
 * Connector line between steps
 */
function FlowConnector({ active }: { active: boolean }) {
  return (
    <div className="flex-1 flex items-center px-2">
      <div
        className={`flex-1 h-0.5 rounded-full transition-colors ${
          active ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-gray-700'
        }`}
      />
      <ChevronRight className={`w-4 h-4 ${active ? 'text-cyan-400' : 'text-gray-600'}`} />
    </div>
  );
}

/**
 * Info card for explaining features
 */
function InfoCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 bg-gray-900/30 border border-gray-800/50 rounded-xl">
      <Icon className="w-5 h-5 text-cyan-400 mb-2" />
      <h4 className="text-sm font-medium text-gray-300 mb-1">{title}</h4>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}
