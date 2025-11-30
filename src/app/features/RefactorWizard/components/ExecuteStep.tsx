'use client';

import { useRefactorStore, RefactorOpportunity } from '@/stores/refactorStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { FileText, Package, Sparkles, Play, AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import { StepContainer, CyberCard, ProgressBar, StatCard, StepHeader } from '@/components/ui/wizard';
import { motion } from 'framer-motion';
import { generateStrategicRequirement, generatePackageSlug, generateSimpleRequirement } from '../lib/strategicRequirementGenerator';
import { ExecuteBreakdown, ExecuteSuccessMessage, type ExecuteBreakdownItem } from './sub_Execute';

/**
 * ExecuteStep - Sixth step (6/7) of the RefactorWizard workflow.
 * Generates Claude Code requirement files from selected packages/opportunities.
 */
export default function ExecuteStep() {
  const { packages, selectedPackages, projectContext, setCurrentStep, opportunities, selectedOpportunities } = useRefactorStore();
  const activeProject = useActiveProjectStore(state => state.activeProject);
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [createdFiles, setCreatedFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const isDirectMode = packages.length === 0 && selectedOpportunities.size > 0;
  const selectedPkgs = packages.filter(pkg => selectedPackages.has(pkg.id)).sort((a, b) => a.executionOrder - b.executionOrder);
  const selectedOpps = useMemo(() => opportunities.filter(o => selectedOpportunities.has(o.id)), [opportunities, selectedOpportunities]);
  const opportunityChunks = useMemo(() => {
    const chunks: RefactorOpportunity[][] = [];
    for (let i = 0; i < selectedOpps.length; i += 20) chunks.push(selectedOpps.slice(i, i + 20));
    return chunks;
  }, [selectedOpps]);

  const breakdownItems: ExecuteBreakdownItem[] = useMemo(() => {
    if (isDirectMode) {
      return opportunityChunks.map((chunk, index) => ({
        id: `batch-${index}`,
        name: `refactor-batch-${String(index + 1).padStart(2, '0')}.md`,
        issueCount: chunk.length,
        fileCount: [...new Set(chunk.flatMap(o => o.files))].length,
      }));
    }
    return selectedPkgs.map(pkg => ({
      id: pkg.id, name: pkg.name, issueCount: pkg.issueCount, fileCount: 0,
      category: pkg.category, impact: pkg.impact, executionOrder: pkg.executionOrder,
    }));
  }, [isDirectMode, opportunityChunks, selectedPkgs]);

  const createRequirementFiles = async () => {
    if (!activeProject?.path) { setError('No active project selected'); return; }
    setIsCreating(true); setProgress(0); setError(null);
    const created: string[] = [];
    try {
      const items = isDirectMode ? opportunityChunks : selectedPkgs;
      for (let i = 0; i < items.length; i++) {
        const content = isDirectMode
          ? generateSimpleRequirement(opportunityChunks[i], { projectName: activeProject.name || 'Project', chunkIndex: i + 1, totalChunks: opportunityChunks.length })
          : generateStrategicRequirement(selectedPkgs[i], projectContext, { projectName: activeProject.name || 'Project', executionOrder: selectedPkgs[i].executionOrder, totalPackages: selectedPkgs.length });
        const fileName = isDirectMode ? `refactor-batch-${String(i + 1).padStart(2, '0')}` : `package-${generatePackageSlug(selectedPkgs[i].name)}`;
        const response = await fetch('/api/claude-code/requirement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectPath: activeProject.path, requirementName: fileName, content, overwrite: true }) });
        if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || `Failed to create requirement file`); }
        const data = await response.json();
        created.push(data.fileName || `${fileName}.md`);
        setProgress(((i + 1) / items.length) * 100);
      }
      setCreatedFiles(created); setProgress(100);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unknown error'); }
    finally { setIsCreating(false); }
  };

  const isCompleted = createdFiles.length > 0 && !isCreating;
  const totalItems = isDirectMode ? opportunityChunks.length : selectedPkgs.length;
  const totalIssues = isDirectMode ? selectedOpps.length : selectedPkgs.reduce((sum, pkg) => sum + pkg.issueCount, 0);
  const canProceed = isDirectMode ? selectedOpps.length > 0 : selectedPkgs.length > 0;
  const showContextWarning = !isDirectMode && !projectContext;

  return (
    <StepContainer isLoading={false} error={error} onErrorDismiss={() => setError(null)} data-testid="execute-step-container">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setCurrentStep(isDirectMode ? 'review' : 'package')} disabled={isCreating} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50" data-testid="execute-back-button"><ArrowLeft className="w-4 h-4" />Back</button>
        <button onClick={isCompleted ? () => setCurrentStep('results') : createRequirementFiles} disabled={isCreating || !canProceed} className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all ${isCompleted ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'} disabled:opacity-50 disabled:cursor-not-allowed`} data-testid="execute-next-button">
          {isCreating ? (<><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Processing...</>) : isCompleted ? (<>View Summary<ArrowRight className="w-4 h-4" /></>) : (<>Create Requirements<FileText className="w-4 h-4" /></>)}
        </button>
      </div>
      <StepHeader title={isDirectMode ? 'Create Batch Requirements' : 'Create Strategic Requirements'} description={isDirectMode ? `Generate requirement files (max 20 issues per file) for ${selectedOpps.length} selected opportunities` : 'Generate context-rich requirement files for each refactoring package'} icon={Play} currentStep={6} totalSteps={7} />
      {showContextWarning && (<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm"><AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" /><div className="flex-1"><span className="text-yellow-300">Project context not loaded.</span><span className="text-gray-400 ml-1">Requirements will be generated without CLAUDE.md context enrichment.</span></div></motion.div>)}
      <CyberCard data-testid="package-info-card">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div><h4 className="text-white font-medium mb-1">{isDirectMode ? 'Batch Refactoring Files' : 'Strategic Refactoring Packages'}</h4><p className="text-gray-400 text-sm">{isDirectMode ? `${selectedOpps.length} issues split into ${opportunityChunks.length} batch file(s)` : 'Each package is a strategically-grouped set of refactorings'}</p></div>
            <div className="p-3 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/30"><Sparkles className="w-6 h-6 text-cyan-400" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label={isDirectMode ? 'Batch Files' : 'Packages'} value={totalItems} icon={Package} variant="info" />
            <StatCard label="Total Issues" value={totalIssues} icon={FileText} variant="info" />
            <StatCard label="Requirements" value={totalItems} icon={FileText} variant={isCompleted ? 'success' : 'info'} />
          </div>
        </div>
      </CyberCard>
      <ExecuteBreakdown isDirectMode={isDirectMode} items={breakdownItems} createdFiles={createdFiles} />
      {isCreating && <ProgressBar progress={progress} label={`Creating requirement files... (${createdFiles.length}/${totalItems})`} variant="cyan" data-testid="creation-progress-bar" />}
      {isCompleted && <ExecuteSuccessMessage createdFiles={createdFiles} isDirectMode={isDirectMode} />}
    </StepContainer>
  );
}
