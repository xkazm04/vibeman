/**
 * Questions & Directions Layout
 *
 * Orchestrates the strategic questioning workflow:
 *   1. **Select** — pick context maps to explore
 *   2. **Generate** — create questions and/or direction proposals via LLM
 *   3. **Review** — triage results in table / matrix / carousel / tree views
 *
 * Key state flows:
 * - Context selection drives which areas are explored during generation.
 * - Answering a question triggers auto-deepening, which may create follow-up
 *   questions if ambiguity is detected (see `handleSaveAnswer`).
 * - Directions can be accepted (creates a requirement) or rejected.
 *
 * Sub-components extracted for readability:
 * - `ViewModeToggle` — segmented control for switching review views
 * - `AutoDeepenToast` — floating notification for auto-deepen results
 */
'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Compass, RefreshCw } from 'lucide-react';
import LiquidStepRail from '@/components/ui/LiquidStepRail';
import { DbQuestion } from '@/app/db';
import { useClientProjectStore } from '@/stores/clientProjectStore';
import ContextMapSelector from './components/ContextMapSelector';
import CombinedGeneratePanel from './components/CombinedGeneratePanel';
import UnifiedTable from './components/UnifiedTable';
import DirectionMatrix from './components/DirectionMatrix';
import QuestionTree from './components/QuestionTree';
import DirectionCarousel from '@/app/features/Proposals/components/DirectionCarousel';
import AnswerQuestionModal from './components/AnswerQuestionModal';
import AutoDeepenToast from './components/AutoDeepenToast';
import ViewModeToggle from './components/ViewModeToggle';
import type { QuestionsViewMode } from './components/ViewModeToggle';
import {
  groupContextsByGroup,
  generateQuestionRequirement,
  setupContextMapGenerator,
} from './lib/questionsApi';
import {
  generateDirectionRequirement,
  AnsweredQuestionInput
} from './lib/directionsApi';
import {
  useSqliteContexts,
  useQuestionsAndDirections,
  useQuestionTrees,
  useGenerateFollowUp,
  useGenerateStrategicBrief,
  useAutoDeepen,
  useAnswerQuestion,
  useDeleteQuestion,
  useAcceptDirection,
  useRejectDirection,
  useDeleteDirection,
  useInvalidateQuestionsDirections,
} from '@/lib/queries/questionsDirectionsQueries';
import type { AutoDeepenResponse } from './lib/questionsApi';

// Interrogative engines for programmatic access to the generate → decide → act pattern.
// UI components continue using React Query hooks for rendering; these engines provide
// the same pattern for non-UI consumers (tests, automation, CLI tools).
export { createQuestionsEngine, createDirectionsEngine } from '@/lib/interrogative-engine';

interface QuestionsLayoutProps {
  /** Optional project ID override; falls back to the active project from the store. */
  projectId?: string | null;
}

