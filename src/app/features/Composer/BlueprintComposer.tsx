/**
 * Blueprint Composer
 * Main visual interface for composing blueprint pipelines
 * Provides three-column structure for Analyzer/Processor/Executor selection
 */

'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, Layers, Link2, Settings, ChevronDown,
  Workflow, Sparkles, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useBlueprintComposerStore } from './store/blueprintComposerStore';
import {
  getAnalyzersByCategory,
  getCompatibleProcessors,
  PROCESSORS,
  EXECUTORS,
} from './lib/componentRegistry';
import {
  BlueprintExecutionEngine,
  createExecutionEngine,
  ExecutionState,
} from './lib/executionEngine';
import { AnalyzerCategory, ComposerTab, ScanChain } from './types';
import ComposerHeader from './components/ComposerHeader';
import ComponentColumn from './components/ComponentColumn';
import EvidencePanel from './components/EvidencePanel';
import ChainBuilder from './components/ChainBuilder';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

interface BlueprintComposerProps {
  onClose?: () => void;
}

export default function BlueprintComposer({ onClose }: BlueprintComposerProps) {
  const {
    composition,
    activeTab,
    setActiveTab,
    selectAnalyzer,
    addProcessor,
    removeProcessor,
    selectExecutor,
    selectPrompt,
    saveBlueprint,
    resetComposition,
    addEvidence,
    savedBlueprints,
    updateEvidence,
  } = useBlueprintComposerStore();

  const { activeProject } = useActiveProjectStore();

  const [analyzerCategory, setAnalyzerCategory] = useState<AnalyzerCategory>('technical');
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [executionState, setExecutionState] = useState<ExecutionState | null>(null);
  const [executionEngine, setExecutionEngine] = useState<BlueprintExecutionEngine | null>(null);

  // Decision Gate toggle - independent from executor selection
  const [useDecisionGate, setUseDecisionGate] = useState(true);

  // Cleanup execution engine on unmount
  useEffect(() => {
    return () => {
      executionEngine?.abort();
    };
  }, [executionEngine]);

  // Get filtered components
  const analyzers = useMemo(
    () => getAnalyzersByCategory(analyzerCategory),
    [analyzerCategory]
  );

  // Get compatible processors based on selected analyzer
  const compatibleProcessors = useMemo(() => {
    if (!composition.analyzer) return PROCESSORS;
    return getCompatibleProcessors(composition.analyzer);
  }, [composition.analyzer]);

  // Validation
  const isValid = useMemo(() => {
    const hasAnalyzer = !!composition.analyzer;
    const hasName = composition.name.trim().length > 0;
    const hasPromptIfBusiness =
      composition.analyzer?.category !== 'business' ||
      !!composition.selectedPrompt;
    return hasAnalyzer && hasName && hasPromptIfBusiness;
  }, [composition]);

  // Handle test run with new execution engine
  const handleTestRun = useCallback(async () => {
    if (!isValid) {
      toast.error('Please complete the blueprint configuration');
      return;
    }

    if (!activeProject?.path) {
      toast.error('No active project selected');
      return;
    }

    // Create new execution engine
    const engine = createExecutionEngine();
    setExecutionEngine(engine);

    // Subscribe to state updates
    const unsubscribe = engine.subscribe((state) => {
      setExecutionState({ ...state });
    });

    setIsRunningTest(true);

    // Add evidence with running status
    const evidenceId = addEvidence({
      blueprintId: composition.id || 'draft',
      name: composition.name || 'Untitled',
      color: composition.color,
      status: 'running',
      progress: 0,
    });

    try {
      // Create a modified composition with decision gate setting
      const compositionWithDecisionGate = {
        ...composition,
        decisionNodes: useDecisionGate
          ? [{ enabled: true, position: 'before-executor' as const, autoApprove: false }]
          : [],
      };

      const result = await engine.execute(compositionWithDecisionGate, {
        projectPath: activeProject.path,
        projectType: (activeProject.type as 'nextjs' | 'fastapi' | 'express' | 'react-native' | 'other') || 'nextjs',
        projectId: activeProject.id?.toString(),
      });

      // Update evidence with final result
      updateEvidence(evidenceId, {
        status: result.phase === 'failed' ? 'failed' : 'completed',
        progress: 100,
        issueCount: result.issues.length,
      });

      if (result.phase === 'completed') {
        toast.success(`Blueprint completed: ${result.issues.length} issues found`);
      } else if (result.phase === 'failed') {
        toast.error(`Blueprint failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Test run failed: ${errorMessage}`);

      updateEvidence(evidenceId, {
        status: 'failed',
        progress: 100,
      });
    } finally {
      setIsRunningTest(false);
      unsubscribe();
    }
  }, [isValid, activeProject, composition, addEvidence, updateEvidence, useDecisionGate]);

  // Handle decision accept
  const handleDecisionAccept = useCallback(() => {
    executionState?.pendingDecision?.onAccept();
  }, [executionState]);

  // Handle decision reject
  const handleDecisionReject = useCallback(() => {
    executionState?.pendingDecision?.onReject();
  }, [executionState]);

  // Handle chain run
  const handleChainRun = useCallback(async (chain: ScanChain) => {
    if (!activeProject?.path) {
      toast.error('No active project selected');
      return;
    }

    setIsRunningTest(true);
    toast.info(`Starting chain: ${chain.name}`);

    // Add evidence for each blueprint in chain (pending)
    const evidenceIds: string[] = [];
    for (const blueprintId of chain.blueprints) {
      const blueprint = savedBlueprints.find(bp => bp.id === blueprintId);
      if (blueprint) {
        const id = addEvidence({
          blueprintId,
          name: blueprint.name,
          color: blueprint.color,
          status: 'pending',
          progress: 0,
        });
        evidenceIds.push(id);
      }
    }

    try {
      // Execute each blueprint in sequence
      let totalIssues = 0;
      for (let i = 0; i < chain.blueprints.length; i++) {
        const blueprintId = chain.blueprints[i];
        const blueprint = savedBlueprints.find(bp => bp.id === blueprintId);

        if (!blueprint) continue;

        // Update current blueprint to running
        if (evidenceIds[i]) {
          updateEvidence(evidenceIds[i], { status: 'running', progress: 0 });
        }

        // Create engine for this blueprint
        const engine = createExecutionEngine();
        const result = await engine.execute(blueprint, {
          projectPath: activeProject.path,
          projectType: (activeProject.type as 'nextjs' | 'fastapi' | 'express' | 'react-native' | 'other') || 'nextjs',
          projectId: activeProject.id?.toString(),
        });

        totalIssues += result.issues.length;

        // Update evidence
        if (evidenceIds[i]) {
          updateEvidence(evidenceIds[i], {
            status: result.phase === 'failed' ? 'failed' : 'completed',
            progress: 100,
            issueCount: result.issues.length,
          });
        }

        // If failed, stop chain
        if (result.phase === 'failed') {
          toast.error(`Chain stopped: ${blueprint.name} failed`);
          break;
        }
      }

      toast.success(`Chain completed: ${totalIssues} total issues found`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Chain run failed: ${errorMessage}`);

      // Mark remaining as failed
      evidenceIds.forEach(id => {
        const evidence = useBlueprintComposerStore.getState().evidence.find(e => e.id === id);
        if (evidence?.status === 'pending') {
          updateEvidence(id, { status: 'failed', progress: 100 });
        }
      });
    } finally {
      setIsRunningTest(false);
    }
  }, [activeProject, savedBlueprints, addEvidence, updateEvidence]);

  // Handle save
  const handleSave = () => {
    if (!isValid) return;
    saveBlueprint();
    toast.success('Blueprint saved');
  };

  // Handle abort
  const handleAbort = useCallback(() => {
    executionEngine?.abort();
    setIsRunningTest(false);
    setExecutionState(null);
    toast.info('Execution aborted');
  }, [executionEngine]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full h-full flex flex-col bg-gray-950/95 backdrop-blur-xl rounded-2xl border border-gray-800/50 overflow-hidden shadow-2xl"
    >
      {/* Top Bar with Tabs */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50 bg-gray-900/50">
        <div className="flex items-center gap-4">
          {/* Logo/Title */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Workflow className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Blueprint Composer</h2>
              <p className="text-[10px] text-gray-500">Design automated pipelines</p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center bg-gray-900/80 rounded-lg p-0.5 ml-4">
            <button
              onClick={() => setActiveTab('compose')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'compose'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Compose
            </button>
            <button
              onClick={() => setActiveTab('chain')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'chain'
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'text-gray-500 hover:text-gray-400'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              Chain
            </button>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Validation warning */}
          {!isValid && composition.analyzer && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] text-amber-400">
                {!composition.name ? 'Add a name' :
                 composition.analyzer?.category === 'business' && !composition.selectedPrompt ? 'Select a prompt' :
                 'Complete setup'}
              </span>
            </div>
          )}

          <button
            onClick={resetComposition}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-400 hover:bg-gray-800/50 transition-colors"
            title="Reset"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          <motion.button
            onClick={handleSave}
            disabled={!isValid}
            whileHover={{ scale: isValid ? 1.02 : 1 }}
            whileTap={{ scale: isValid ? 0.98 : 1 }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isValid
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30'
                : 'bg-gray-800/30 text-gray-600 cursor-not-allowed'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            Save Blueprint
          </motion.button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-400 hover:bg-gray-800/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === 'compose' ? (
            <motion.div
              key="compose"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {/* Header Section */}
              <ComposerHeader />

              {/* Three-Column Layout */}
              <div className="flex-1 flex border-t border-gray-800/50 min-h-0">
                {/* Analyzers Column */}
                <ComponentColumn
                  title="Analyzer"
                  type="analyzer"
                  components={analyzers}
                  selectedIds={composition.analyzer ? [composition.analyzer.id] : []}
                  onSelect={selectAnalyzer}
                  onDeselect={() => selectAnalyzer(null)}
                  analyzerCategory={analyzerCategory}
                  onCategoryChange={setAnalyzerCategory}
                  selectedPrompt={composition.selectedPrompt}
                  onPromptSelect={selectPrompt}
                />

                {/* Divider with flow indicator */}
                <div className="relative w-px bg-gray-800/50">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <motion.div
                      animate={{ x: [-2, 2, -2] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-4 h-4 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center"
                    >
                      <div className="w-0 h-0 border-t-4 border-b-4 border-l-6 border-t-transparent border-b-transparent border-l-gray-600" />
                    </motion.div>
                  </div>
                </div>

                {/* Processors Column */}
                <ComponentColumn
                  title="Processors"
                  type="processor"
                  components={compatibleProcessors}
                  selectedIds={composition.processors.map(p => p.id)}
                  onSelect={addProcessor}
                  onDeselect={removeProcessor}
                  multiSelect
                />

                {/* Divider with flow indicator */}
                <div className="relative w-px bg-gray-800/50">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <motion.div
                      animate={{ x: [-2, 2, -2] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                      className="w-4 h-4 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center"
                    >
                      <div className="w-0 h-0 border-t-4 border-b-4 border-l-6 border-t-transparent border-b-transparent border-l-gray-600" />
                    </motion.div>
                  </div>
                </div>

                {/* Executors Column */}
                <ComponentColumn
                  title="Executor"
                  type="executor"
                  components={EXECUTORS}
                  selectedIds={composition.executor ? [composition.executor.id] : []}
                  onSelect={selectExecutor}
                  onDeselect={() => selectExecutor(null)}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chain"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 min-h-0"
            >
              <ChainBuilder onRun={handleChainRun} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Evidence Panel */}
      <div className="h-auto min-h-[64px] border-t border-gray-800/50 bg-gray-900/30">
        <EvidencePanel
          onRunTest={handleTestRun}
          isRunning={isRunningTest}
          executionState={executionState}
          onDecisionAccept={handleDecisionAccept}
          onDecisionReject={handleDecisionReject}
          onAbort={handleAbort}
          useDecisionGate={useDecisionGate}
          onToggleDecisionGate={() => setUseDecisionGate(!useDecisionGate)}
        />
      </div>
    </motion.div>
  );
}
