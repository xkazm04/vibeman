/**
 * Questions & Directions Query Hooks
 * React Query hooks for questions and directions with optimistic updates
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import { DbQuestion, DbDirection } from '@/app/db';
import { Context, ContextGroup } from '@/lib/queries/contextQueries';
import {
  fetchQuestions,
  answerQuestion,
  deleteQuestion,
  fetchSqliteContexts,
  fetchQuestionTrees,
  generateFollowUp,
  generateStrategicBrief,
  autoDeepen,
  QuestionsResponse,
  QuestionTreeResponse,
  AutoDeepenResponse,
} from '@/app/features/Questions/lib/questionsApi';
import {
  fetchDirections,
  acceptDirection,
  rejectDirection,
  deleteDirection,
  DirectionsResponse,
} from '@/app/features/Questions/lib/directionsApi';

// Query key factories
export const questionsQueryKeys = {
  all: ['questions'] as const,
  list: (projectId: string) => [...questionsQueryKeys.all, 'list', projectId] as const,
  trees: (projectId: string) => [...questionsQueryKeys.all, 'trees', projectId] as const,
};

export const directionsQueryKeys = {
  all: ['directions'] as const,
  list: (projectId: string) => [...directionsQueryKeys.all, 'list', projectId] as const,
};

export const questionsDirectionsQueryKeys = {
  all: ['questions-directions'] as const,
  combined: (projectId: string) => [...questionsDirectionsQueryKeys.all, projectId] as const,
};

export const contextsQueryKeys = {
  all: ['sqliteContexts'] as const,
  list: (projectId: string) => [...contextsQueryKeys.all, 'list', projectId] as const,
};

// ============ CONTEXTS ============

interface SqliteContextsData {
  contexts: Context[];
  groups: ContextGroup[];
}

/**
 * Hook for fetching SQLite contexts and groups
 */
export function useSqliteContexts(projectId: string | undefined) {
  return useQuery({
    queryKey: contextsQueryKeys.list(projectId ?? ''),
    queryFn: async (): Promise<SqliteContextsData> => {
      if (!projectId) return { contexts: [], groups: [] };
      const response = await fetchSqliteContexts(projectId);
      if (response.success) {
        return { contexts: response.contexts, groups: response.groups };
      }
      return { contexts: [], groups: [] };
    },
    enabled: !!projectId,
    staleTime: 30000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// ============ QUESTIONS ============

/**
 * Hook for fetching questions with caching
 * staleTime: 30 seconds - matches useSqliteContexts for consistency
 * Mutations invalidate the cache, so we don't need frequent refetches
 */
export function useQuestions(projectId: string | undefined) {
  return useQuery({
    queryKey: questionsQueryKeys.list(projectId ?? ''),
    queryFn: () => fetchQuestions(projectId!),
    enabled: !!projectId,
    staleTime: 30000, // 30 seconds - reduced from 5s to minimize background refetches
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Mutation for answering a question
 */
export function useAnswerQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questionId, answer, projectId }: { questionId: string; answer: string; projectId: string }) =>
      answerQuestion(questionId, answer),
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: questionsQueryKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: questionsQueryKeys.trees(projectId) });
      queryClient.invalidateQueries({ queryKey: questionsDirectionsQueryKeys.combined(projectId) });
    },
  });
}

/**
 * Mutation for deleting a question with optimistic update
 */
