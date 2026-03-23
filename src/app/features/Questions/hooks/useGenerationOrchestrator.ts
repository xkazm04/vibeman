import { useState, useCallback, useEffect, useRef } from 'react';
import { DbQuestion } from '@/app/db';
import {
  generateQuestionRequirement,
  setupContextMapGenerator,
} from '../lib/questionsApi';
import {
  generateDirectionRequirement,
  AnsweredQuestionInput,
} from '../lib/directionsApi';
import {
  useAnswerQuestion,
  useDeleteQuestion,
  useAcceptDirection,
  useRejectDirection,
  useDeleteDirection,
  useGenerateFollowUp,
  useGenerateStrategicBrief,
  useInvalidateQuestionsDirections,
} from '@/lib/queries/questionsDirectionsQueries';
import { useEventBus } from '@/hooks/useEventBus';
import type { QuestionAutoDeepenedEvent } from '@/lib/events/types';

interface GenerationOrchestratorInput {
  activeProject: { id: string; name: string; path: string } | null;
  contexts: { id: string }[];
  selectedContextIds: string[];
  questions: DbQuestion[];
  answeredQuestions: DbQuestion[];
}

export function useGenerationOrchestrator({
  activeProject,
  contexts,
  selectedContextIds,
  questions,
  answeredQuestions,
}: GenerationOrchestratorInput) {
  // Answer modal state
  const [answerModalQuestion, setAnswerModalQuestion] = useState<DbQuestion | null>(null);

  // Auto-deepen notification state (populated via SSE events)
  const [autoDeepenResult, setAutoDeepenResult] = useState<QuestionAutoDeepenedEvent | null>(null);
  const autoDeepenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mutations
  const answerQuestionMutation = useAnswerQuestion();
  const deleteQuestionMutation = useDeleteQuestion();
  const acceptDirectionMutation = useAcceptDirection();
  const rejectDirectionMutation = useRejectDirection();
  const deleteDirectionMutation = useDeleteDirection();
  const generateFollowUpMutation = useGenerateFollowUp();
  const generateBriefMutation = useGenerateStrategicBrief();
  const invalidateAll = useInvalidateQuestionsDirections();

  // SSE listener for auto-deepen results (event-driven, replaces imperative trigger)
  useEventBus({
    projectId: activeProject?.id,
    enabled: !!activeProject,
    replay: false,
    handlers: {
      'question:auto_deepened': (event) => {
        if (event.deepened || event.gapCount > 0) {
          setAutoDeepenResult(event);
          // Auto-dismiss after 6s
          if (autoDeepenTimerRef.current) clearTimeout(autoDeepenTimerRef.current);
          autoDeepenTimerRef.current = setTimeout(() => setAutoDeepenResult(null), 6000);
        }
        // Invalidate caches so tree view updates with new follow-ups
        if (event.deepened && activeProject) {
          invalidateAll(activeProject.id);
        }
      },
    },
  });

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoDeepenTimerRef.current) clearTimeout(autoDeepenTimerRef.current);
    };
  }, []);

  // Context map setup
  const handleSetupContextMap = useCallback(async () => {
    if (!activeProject?.path) return;
    await setupContextMapGenerator(activeProject.path);
  }, [activeProject?.path]);

  // Question generation
  const handleGenerateQuestions = async (questionsPerContext: number) => {
    if (!activeProject) return;
    try {
      const result = await generateQuestionRequirement({
        projectId: activeProject.id,
        projectName: activeProject.name,
        projectPath: activeProject.path,
        selectedContextIds,
        questionsPerContext,
      });
      return {
        requirementPath: result.requirementPath,
        requirementName: result.requirementName,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate questions: ${message}`);
    }
  };

  // Direction generation
  const handleGenerateDirections = async (
    directionsPerContext: number,
    userContext: string,
    selectedQuestionIds: string[],
    brainstormAll?: boolean
  ) => {
    if (!activeProject) return;
    try {
      const contextIdsToUse = brainstormAll
        ? contexts.map(c => c.id)
        : selectedContextIds;

      const answeredQuestionsInput: AnsweredQuestionInput[] = answeredQuestions
        .filter(q => selectedQuestionIds.includes(q.id))
        .map(q => ({
          id: q.id,
          question: q.question,
          answer: q.answer || '',
        }));

      const result = await generateDirectionRequirement({
        projectId: activeProject.id,
        projectName: activeProject.name,
        projectPath: activeProject.path,
        selectedContextIds: contextIdsToUse,
        directionsPerContext,
        userContext: userContext.trim() || undefined,
        answeredQuestions: answeredQuestionsInput.length > 0 ? answeredQuestionsInput : undefined,
        brainstormAll,
      });
      return {
        requirementPath: result.requirementPath,
        requirementName: result.requirementName,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate directions: ${message}`);
    }
  };

  // Answer modal
  const handleOpenAnswerModal = useCallback((question: DbQuestion) => {
    setAnswerModalQuestion(question);
  }, []);

  const handleCloseAnswerModal = useCallback(() => {
    setAnswerModalQuestion(null);
  }, []);

  const handleSaveAnswer = useCallback(async (questionId: string, answer: string) => {
    if (!activeProject) return;
    // Answering emits a question:answered event server-side, which triggers
    // auto-deepen asynchronously. Results arrive via SSE (question:auto_deepened).
    await answerQuestionMutation.mutateAsync({ questionId, answer, projectId: activeProject.id });
  }, [answerQuestionMutation, activeProject]);

  // CRUD handlers
  const handleDeleteQuestion = useCallback(async (questionId: string) => {
    if (!activeProject) return;
    deleteQuestionMutation.mutate({ questionId, projectId: activeProject.id });
  }, [deleteQuestionMutation, activeProject]);

  const handleAcceptDirection = useCallback(async (directionId: string) => {
    if (!activeProject?.path) return;
    acceptDirectionMutation.mutate({ directionId, projectPath: activeProject.path, projectId: activeProject.id });
  }, [activeProject, acceptDirectionMutation]);

  const handleRejectDirection = useCallback(async (directionId: string) => {
    if (!activeProject) return;
    rejectDirectionMutation.mutate({ directionId, projectId: activeProject.id });
  }, [rejectDirectionMutation, activeProject]);

  const handleDeleteDirection = useCallback(async (directionId: string) => {
    if (!activeProject) return;
    deleteDirectionMutation.mutate({ directionId, projectId: activeProject.id });
  }, [deleteDirectionMutation, activeProject]);

  // Tree handlers
  const handleGenerateFollowUp = useCallback(async (parentId: string) => {
    if (!activeProject) return;
    await generateFollowUpMutation.mutateAsync({ questionId: parentId, projectId: activeProject.id });
  }, [generateFollowUpMutation, activeProject]);

  const handleGenerateBrief = useCallback(async (questionId: string) => {
    if (!activeProject) return;
    await generateBriefMutation.mutateAsync({ questionId, projectId: activeProject.id });
  }, [generateBriefMutation, activeProject]);

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
      invalidateAll(activeProject.id);
    } catch {
      // Error handled by UI feedback
    }
  }, [activeProject, questions, invalidateAll]);

  return {
    // Answer modal
    answerModalQuestion,
    handleOpenAnswerModal,
    handleCloseAnswerModal,
    handleSaveAnswer,
    // Auto-deepen
    autoDeepenResult,
    setAutoDeepenResult,
    // Generation
    handleSetupContextMap,
    handleGenerateQuestions,
    handleGenerateDirections,
    // CRUD
    handleDeleteQuestion,
    handleAcceptDirection,
    handleRejectDirection,
    handleDeleteDirection,
    // Tree
    handleGenerateFollowUp,
    handleGenerateBrief,
    handleGenerateDirectionFromTree,
    generateFollowUpMutation,
    generateBriefMutation,
  };
}
