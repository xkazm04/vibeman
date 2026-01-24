'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Compass, RefreshCw } from 'lucide-react';
import { DbQuestion } from '@/app/db';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import ContextMapSelector from './components/ContextMapSelector';
import CombinedGeneratePanel from './components/CombinedGeneratePanel';
import UnifiedTable from './components/UnifiedTable';
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
  useDirections,
  useAnswerQuestion,
  useDeleteQuestion,
  useAcceptDirection,
  useRejectDirection,
  useDeleteDirection,
  useInvalidateQuestionsDirections,
} from '@/lib/queries/questionsDirectionsQueries';

export default function QuestionsLayout() {
  const { activeProject } = useActiveProjectStore();

  // Context selection state (local UI state)
  const [selectedContextIds, setSelectedContextIds] = useState<string[]>([]);

  // Answer modal state
  const [answerModalQuestion, setAnswerModalQuestion] = useState<DbQuestion | null>(null);

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

  // Derived data
  const contexts = contextsData?.contexts ?? [];
  const contextGroups = contextsData?.groups ?? [];

  // Derived: grouped contexts for display
  const groupedContexts = useMemo(
    () => groupContextsByGroup(contexts, contextGroups),
    [contexts, contextGroups]
  );

  // Auto-select all contexts when they load
  const contextIds = contexts.map(c => c.id).join(',');
  useMemo(() => {
    if (contexts.length > 0 && selectedContextIds.length === 0) {
      setSelectedContextIds(contexts.map(c => c.id));
    }
  }, [contextIds]);

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

  // Directions handlers
  const handleGenerateDirections = async (
    directionsPerContext: number,
    userContext: string,
    selectedQuestionIds: string[],
    brainstormAll?: boolean
  ) => {
    if (!activeProject) return;

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

  const handleRefresh = useCallback(() => {
    invalidateAll();
  }, [invalidateAll]);

  // Derived data
  const questions = questionsData?.questions || [];
  const directions = directionsData?.directions || [];
  const answeredQuestions = useMemo(() =>
    questions.filter(q => q.status === 'answered'),
    [questions]
  );

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
            className="space-y-6"
          >
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

            {/* Unified Table */}
            <div className="pt-4">
              <h2 className="text-lg font-semibold text-white mb-4">
                Generated Items
              </h2>
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