export function useDeleteQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questionId }: { questionId: string; projectId: string }) =>
      deleteQuestion(questionId),
    onMutate: async ({ questionId, projectId }) => {
      // Cancel outgoing refetches for this project
      await queryClient.cancelQueries({ queryKey: questionsQueryKeys.list(projectId) });

      // Snapshot question queries for this project
      const previousQuestions = queryClient.getQueryData<QuestionsResponse>(
        questionsQueryKeys.list(projectId)
      );
      const previousCombined = queryClient.getQueryData<{ questions: QuestionsResponse; directions: DirectionsResponse }>(
        questionsDirectionsQueryKeys.combined(projectId)
      );

      // Optimistically remove the question from project-scoped cache
      const updateQuestions = (old: QuestionsResponse | undefined) => {
        if (!old) return old;
        const deletedQuestion = old.items.find((q) => q.id === questionId);
        return {
          ...old,
          items: old.items.filter((q) => q.id !== questionId),
          grouped: old.grouped
            .map((g) => ({
              ...g,
              items: g.items.filter((q) => q.id !== questionId),
            }))
            .filter((g) => g.items.length > 0),
          counts: {
            ...old.counts,
            total: old.counts.total - 1,
            pending:
              deletedQuestion?.status === 'pending'
                ? old.counts.pending - 1
                : old.counts.pending,
            answered:
              deletedQuestion?.status === 'answered'
                ? old.counts.answered - 1
                : old.counts.answered,
          },
        };
      };

      queryClient.setQueryData(questionsQueryKeys.list(projectId), updateQuestions);

      if (previousCombined) {
        queryClient.setQueryData(questionsDirectionsQueryKeys.combined(projectId), {
          ...previousCombined,
          questions: updateQuestions(previousCombined.questions) ?? previousCombined.questions,
        });
      }

      return { previousQuestions, previousCombined, projectId };
    },
    onError: (_err, _variables, context) => {
      if (context) {
        queryClient.setQueryData(questionsQueryKeys.list(context.projectId), context.previousQuestions);
        queryClient.setQueryData(questionsDirectionsQueryKeys.combined(context.projectId), context.previousCombined);
      }
    },
    onSettled: (_data, _err, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: questionsQueryKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: questionsQueryKeys.trees(projectId) });
      queryClient.invalidateQueries({ queryKey: questionsDirectionsQueryKeys.combined(projectId) });
    },
  });
}

// ============ QUESTION TREES ============

/**
 * Hook for fetching question trees
 */
