'use client';

import { useRefactorStore } from '@/stores/refactorStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { FileText, CheckCircle, Package, Sparkles, Play } from 'lucide-react';
import { useState } from 'react';
import {
  StepContainer,
  CyberCard,
  ProgressBar,
  StatCard,
  WizardActions,
} from '@/components/ui/wizard';
import { motion } from 'framer-motion';
import { generateStrategicRequirement, generatePackageSlug } from '../lib/strategicRequirementGenerator';

export default function ExecuteStep() {
  const {
    packages,
    selectedPackages,
    projectContext,
    setCurrentStep
  } = useRefactorStore();
  const activeProject = useActiveProjectStore(state => state.activeProject);
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [createdFiles, setCreatedFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filter to selected packages and sort by execution order
  const selectedPkgs = packages
    .filter(pkg => selectedPackages.has(pkg.id))
    .sort((a, b) => a.executionOrder - b.executionOrder);

  const createRequirementFiles = async () => {
    if (!activeProject?.path) {
      setError('No active project selected');
      return;
    }

    if (!projectContext) {
      setError('Project context not loaded');
      return;
    }

    setIsCreating(true);
    setProgress(0);
    setError(null);
    const created: string[] = [];

    try {
      // Create a strategic requirement file for each selected package
      for (let i = 0; i < selectedPkgs.length; i++) {
        const pkg = selectedPkgs[i];

        // Generate strategic requirement content
        const content = generateStrategicRequirement(pkg, projectContext, {
          projectName: activeProject.name || 'Project',
          executionOrder: pkg.executionOrder,
          totalPackages: selectedPkgs.length,
        });

        // Generate filename slug
        const slug = generatePackageSlug(pkg.name);
        const fileName = `package-${slug}`;

        // Create the requirement file
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

        // Update progress
        setProgress(((i + 1) / selectedPkgs.length) * 100);
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

  return (
    <StepContainer
      title="Create Strategic Requirements"
      description="Generate context-rich requirement files for each refactoring package"
      icon={Play}
      currentStep={6}
      totalSteps={7}
      isLoading={isCreating}
      error={error}
      onErrorDismiss={() => setError(null)}
      data-testid="execute-step-container"
    >

      {/* Package Info */}
      <CyberCard data-testid="package-info-card">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium mb-1">Strategic Refactoring Packages</h4>
              <p className="text-gray-400 text-sm">
                Each package is a strategically-grouped set of refactorings with full project context
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/30">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Total Packages"
              value={selectedPkgs.length}
              icon={Package}
              variant="info"
            />
            <StatCard
              label="Total Issues"
              value={selectedPkgs.reduce((sum, pkg) => sum + pkg.issueCount, 0)}
              icon={FileText}
              variant="info"
            />
            <StatCard
              label="Requirement Files"
              value={selectedPkgs.length}
              icon={FileText}
              variant={isCompleted ? 'success' : 'info'}
            />
          </div>
        </div>
      </CyberCard>

      {/* Package Breakdown */}
      <CyberCard variant="dark" data-testid="package-breakdown-card">
        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-cyan-400" />
          Package Breakdown
        </h4>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2" data-testid="package-list">
          {selectedPkgs.map((pkg, index) => {
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
          })}
        </div>
      </CyberCard>

      {/* Progress */}
      {isCreating && (
        <ProgressBar
          progress={progress}
          label={`Creating strategic requirement files... (${createdFiles.length}/${selectedPkgs.length})`}
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
                Strategic Requirement Files Created Successfully!
              </h4>
              <p className="text-gray-300 text-sm mb-3">
                {createdFiles.length} strategic package{createdFiles.length !== 1 ? 's have' : ' has'} been generated in <code className="px-1.5 py-0.5 bg-black/30 rounded text-xs font-mono">.claude/commands/</code>
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
                  <li>• Execute packages in order (starting with #1)</li>
                  <li>• Each package includes full context from CLAUDE.md</li>
                  <li>• Dependency information ensures safe execution</li>
                  <li>• Use Claude Code to implement each package systematically</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <WizardActions
        onBack={isCreating ? undefined : () => setCurrentStep('package')}
        backDisabled={isCreating}
        onNext={isCompleted ? () => setCurrentStep('results') : createRequirementFiles}
        nextLabel={isCompleted ? 'View Summary' : 'Create Strategic Requirements'}
        nextIcon={isCompleted ? CheckCircle : FileText}
        nextDisabled={isCreating || selectedPkgs.length === 0}
        nextLoading={isCreating}
        nextVariant={isCompleted ? 'success' : 'primary'}
      />
    </StepContainer>
  );
}
