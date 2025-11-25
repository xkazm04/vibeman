'use client';

import { useRefactorStore, RefactorOpportunity } from '@/stores/refactorStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { FileText, CheckCircle, Package, Sparkles, Play, AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  StepContainer,
  CyberCard,
  ProgressBar,
  StatCard,
  StepHeader,
} from '@/components/ui/wizard';
import { motion } from 'framer-motion';
import { generateStrategicRequirement, generatePackageSlug, generateSimpleRequirement } from '../lib/strategicRequirementGenerator';

export default function ExecuteStep() {
  const {
    packages,
    selectedPackages,
    projectContext,
    setCurrentStep,
    opportunities,
    selectedOpportunities,
  } = useRefactorStore();
  const activeProject = useActiveProjectStore(state => state.activeProject);
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [createdFiles, setCreatedFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Check if we're in "direct mode" (skip packaging) - determined by having no packages but having selected opportunities
  const isDirectMode = packages.length === 0 && selectedOpportunities.size > 0;

  // Filter to selected packages and sort by execution order
  const selectedPkgs = packages
    .filter(pkg => selectedPackages.has(pkg.id))
    .sort((a, b) => a.executionOrder - b.executionOrder);

  // Get selected opportunities for direct mode
  const selectedOpps = useMemo(() =>
    opportunities.filter(o => selectedOpportunities.has(o.id)),
    [opportunities, selectedOpportunities]
  );

  // Group opportunities into chunks of 20 for direct mode
  const opportunityChunks = useMemo(() => {
    const chunks: RefactorOpportunity[][] = [];
    for (let i = 0; i < selectedOpps.length; i += 20) {
      chunks.push(selectedOpps.slice(i, i + 20));
    }
    return chunks;
  }, [selectedOpps]);

  const createRequirementFiles = async () => {
    if (!activeProject?.path) {
      setError('No active project selected');
      return;
    }

    setIsCreating(true);
    setProgress(0);
    setError(null);
    const created: string[] = [];

    try {
      if (isDirectMode) {
        // Direct mode: Create requirement files from opportunity chunks (no packaging)
        for (let i = 0; i < opportunityChunks.length; i++) {
          const chunk = opportunityChunks[i];

          // Generate simple requirement content without project context dependency
          const content = generateSimpleRequirement(chunk, {
            projectName: activeProject.name || 'Project',
            chunkIndex: i + 1,
            totalChunks: opportunityChunks.length,
          });

          const fileName = `refactor-batch-${String(i + 1).padStart(2, '0')}`;

          const response = await fetch('/api/claude-code/requirement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectPath: activeProject.path,
              requirementName: fileName,
              content,
              overwrite: true,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to create requirement file batch ${i + 1}`);
          }

          const data = await response.json();
          created.push(data.fileName || `${fileName}.md`);
          setProgress(((i + 1) / opportunityChunks.length) * 100);
        }
      } else {
        // Package mode: Create strategic requirement files (original behavior)
        for (let i = 0; i < selectedPkgs.length; i++) {
          const pkg = selectedPkgs[i];

          // Generate strategic requirement content - projectContext is optional now
          const content = generateStrategicRequirement(pkg, projectContext, {
            projectName: activeProject.name || 'Project',
            executionOrder: pkg.executionOrder,
            totalPackages: selectedPkgs.length,
          });

          const slug = generatePackageSlug(pkg.name);
          const fileName = `package-${slug}`;

          const response = await fetch('/api/claude-code/requirement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectPath: activeProject.path,
              requirementName: fileName,
              content,
              overwrite: true,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to create requirement file for ${pkg.name}`);
          }

          const data = await response.json();
          created.push(data.fileName || `${fileName}.md`);
          setProgress(((i + 1) / selectedPkgs.length) * 100);
        }
      }

      setCreatedFiles(created);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsCreating(false);
    }
  };

  const isCompleted = createdFiles.length > 0 && !isCreating;

  // Calculate stats for display
  const totalItems = isDirectMode ? opportunityChunks.length : selectedPkgs.length;
  const totalIssues = isDirectMode
    ? selectedOpps.length
    : selectedPkgs.reduce((sum, pkg) => sum + pkg.issueCount, 0);

  // Determine if we can proceed
  const canProceed = isDirectMode ? selectedOpps.length > 0 : selectedPkgs.length > 0;

  // Missing context warning (non-blocking)
  const showContextWarning = !isDirectMode && !projectContext;

  return (
    <StepContainer
      isLoading={false}
      error={error}
      onErrorDismiss={() => setError(null)}
      data-testid="execute-step-container"
    >
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentStep(isDirectMode ? 'review' : 'package')}
          disabled={isCreating}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          data-testid="execute-back-button"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={isCompleted ? () => setCurrentStep('results') : createRequirementFiles}
          disabled={isCreating || !canProceed}
          className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all ${
            isCompleted
              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
          data-testid="execute-next-button"
        >
          {isCreating ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : isCompleted ? (
            <>
              View Summary
              <ArrowRight className="w-4 h-4" />
            </>
          ) : (
            <>
              Create Requirements
              <FileText className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      <StepHeader
        title={isDirectMode ? 'Create Batch Requirements' : 'Create Strategic Requirements'}
        description={isDirectMode
          ? `Generate requirement files (max 20 issues per file) for ${selectedOpps.length} selected opportunities`
          : 'Generate context-rich requirement files for each refactoring package'
        }
        icon={Play}
        currentStep={6}
        totalSteps={7}
      />

      {/* Context Warning (non-blocking) */}
      {showContextWarning && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm"
        >
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-yellow-300">Project context not loaded.</span>
            <span className="text-gray-400 ml-1">Requirements will be generated without CLAUDE.md context enrichment.</span>
          </div>
        </motion.div>
      )}

      {/* Info Card */}
      <CyberCard data-testid="package-info-card">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium mb-1">
                {isDirectMode ? 'Batch Refactoring Files' : 'Strategic Refactoring Packages'}
              </h4>
              <p className="text-gray-400 text-sm">
                {isDirectMode
                  ? `${selectedOpps.length} issues split into ${opportunityChunks.length} batch file(s)`
                  : 'Each package is a strategically-grouped set of refactorings'
                }
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/30">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label={isDirectMode ? 'Batch Files' : 'Packages'}
              value={totalItems}
              icon={Package}
              variant="info"
            />
            <StatCard
              label="Total Issues"
              value={totalIssues}
              icon={FileText}
              variant="info"
            />
            <StatCard
              label="Requirements"
              value={totalItems}
              icon={FileText}
              variant={isCompleted ? 'success' : 'info'}
            />
          </div>
        </div>
      </CyberCard>

      {/* Items Breakdown */}
      <CyberCard variant="dark" data-testid="package-breakdown-card">
        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-cyan-400" />
          {isDirectMode ? 'Batch Breakdown' : 'Package Breakdown'}
        </h4>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2" data-testid="package-list">
          {isDirectMode ? (
            // Direct mode: show batches
            opportunityChunks.map((chunk, index) => {
              const isCreated = createdFiles.length > index;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-lg border transition-all ${
                    isCreated
                      ? 'bg-green-500/5 border-green-500/30'
                      : 'bg-white/5 border-white/10'
                  }`}
                  data-testid={`batch-item-${index}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                          Batch {index + 1}
                        </span>
                        <span className="text-white font-medium text-sm">
                          refactor-batch-{String(index + 1).padStart(2, '0')}.md
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{chunk.length} issues</span>
                        <span>•</span>
                        <span>{[...new Set(chunk.flatMap(o => o.files))].length} files</span>
                      </div>
                    </div>
                    {isCreated && (
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    )}
                  </div>
                </motion.div>
              );
            })
          ) : (
            // Package mode: show packages
            selectedPkgs.map((pkg, index) => {
              const isCreated = createdFiles.length > index;
              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-lg border transition-all ${
                    isCreated
                      ? 'bg-green-500/5 border-green-500/30'
                      : 'bg-white/5 border-white/10'
                  }`}
                  data-testid={`package-item-${index}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                          #{pkg.executionOrder}
                        </span>
                        <span className="text-white font-medium text-sm">
                          {pkg.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{pkg.issueCount} issues</span>
                        <span>•</span>
                        <span className="capitalize">{pkg.category}</span>
                        <span>•</span>
                        <span className="capitalize">{pkg.impact} impact</span>
                      </div>
                    </div>
                    {isCreated && (
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </CyberCard>

      {/* Progress */}
      {isCreating && (
        <ProgressBar
          progress={progress}
          label={`Creating requirement files... (${createdFiles.length}/${totalItems})`}
          variant="cyan"
          data-testid="creation-progress-bar"
        />
      )}

      {/* Success Message */}
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/30 rounded-lg p-4"
          data-testid="creation-success-message"
        >
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-green-300 font-medium mb-2">
                Requirement Files Created Successfully!
              </h4>
              <p className="text-gray-300 text-sm mb-3">
                {createdFiles.length} file{createdFiles.length !== 1 ? 's have' : ' has'} been generated in <code className="px-1.5 py-0.5 bg-black/30 rounded text-xs font-mono">.claude/commands/</code>
              </p>
              <div className="space-y-1 mb-3 max-h-32 overflow-y-auto pr-2">
                {createdFiles.map((file, index) => (
                  <div key={index} className="text-xs text-gray-400 font-mono flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                    {file}
                  </div>
                ))}
              </div>
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3 mt-3">
                <p className="text-cyan-300 text-sm font-medium mb-2">
                  Next Steps:
                </p>
                <ul className="text-gray-400 text-sm space-y-1">
                  {isDirectMode ? (
                    <>
                      <li>• Execute batch files in order (01, 02, etc.)</li>
                      <li>• Each file contains up to 20 related issues</li>
                      <li>• Use Claude Code to implement each batch</li>
                    </>
                  ) : (
                    <>
                      <li>• Execute packages in order (starting with #1)</li>
                      <li>• Each package includes full context from CLAUDE.md</li>
                      <li>• Dependency information ensures safe execution</li>
                      <li>• Use Claude Code to implement each package systematically</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </StepContainer>
  );
}
