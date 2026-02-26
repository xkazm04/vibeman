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
  QuestionsResponse,
  QuestionTreeResponse,
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
    mutationFn: ({ questionId, answer }: { questionId: string; answer: string }) =>
      answerQuestion(questionId, answer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionsQueryKeys.all });
    },
  });
}

/**
 * Mutation for deleting a question with optimistic update
 */
export function useDeleteQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (questionId: string) => deleteQuestion(questionId),
    onMutate: async (questionId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: questionsQueryKeys.all });

      // Snapshot all question queries
      const previousData = queryClient.getQueriesData<QuestionsResponse>({
        queryKey: questionsQueryKeys.all,
      });

      // Optimistically remove the question from all caches
      queryClient.setQueriesData<QuestionsResponse>(
        { queryKey: questionsQueryKeys.all },
        (old) => {
          if (!old) return old;
          const deletedQuestion = old.questions.find((q) => q.id === questionId);
          return {
            ...old,
            questions: old.questions.filter((q) => q.id !== questionId),
            grouped: old.grouped
              .map((g) => ({
                ...g,
                questions: g.questions.filter((q) => q.id !== questionId),
              }))
              .filter((g) => g.questions.length > 0),
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
        }
      );

      return { previousData };
    },
    onError: (_err, _questionId, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: questionsQueryKeys.all });
    },
  });
}

// ============ QUESTION TREES ============

/**
 * Hook for fetching question trees
 */
export function useQuestionTrees(projectId: string | undefined) {
  return useQuery({
    queryKey: questionsQueryKeys.trees(projectId ?? ''),
    queryFn: () => fetchQuestionTrees(projectId!),
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
    mutationFn: (questionId: string) => generateFollowUp(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionsQueryKeys.all });
    },
  });
}

/**
 * Mutation for generating strategic brief
 */
export function useGenerateStrategicBrief() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (questionId: string) => generateStrategicBrief(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionsQueryKeys.all });
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
    mutationFn: ({ directionId, projectPath }: { directionId: string; projectPath: string }) =>
      acceptDirection(directionId, projectPath),
    onMutate: async ({ directionId }) => {
      await queryClient.cancelQueries({ queryKey: directionsQueryKeys.all });

      const previousData = queryClient.getQueriesData<DirectionsResponse>({
        queryKey: directionsQueryKeys.all,
      });

      queryClient.setQueriesData<DirectionsResponse>(
        { queryKey: directionsQueryKeys.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            directions: old.directions.map((d) =>
              d.id === directionId ? { ...d, status: 'accepted' as const } : d
            ),
            counts: {
              ...old.counts,
              pending: old.counts.pending - 1,
              accepted: old.counts.accepted + 1,
            },
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: directionsQueryKeys.all });
    },
  });
}

/**
 * Mutation for rejecting a direction with optimistic update
 */
export function useRejectDirection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (directionId: string) => rejectDirection(directionId),
    onMutate: async (directionId) => {
      await queryClient.cancelQueries({ queryKey: directionsQueryKeys.all });

      const previousData = queryClient.getQueriesData<DirectionsResponse>({
        queryKey: directionsQueryKeys.all,
      });

      queryClient.setQueriesData<DirectionsResponse>(
        { queryKey: directionsQueryKeys.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            directions: old.directions.map((d) =>
              d.id === directionId ? { ...d, status: 'rejected' as const } : d
            ),
            counts: {
              ...old.counts,
              pending: old.counts.pending - 1,
              rejected: old.counts.rejected + 1,
            },
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _directionId, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: directionsQueryKeys.all });
    },
  });
}

/**
 * Mutation for deleting a direction with optimistic update
 */
export function useDeleteDirection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (directionId: string) => deleteDirection(directionId),
    onMutate: async (directionId) => {
      await queryClient.cancelQueries({ queryKey: directionsQueryKeys.all });

      const previousData = queryClient.getQueriesData<DirectionsResponse>({
        queryKey: directionsQueryKeys.all,
      });

      queryClient.setQueriesData<DirectionsResponse>(
        { queryKey: directionsQueryKeys.all },
        (old) => {
          if (!old) return old;
          const deletedDirection = old.directions.find((d) => d.id === directionId);
          return {
            ...old,
            directions: old.directions.filter((d) => d.id !== directionId),
            grouped: old.grouped
              .map((g) => ({
                ...g,
                directions: g.directions.filter((d) => d.id !== directionId),
              }))
              .filter((g) => g.directions.length > 0),
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
        }
      );

      return { previousData };
    },
    onError: (_err, _directionId, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: directionsQueryKeys.all });
    },
  });
}

/**
 * Hook to invalidate questions and directions queries
 */
export function useInvalidateQuestionsDirections() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: questionsQueryKeys.all });
    queryClient.invalidateQueries({ queryKey: directionsQueryKeys.all });
  }, [queryClient]);
}
