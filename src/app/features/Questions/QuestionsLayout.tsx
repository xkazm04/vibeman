'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Compass, RefreshCw, GitBranch, Table2, Grid3X3, Layers } from 'lucide-react';
import { DbQuestion } from '@/app/db';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import ContextMapSelector from './components/ContextMapSelector';
import CombinedGeneratePanel from './components/CombinedGeneratePanel';
import UnifiedTable from './components/UnifiedTable';
import DirectionMatrix from './components/DirectionMatrix';
import QuestionTree from './components/QuestionTree';
import DirectionCarousel from '@/app/features/Proposals/components/DirectionCarousel';
import AnswerQuestionModal from './components/AnswerQuestionModal';
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
  useQuestions,
  useQuestionTrees,
  useGenerateFollowUp,
  useGenerateStrategicBrief,
  useDirections,
  useAnswerQuestion,
  useDeleteQuestion,
  useAcceptDirection,
  useRejectDirection,
  useDeleteDirection,
  useInvalidateQuestionsDirections,
} from '@/lib/queries/questionsDirectionsQueries';

// Interrogative engines for programmatic access to the generate → decide → act pattern.
// UI components continue using React Query hooks for rendering; these engines provide
// the same pattern for non-UI consumers (tests, automation, CLI tools).
export { createQuestionsEngine, createDirectionsEngine } from '@/lib/interrogative-engine';

