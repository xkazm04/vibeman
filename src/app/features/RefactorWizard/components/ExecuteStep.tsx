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
import { BatchItem } from './BatchItem';
import { generateRequirementContent } from '../lib/requirementGenerator';

const BATCH_SIZE = 20;

export default function ExecuteStep() {
  const { opportunities, selectedOpportunities, setCurrentStep } = useRefactorStore();
  const activeProject = useActiveProjectStore(state => state.activeProject);
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [createdFiles, setCreatedFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectedOpps = opportunities.filter(o => selectedOpportunities.has(o.id));
  const batchCount = Math.ceil(selectedOpps.length / BATCH_SIZE);

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
      // Split opportunities into batches
      const batches = [];
      for (let i = 0; i < selectedOpps.length; i += BATCH_SIZE) {
        batches.push(selectedOpps.slice(i, i + BATCH_SIZE));
      }

      // Create a requirement file for each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchNum = batchIndex + 1;

        // Generate requirement content
        const content = generateRequirementContent(
          batch,
          batchNum,
          batches.length,
          activeProject.name || 'Project'
        );

        // Create the requirement file
        const response = await fetch('/api/claude-code/requirement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectPath: activeProject.path,
            requirementName: `refactor-batch-${batchNum}`,
            content,
            overwrite: true,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to create requirement file ${batchNum}`);
        }

        const data = await response.json();
        created.push(data.fileName || `refactor-batch-${batchNum}.md`);

        // Update progress
        setProgress(((batchIndex + 1) / batches.length) * 100);
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
      title="Create Requirement Files"
      description="Generate Claude Code requirements for automated refactoring"
      icon={Play}
      currentStep={5}
      totalSteps={6}
      isLoading={isCreating}
      error={error}
      onErrorDismiss={() => setError(null)}
      data-testid="execute-step-container"
    >

      {/* Batch Info */}
      <CyberCard data-testid="batch-info-card">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium mb-1">Refactoring Strategy</h4>
              <p className="text-gray-400 text-sm">
                Issues will be bundled into manageable batches for systematic resolution
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/30">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Total Issues"
              value={selectedOpps.length}
              icon={FileText}
              variant="info"
            />
            <StatCard
              label="Batch Size"
              value={BATCH_SIZE}
              icon={Package}
              variant="info"
            />
            <StatCard
              label="Requirement Files"
              value={batchCount}
              icon={FileText}
              variant={isCompleted ? 'success' : 'info'}
            />
          </div>
        </div>
      </CyberCard>

      {/* Batch Breakdown */}
      <CyberCard variant="dark" data-testid="batch-breakdown-card">
        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-cyan-400" />
          Batch Breakdown
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2" data-testid="batch-list">
          {Array.from({ length: batchCount }).map((_, index) => {
            const batchNum = index + 1;
            const startIdx = index * BATCH_SIZE;
            const endIdx = Math.min(startIdx + BATCH_SIZE, selectedOpps.length);
            const batchSize = endIdx - startIdx;
            const isCreated = createdFiles.length > index;

            return (
              <BatchItem
                key={batchNum}
                batchNum={batchNum}
                batchSize={batchSize}
                startIdx={startIdx}
                endIdx={endIdx}
                isCreated={isCreated}
                index={index}
              />
            );
          })}
        </div>
      </CyberCard>

      {/* Progress */}
      {isCreating && (
        <ProgressBar
          progress={progress}
          label={`Creating requirement files... (${createdFiles.length}/${batchCount})`}
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
                {createdFiles.length} requirement file{createdFiles.length !== 1 ? 's have' : ' has'} been created in <code className="px-1.5 py-0.5 bg-black/30 rounded text-xs font-mono">.claude/commands/</code>
              </p>
              <div className="space-y-1">
                {createdFiles.map((file, index) => (
                  <div key={index} className="text-xs text-gray-400 font-mono">
                    ✓ {file}
                  </div>
                ))}
              </div>
              <p className="text-gray-400 text-sm mt-3">
                Use Claude Code to execute these requirements and implement the refactoring changes.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <WizardActions
        onBack={isCreating ? undefined : () => setCurrentStep('review')}
        backDisabled={isCreating}
        onNext={isCompleted ? () => setCurrentStep('results') : createRequirementFiles}
        nextLabel={isCompleted ? 'View Summary' : 'Create Requirement Files'}
        nextIcon={isCompleted ? CheckCircle : FileText}
        nextDisabled={isCreating}
        nextLoading={isCreating}
        nextVariant={isCompleted ? 'success' : 'primary'}
      />
    </StepContainer>
  );
}