export default function QuestionsLayout({ projectId: propProjectId }: QuestionsLayoutProps) {
  const { activeProject } = useClientProjectStore();

  // Use prop override for project ID in data queries; fall back to store project
  const effectiveProjectId = propProjectId || activeProject?.id;

  // Context selection state (local UI state)
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);

  // Answer modal state
  const [answerModalQuestion, setAnswerModalQuestion] = useState<DbQuestion | null>(null);

  // View toggle for the review section
  const [viewMode, setViewMode] = useState<QuestionsViewMode>('table');

  // React Query hooks for data fetching
  const {
    data: contextsData,
    isLoading: contextLoading,
    error: contextError,
  } = useSqliteContexts(effectiveProjectId);

  const {
    data: combinedData,
    isLoading: combinedLoading,
  } = useQuestionsAndDirections(effectiveProjectId);
  const questionsData = combinedData?.questions;
  const directionsData = combinedData?.directions;

  // Mutations
  const answerQuestionMutation = useAnswerQuestion();
  const deleteQuestionMutation = useDeleteQuestion();
  const acceptDirectionMutation = useAcceptDirection();
  const rejectDirectionMutation = useRejectDirection();
  const deleteDirectionMutation = useDeleteDirection();
  const invalidateAll = useInvalidateQuestionsDirections();

  // Tree data & mutations
  const { data: treeData } = useQuestionTrees(effectiveProjectId, viewMode === 'tree');
  const generateFollowUpMutation = useGenerateFollowUp();
  const generateBriefMutation = useGenerateStrategicBrief();
  const autoDeepenMutation = useAutoDeepen();

  // Auto-deepen notification state
  const [autoDeepenResult, setAutoDeepenResult] = useState<AutoDeepenResponse | null>(null);

  // Derived data
  const contexts = contextsData?.contexts ?? [];
  const contextGroups = contextsData?.groups ?? [];

  // Derived: grouped contexts for display
  const groupedContexts = useMemo(
    () => groupContextsByGroup(contexts, contextGroups),
    [contexts, contextGroups]
  );

  // Auto-select all contexts when they first load (one-time initialization per project)
  // Using useEffect for side effects instead of useMemo
  const hasInitializedRef = React.useRef(false);
  const lastProjectIdRef = React.useRef<string | undefined>(undefined);

  useEffect(() => {
    // Reset initialization when project changes
    if (effectiveProjectId !== lastProjectIdRef.current) {
      lastProjectIdRef.current = effectiveProjectId;
      hasInitializedRef.current = false;
      // Clear selection when switching projects to avoid stale selections
      setSelectedContextIds([]);
    }

    // Auto-select all contexts once when they first become available for this project
    if (contexts.length > 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      setSelectedContextIds(contexts.map(c => c.id));
    }
  }, [contexts, effectiveProjectId]);

  const handleToggleContext = (contextId: string) => {
    setSelectedContextIds(prev =>
      prev.includes(contextId)
        ? prev.filter(id => id !== contextId)
        : [...prev, contextId]
    );
  };

  const handleSelectAll = () => {
    setSelectedContextIds(contexts.map(c => c.id));
  };

  const handleClearAll = () => {
    setSelectedContextIds([]);
  };

  const handleSetupContextMap = useCallback(async () => {
    if (!activeProject?.path) return;

    await setupContextMapGenerator(activeProject.path);
  }, [activeProject?.path]);

  // Questions handlers
  const handleGenerateQuestions = async (questionsPerContext: number) => {
    if (!activeProject) return;

    try {
      const result = await generateQuestionRequirement({
        projectId: activeProject.id,
        projectName: activeProject.name,
        projectPath: activeProject.path,
        selectedContextIds, // Pass SQLite context IDs directly
        questionsPerContext
      });

      return {
        requirementPath: result.requirementPath,
        requirementName: result.requirementName
      };
    } catch (error) {
      // Re-throw with user-friendly message for upstream handling
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate questions: ${message}`);
    }
  };

  const handleOpenAnswerModal = useCallback((question: DbQuestion) => {
    setAnswerModalQuestion(question);
  }, []);

  const handleCloseAnswerModal = useCallback(() => {
    setAnswerModalQuestion(null);
  }, []);

  /**
   * Save an answer and trigger auto-deepening.
   *
   * After persisting the answer, the system analyzes it for ambiguity.
   * If gaps are found, follow-up questions are generated automatically
   * and a toast notification is shown (auto-dismissed after 6 seconds).
   */
  const handleSaveAnswer = useCallback(async (questionId: string, answer: string) => {
    await answerQuestionMutation.mutateAsync({ questionId, answer });
    // Fire-and-forget: auto-deepen runs in background after save completes
    autoDeepenMutation.mutate(questionId, {
      onSuccess: (result) => {
        if (result.deepened || result.analysis.gapCount > 0) {
          setAutoDeepenResult(result);
          setTimeout(() => setAutoDeepenResult(null), 6000);
        }
      },
    });
  }, [answerQuestionMutation, autoDeepenMutation]);

  const handleDeleteQuestion = useCallback(async (questionId: string) => {
    deleteQuestionMutation.mutate(questionId);
  }, [deleteQuestionMutation]);

  // Derived data - must be defined before handlers that reference them
  const questions = questionsData?.items || [];
  const directions = directionsData?.items || [];
  const answeredQuestions = useMemo(() =>
    questions.filter(q => q.status === 'answered'),
    [questions]
  );

  /**
   * Generate direction proposals from selected contexts.
   *
   * In brainstorm mode, all contexts are used regardless of selection.
   * Answered questions (filtered by `selectedQuestionIds`) are included
   * as additional input to ground the LLM's direction proposals.
   */
  const handleGenerateDirections = async (
    directionsPerContext: number,
    userContext: string,
    selectedQuestionIds: string[],
    brainstormAll?: boolean
  ) => {
    if (!activeProject) return;

    try {
      // In brainstorm mode, use all contexts; otherwise use selected ones
      const contextIdsToUse = brainstormAll
        ? contexts.map(c => c.id)
        : selectedContextIds;

      // Build answered questions array from selected IDs
      const answeredQuestionsInput: AnsweredQuestionInput[] = answeredQuestions
        .filter(q => selectedQuestionIds.includes(q.id))
        .map(q => ({
          id: q.id,
          question: q.question,
          answer: q.answer || ''
        }));

      const result = await generateDirectionRequirement({
        projectId: activeProject.id,
        projectName: activeProject.name,
        projectPath: activeProject.path,
        selectedContextIds: contextIdsToUse, // Pass SQLite context IDs
        directionsPerContext,
        userContext: userContext.trim() || undefined,
        answeredQuestions: answeredQuestionsInput.length > 0 ? answeredQuestionsInput : undefined,
        brainstormAll
      });

      return {
        requirementPath: result.requirementPath,
        requirementName: result.requirementName
      };
    } catch (error) {
      // Re-throw with user-friendly message for upstream handling
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate directions: ${message}`);
    }
  };

  const handleAcceptDirection = useCallback(async (directionId: string) => {
    if (!activeProject?.path) return;
    acceptDirectionMutation.mutate({ directionId, projectPath: activeProject.path });
  }, [activeProject?.path, acceptDirectionMutation]);

  const handleRejectDirection = useCallback(async (directionId: string) => {
    rejectDirectionMutation.mutate(directionId);
  }, [rejectDirectionMutation]);

  const handleDeleteDirection = useCallback(async (directionId: string) => {
    deleteDirectionMutation.mutate(directionId);
  }, [deleteDirectionMutation]);

  // Tree handlers
  const handleGenerateFollowUp = useCallback(async (parentId: string) => {
    await generateFollowUpMutation.mutateAsync(parentId);
  }, [generateFollowUpMutation]);

  const handleGenerateBrief = useCallback(async (questionId: string) => {
    await generateBriefMutation.mutateAsync(questionId);
  }, [generateBriefMutation]);

  const handleGenerateDirectionFromTree = useCallback(async (questionId: string) => {
    if (!activeProject) return;
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    try {
      await generateDirectionRequirement({
        projectId: activeProject.id,
        projectName: activeProject.name,
        projectPath: activeProject.path,
        selectedContextIds: [question.context_map_id],
        directionsPerContext: 1,
        userContext: `Based on strategic question chain ending at: "${question.question}" with answer: "${question.answer || ''}"`,
        answeredQuestions: [{ id: question.id, question: question.question, answer: question.answer || '' }],
      });
      invalidateAll();
    } catch {
      // Error handled by UI feedback
    }
  }, [activeProject, questions, invalidateAll]);

  const handleRefresh = useCallback(() => {
    invalidateAll();
  }, [invalidateAll]);

  const isLoading = combinedLoading;

  // Stats
  const totalPending = (questionsData?.counts.pending || 0) + (directionsData?.counts.pending || 0);

  return (
    <div className="min-h-full bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-xl border shadow-lg bg-gradient-to-br from-purple-500/20 via-cyan-500/10 to-teal-500/20 border-purple-500/30 shadow-purple-500/10">
                <div className="flex items-center gap-0.5">
                  <HelpCircle className="w-5 h-5 text-purple-400" />
                  <Compass className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                  Questions & Directions
                </h1>
                <p className="text-gray-400">
                  Brainstorm development direction through strategic questions
                </p>
              </div>
            </div>

            {/* Stats & Refresh */}
            <div className="flex items-center gap-4">
              {totalPending > 0 && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    {totalPending}
                  </div>
                  <div className="text-xs text-gray-400">pending</div>
                </div>
              )}
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Project check */}
        {!activeProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gray-800/40 backdrop-blur-sm rounded-xl p-8 border border-gray-700/40 text-center"
          >
            <p className="text-gray-400">Select a project to get started</p>
          </motion.div>
        )}

        {activeProject && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex gap-4"
          >
            {/* Step indicator rail — liquid SVG connectors with predictive glow */}
            {(() => {
              const step1Done = selectedContextIds.length > 0;
              const step2Done = contexts.length > 0 && selectedContextIds.length > 0;
              const step3Done = questions.length > 0 || directions.length > 0;
              const activeStep = !step1Done ? 0 : !step2Done ? 1 : 2;

              return (
                <div className="pt-4 flex-shrink-0">
                  <LiquidStepRail
                    steps={[
                      { id: 'select', label: 'Select', tooltip: 'Select Contexts', done: step1Done },
                      { id: 'generate', label: 'Generate', tooltip: 'Generate Questions & Directions', done: step2Done },
                      { id: 'review', label: 'Review', tooltip: 'Review Results', done: step3Done },
                    ]}
                    activeIndex={activeStep}
                    direction="vertical"
                    accentFrom="#a855f7"
                    accentTo="#06b6d4"
                  />
                </div>
              );
            })()}

            {/* Content sections */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Context Map Selector */}
              <ContextMapSelector
                groupedContexts={groupedContexts}
                allContexts={contexts}
                selectedContextIds={selectedContextIds}
                onToggleContext={handleToggleContext}
                onSelectAll={handleSelectAll}
                onClearAll={handleClearAll}
                loading={contextLoading}
                error={contextError instanceof Error ? contextError.message : contextError ? String(contextError) : null}
                onSetupContextMap={handleSetupContextMap}
              />

              {/* Combined Generate Panel */}
              {contexts.length > 0 && (
                <CombinedGeneratePanel
                  contexts={contexts}
                  selectedContextIds={selectedContextIds}
                  answeredQuestions={answeredQuestions}
                  onGenerateQuestions={handleGenerateQuestions}
                  onGenerateDirections={handleGenerateDirections}
                  disabled={selectedContextIds.length === 0}
                />
              )}

              {/* Generated Items with View Toggle */}
              <div className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">
                    Generated Items
                  </h2>
                  <ViewModeToggle
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    pendingDirections={directionsData?.counts.pending ?? 0}
                    totalTrees={treeData?.totalTrees ?? 0}
                  />
                </div>

                {viewMode === 'table' && (
                  <UnifiedTable
                    questions={questions}
                    directions={directions}
                    onAnswerQuestion={handleOpenAnswerModal}
                    onAcceptDirection={handleAcceptDirection}
                    onRejectDirection={handleRejectDirection}
                    onDeleteQuestion={handleDeleteQuestion}
                    onDeleteDirection={handleDeleteDirection}
                    loading={isLoading}
                  />
                )}
                {viewMode === 'matrix' && (
                  <DirectionMatrix
                    directions={directions}
                    onAcceptDirection={handleAcceptDirection}
                    onRejectDirection={handleRejectDirection}
                  />
                )}
                {viewMode === 'carousel' && (
                  <DirectionCarousel
                    directions={directions}
                    onAccept={handleAcceptDirection}
                    onReject={handleRejectDirection}
                    isLoading={isLoading}
                  />
                )}
                {viewMode === 'tree' && (
                  <QuestionTree
                    trees={treeData?.trees ?? []}
                    onAnswerQuestion={handleOpenAnswerModal}
                    onGenerateFollowUp={handleGenerateFollowUp}
                    onGenerateBrief={handleGenerateBrief}
                    onDeleteQuestion={handleDeleteQuestion}
                    onGenerateDirection={handleGenerateDirectionFromTree}
                    generatingFollowUp={generateFollowUpMutation.isPending ? (generateFollowUpMutation.variables ?? null) : null}
                    generatingBrief={generateBriefMutation.isPending ? (generateBriefMutation.variables ?? null) : null}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Answer Question Modal */}
      <AnswerQuestionModal
        question={answerModalQuestion}
        isOpen={answerModalQuestion !== null}
        onClose={handleCloseAnswerModal}
        onSave={handleSaveAnswer}
      />

      {/* Auto-Deepen Notification Toast */}
      <AutoDeepenToast
        result={autoDeepenResult}
        onDismiss={() => setAutoDeepenResult(null)}
      />
    </div>
  );
}