export default function QuestionsLayout() {
  const { activeProject } = useActiveProjectStore();

  // Context selection state (local UI state)
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);

  // Answer modal state
  const [answerModalQuestion, setAnswerModalQuestion] = useState<DbQuestion | null>(null);

  // View toggle: 'table', 'tree', 'matrix', or 'carousel'
  const [viewMode, setViewMode] = useState<'table' | 'tree' | 'matrix' | 'carousel'>('table');

  // React Query hooks for data fetching
  const {
    data: contextsData,
    isLoading: contextLoading,
    error: contextError,
  } = useSqliteContexts(activeProject?.id);

  const {
    data: questionsData,
    isLoading: questionsLoading,
  } = useQuestions(activeProject?.id);

  const {
    data: directionsData,
    isLoading: directionsLoading,
  } = useDirections(activeProject?.id);

  // Mutations
  const answerQuestionMutation = useAnswerQuestion();
  const deleteQuestionMutation = useDeleteQuestion();
  const acceptDirectionMutation = useAcceptDirection();
  const rejectDirectionMutation = useRejectDirection();
  const deleteDirectionMutation = useDeleteDirection();
  const invalidateAll = useInvalidateQuestionsDirections();

  // Tree data & mutations
  const { data: treeData } = useQuestionTrees(activeProject?.id);
  const generateFollowUpMutation = useGenerateFollowUp();
  const generateBriefMutation = useGenerateStrategicBrief();

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
    if (activeProject?.id !== lastProjectIdRef.current) {
      lastProjectIdRef.current = activeProject?.id;
      hasInitializedRef.current = false;
      // Clear selection when switching projects to avoid stale selections
      setSelectedContextIds([]);
    }

    // Auto-select all contexts once when they first become available for this project
    if (contexts.length > 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      setSelectedContextIds(contexts.map(c => c.id));
    }
  }, [contexts, activeProject?.id]);

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

  const handleSaveAnswer = useCallback(async (questionId: string, answer: string) => {
    await answerQuestionMutation.mutateAsync({ questionId, answer });
  }, [answerQuestionMutation]);

  const handleDeleteQuestion = useCallback((questionId: string) => {
    deleteQuestionMutation.mutate(questionId);
  }, [deleteQuestionMutation]);

  // Derived data - must be defined before handlers that reference them
  const questions = questionsData?.questions || [];
  const directions = directionsData?.directions || [];
  const answeredQuestions = useMemo(() =>
    questions.filter(q => q.status === 'answered'),
    [questions]
  );

  // Directions handlers
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

  const handleAcceptDirection = useCallback((directionId: string) => {
    if (!activeProject?.path) return;
    acceptDirectionMutation.mutate({ directionId, projectPath: activeProject.path });
  }, [activeProject?.path, acceptDirectionMutation]);

  const handleRejectDirection = useCallback((directionId: string) => {
    rejectDirectionMutation.mutate(directionId);
  }, [rejectDirectionMutation]);

  const handleDeleteDirection = useCallback((directionId: string) => {
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

  const isLoading = questionsLoading || directionsLoading;

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
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl border shadow-lg bg-gradient-to-br from-purple-500/20 via-cyan-500/10 to-teal-500/20 border-purple-500/30 shadow-purple-500/10">
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
            {/* Step indicator rail */}
            <div className="flex flex-col items-center pt-4 flex-shrink-0">
              {/* Step 1 — Select Contexts */}
              <div className="group relative flex flex-col items-center">
                <div
                  role="img"
                  aria-label="Step 1: Select Contexts"
                  title="Select Contexts"
                  className={`w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center flex-shrink-0 transition-colors ${
                    selectedContextIds.length > 0
                      ? 'bg-purple-500/20 border-purple-500/60 text-purple-400'
                      : 'bg-gray-800 border-gray-600/40 text-gray-500'
                  }`}
                >
                  1
                </div>
                <span className="mt-0.5 text-[9px] leading-tight text-gray-500 font-medium whitespace-nowrap">Select</span>
                <div className="pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 border border-gray-700/60 text-gray-200 text-xs px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap z-50">
                  Select Contexts
                </div>
              </div>
              {/* Connector line 1→2 */}
              <div className="w-px flex-1 min-h-[24px] border-l-2 border-dashed border-gray-700/30" />
              {/* Step 2 — Generate */}
              <div className="group relative flex flex-col items-center">
                <div
                  role="img"
                  aria-label="Step 2: Generate"
                  title="Generate"
                  className={`w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center flex-shrink-0 transition-colors ${
                    contexts.length > 0 && selectedContextIds.length > 0
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-400'
                      : 'bg-gray-800 border-gray-600/40 text-gray-500'
                  }`}
                >
                  2
                </div>
                <span className="mt-0.5 text-[9px] leading-tight text-gray-500 font-medium whitespace-nowrap">Generate</span>
                <div className="pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 border border-gray-700/60 text-gray-200 text-xs px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap z-50">
                  Generate Questions & Directions
                </div>
              </div>
              {/* Connector line 2→3 */}
              <div className="w-px flex-1 min-h-[24px] border-l-2 border-dashed border-gray-700/30" />
              {/* Step 3 — Review Results */}
              <div className="group relative flex flex-col items-center">
                <div
                  role="img"
                  aria-label="Step 3: Review Results"
                  title="Review Results"
                  className={`w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center flex-shrink-0 transition-colors ${
                    questions.length > 0 || directions.length > 0
                      ? 'bg-purple-500/20 border-purple-500/60 text-purple-400'
                      : 'bg-gray-800 border-gray-600/40 text-gray-500'
                  }`}
                >
                  3
                </div>
                <span className="mt-0.5 text-[9px] leading-tight text-gray-500 font-medium whitespace-nowrap">Review</span>
                <div className="pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 border border-gray-700/60 text-gray-200 text-xs px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap z-50">
                  Review Results
                </div>
              </div>
            </div>

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
                  <div className="flex items-center gap-1 bg-gray-800/60 rounded-lg p-0.5 border border-gray-700/40">
                    <button
                      onClick={() => setViewMode('table')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        viewMode === 'table'
                          ? 'bg-gray-700/80 text-white shadow-sm'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      <Table2 className="w-3.5 h-3.5" />
                      Table
                    </button>
                    <button
                      onClick={() => setViewMode('matrix')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        viewMode === 'matrix'
                          ? 'bg-cyan-600/30 text-cyan-300 shadow-sm border border-cyan-500/20'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      <Grid3X3 className="w-3.5 h-3.5" />
                      Matrix
                    </button>
                    <button
                      onClick={() => setViewMode('carousel')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        viewMode === 'carousel'
                          ? 'bg-emerald-600/30 text-emerald-300 shadow-sm border border-emerald-500/20'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Carousel
                      {(directionsData?.counts.pending ?? 0) > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
                          {directionsData?.counts.pending}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setViewMode('tree')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        viewMode === 'tree'
                          ? 'bg-purple-600/30 text-purple-300 shadow-sm border border-purple-500/20'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      Tree
                      {(treeData?.totalTrees ?? 0) > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px]">
                          {treeData?.totalTrees}
                        </span>
                      )}
                    </button>
                  </div>
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
    </div>
  );
}