export function useQuestionTrees(projectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: questionsQueryKeys.trees(projectId ?? ''),
    queryFn: () => fetchQuestionTrees(projectId!),
    enabled: !!projectId && enabled,
    staleTime: 30000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

// ============ COMBINED QUESTIONS & DIRECTIONS ============

/**
 * Combined hook: fetches questions AND directions in a single API call.
 * Eliminates 2 HTTP roundtrips on QuestionsLayout mount.
 *
 * Seeds the individual questionsQueryKeys.list and directionsQueryKeys.list
 * caches so existing mutations (which invalidate those keys) continue to work
 * without modification.
 */
export function useQuestionsAndDirections(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: questionsDirectionsQueryKeys.combined(projectId ?? ''),
    queryFn: async () => {
      const response = await fetch(`/api/questions-directions?projectId=${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch questions and directions');
      }
      const data = await response.json();

      const questions = data.questions as QuestionsResponse;
      const directions = data.directions as DirectionsResponse;

      // Seed individual caches so mutations that invalidate questionsQueryKeys.all
      // or directionsQueryKeys.all will correctly mark these stale
      queryClient.setQueryData(questionsQueryKeys.list(projectId!), questions);
      queryClient.setQueryData(directionsQueryKeys.list(projectId!), directions);

      return { questions, directions };
    },
    enabled: !!projectId,
    staleTime: 30000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Mutation for generating follow-up questions
 */
export function useGenerateFollowUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questionId }: { questionId: string; projectId: string }) =>
      generateFollowUp(questionId),
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: questionsQueryKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: questionsQueryKeys.trees(projectId) });
      queryClient.invalidateQueries({ queryKey: questionsDirectionsQueryKeys.combined(projectId) });
    },
  });
}

/**
 * Mutation for generating strategic brief
 */
export function useGenerateStrategicBrief() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questionId }: { questionId: string; projectId: string }) =>
      generateStrategicBrief(questionId),
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: questionsQueryKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: questionsQueryKeys.trees(projectId) });
      queryClient.invalidateQueries({ queryKey: questionsDirectionsQueryKeys.combined(projectId) });
    },
  });
}

/**
 * Mutation for auto-deepening a question via gap detection.
 * Analyzes the answer for hedging/ambiguity and auto-generates targeted follow-ups.
 */
export function useAutoDeepen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questionId }: { questionId: string; projectId: string }) =>
      autoDeepen(questionId),
    onSuccess: (data, { projectId }) => {
      if (data.deepened) {
        queryClient.invalidateQueries({ queryKey: questionsQueryKeys.list(projectId) });
        queryClient.invalidateQueries({ queryKey: questionsQueryKeys.trees(projectId) });
        queryClient.invalidateQueries({ queryKey: questionsDirectionsQueryKeys.combined(projectId) });
      }
    },
  });
}

// ============ DIRECTIONS ============

/**
 * Hook for fetching directions with caching
 * staleTime: 30 seconds - matches useSqliteContexts for consistency
 * Mutations invalidate the cache, so we don't need frequent refetches
 */
export function useDirections(projectId: string | undefined) {
  return useQuery({
    queryKey: directionsQueryKeys.list(projectId ?? ''),
    queryFn: () => fetchDirections(projectId!),
    enabled: !!projectId,
    staleTime: 30000, // 30 seconds - reduced from 5s to minimize background refetches
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Mutation for accepting a direction with optimistic update
 */
export function useAcceptDirection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ directionId, projectPath }: { directionId: string; projectPath: string; projectId: string }) =>
      acceptDirection(directionId, projectPath),
    onMutate: async ({ directionId, projectId }) => {
      await queryClient.cancelQueries({ queryKey: directionsQueryKeys.list(projectId) });

      const previousDirections = queryClient.getQueryData<DirectionsResponse>(
        directionsQueryKeys.list(projectId)
      );
      const previousCombined = queryClient.getQueryData<{ questions: QuestionsResponse; directions: DirectionsResponse }>(
        questionsDirectionsQueryKeys.combined(projectId)
      );

      const updateDirections = (old: DirectionsResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((d) =>
            d.id === directionId ? { ...d, status: 'accepted' as const } : d
          ),
          counts: {
            ...old.counts,
            pending: old.counts.pending - 1,
            accepted: old.counts.accepted + 1,
          },
        };
      };

      queryClient.setQueryData(directionsQueryKeys.list(projectId), updateDirections);

      if (previousCombined) {
        queryClient.setQueryData(questionsDirectionsQueryKeys.combined(projectId), {
          ...previousCombined,
          directions: updateDirections(previousCombined.directions) ?? previousCombined.directions,
        });
      }

      return { previousDirections, previousCombined, projectId };
    },
    onError: (_err, _variables, context) => {
      if (context) {
        queryClient.setQueryData(directionsQueryKeys.list(context.projectId), context.previousDirections);
        queryClient.setQueryData(questionsDirectionsQueryKeys.combined(context.projectId), context.previousCombined);
      }
    },
    onSettled: (_data, _err, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: directionsQueryKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: questionsDirectionsQueryKeys.combined(projectId) });
    },
  });
}

/**
 * Mutation for rejecting a direction with optimistic update
 */
export function useRejectDirection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ directionId }: { directionId: string; projectId: string }) =>
      rejectDirection(directionId),
    onMutate: async ({ directionId, projectId }) => {
      await queryClient.cancelQueries({ queryKey: directionsQueryKeys.list(projectId) });

      const previousDirections = queryClient.getQueryData<DirectionsResponse>(
        directionsQueryKeys.list(projectId)
      );
      const previousCombined = queryClient.getQueryData<{ questions: QuestionsResponse; directions: DirectionsResponse }>(
        questionsDirectionsQueryKeys.combined(projectId)
      );

      const updateDirections = (old: DirectionsResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((d) =>
            d.id === directionId ? { ...d, status: 'rejected' as const } : d
          ),
          counts: {
            ...old.counts,
            pending: old.counts.pending - 1,
            rejected: old.counts.rejected + 1,
          },
        };
      };

      queryClient.setQueryData(directionsQueryKeys.list(projectId), updateDirections);

      if (previousCombined) {
        queryClient.setQueryData(questionsDirectionsQueryKeys.combined(projectId), {
          ...previousCombined,
          directions: updateDirections(previousCombined.directions) ?? previousCombined.directions,
        });
      }

      return { previousDirections, previousCombined, projectId };
    },
    onError: (_err, _variables, context) => {
      if (context) {
        queryClient.setQueryData(directionsQueryKeys.list(context.projectId), context.previousDirections);
        queryClient.setQueryData(questionsDirectionsQueryKeys.combined(context.projectId), context.previousCombined);
      }
    },
    onSettled: (_data, _err, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: directionsQueryKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: questionsDirectionsQueryKeys.combined(projectId) });
    },
  });
}

/**
 * Mutation for deleting a direction with optimistic update
 */
export function useDeleteDirection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ directionId }: { directionId: string; projectId: string }) =>
      deleteDirection(directionId),
    onMutate: async ({ directionId, projectId }) => {
      await queryClient.cancelQueries({ queryKey: directionsQueryKeys.list(projectId) });

      const previousDirections = queryClient.getQueryData<DirectionsResponse>(
        directionsQueryKeys.list(projectId)
      );
      const previousCombined = queryClient.getQueryData<{ questions: QuestionsResponse; directions: DirectionsResponse }>(
        questionsDirectionsQueryKeys.combined(projectId)
      );

      const updateDirections = (old: DirectionsResponse | undefined) => {
        if (!old) return old;
        const deletedDirection = old.items.find((d) => d.id === directionId);
        return {
          ...old,
          items: old.items.filter((d) => d.id !== directionId),
          grouped: old.grouped
            .map((g) => ({
              ...g,
              items: g.items.filter((d) => d.id !== directionId),
            }))
            .filter((g) => g.items.length > 0),
          counts: {
            ...old.counts,
            total: old.counts.total - 1,
            pending:
              deletedDirection?.status === 'pending'
                ? old.counts.pending - 1
                : old.counts.pending,
            accepted:
              deletedDirection?.status === 'accepted'
                ? old.counts.accepted - 1
                : old.counts.accepted,
            rejected:
              deletedDirection?.status === 'rejected'
                ? old.counts.rejected - 1
                : old.counts.rejected,
          },
        };
      };

      queryClient.setQueryData(directionsQueryKeys.list(projectId), updateDirections);

      if (previousCombined) {
        queryClient.setQueryData(questionsDirectionsQueryKeys.combined(projectId), {
          ...previousCombined,
          directions: updateDirections(previousCombined.directions) ?? previousCombined.directions,
        });
      }

      return { previousDirections, previousCombined, projectId };
    },
    onError: (_err, _variables, context) => {
      if (context) {
        queryClient.setQueryData(directionsQueryKeys.list(context.projectId), context.previousDirections);
        queryClient.setQueryData(questionsDirectionsQueryKeys.combined(context.projectId), context.previousCombined);
      }
    },
    onSettled: (_data, _err, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: directionsQueryKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: questionsDirectionsQueryKeys.combined(projectId) });
    },
  });
}

/**
 * Hook to invalidate questions and directions queries.
 * When projectId is provided, only that project's caches are invalidated.
 * Falls back to broad invalidation when no projectId is available.
 */
export function useInvalidateQuestionsDirections() {
  const queryClient = useQueryClient();

  return useCallback((projectId?: string) => {
    if (projectId) {
      queryClient.invalidateQueries({ queryKey: questionsQueryKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: questionsQueryKeys.trees(projectId) });
      queryClient.invalidateQueries({ queryKey: directionsQueryKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: questionsDirectionsQueryKeys.combined(projectId) });
    } else {
      queryClient.invalidateQueries({ queryKey: questionsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: directionsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: questionsDirectionsQueryKeys.all });
    }
  }, [queryClient]);
}
