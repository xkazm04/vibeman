/**
 * Mutation hooks for DocsAnalysis
 * Handles create, update, delete operations with optimistic updates
 */

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ContextGroup, Context } from '@/stores/contextStore';
import type { ContextGroupRelationship } from '@/lib/queries/contextQueries';
import { docsAnalysisQueryKeys } from './queryKeys';
import { updateGroupApi, createRelationshipApi, deleteRelationshipApi } from './apiClient';

/**
 * Mutation hook for updating a context group with optimistic updates
 */
export function useUpdateGroup(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      updates,
    }: {
      groupId: string;
      updates: { name?: string; type?: 'pages' | 'client' | 'server' | 'external' | null };
    }) => updateGroupApi(groupId, updates),
    onMutate: async ({ groupId, updates }) => {
      if (!projectId) return;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: docsAnalysisQueryKeys.projectData(projectId),
      });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<{
        groups: ContextGroup[];
        contexts: Context[];
      }>(docsAnalysisQueryKeys.projectData(projectId));

      // Optimistically update
      queryClient.setQueryData<{ groups: ContextGroup[]; contexts: Context[] }>(
        docsAnalysisQueryKeys.projectData(projectId),
        old => {
          if (!old) return old;
          return {
            ...old,
            groups: old.groups.map(group =>
              group.id === groupId ? { ...group, ...updates } : group
            ),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData && projectId) {
        queryClient.setQueryData(
          docsAnalysisQueryKeys.projectData(projectId),
          context.previousData
        );
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: docsAnalysisQueryKeys.projectData(projectId),
        });
      }
    },
  });
}

/**
 * Mutation hook for creating a relationship with optimistic updates
 */
export function useCreateRelationship(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { sourceGroupId: string; targetGroupId: string }) =>
      createRelationshipApi({
        projectId: projectId!,
        sourceGroupId: data.sourceGroupId,
        targetGroupId: data.targetGroupId,
      }),
    onMutate: async ({ sourceGroupId, targetGroupId }) => {
      if (!projectId) return;

      await queryClient.cancelQueries({
        queryKey: docsAnalysisQueryKeys.relationshipsByProject(projectId),
      });

      const previousRelationships = queryClient.getQueryData<ContextGroupRelationship[]>(
        docsAnalysisQueryKeys.relationshipsByProject(projectId)
      );

      // Optimistically add the relationship
      const optimisticRelationship: ContextGroupRelationship = {
        id: `temp_${Date.now()}`,
        projectId,
        sourceGroupId,
        targetGroupId,
        createdAt: new Date(),
      };

      queryClient.setQueryData<ContextGroupRelationship[]>(
        docsAnalysisQueryKeys.relationshipsByProject(projectId),
        old => [...(old ?? []), optimisticRelationship]
      );

      return { previousRelationships };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousRelationships && projectId) {
        queryClient.setQueryData(
          docsAnalysisQueryKeys.relationshipsByProject(projectId),
          context.previousRelationships
        );
      }
    },
    onSettled: () => {
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: docsAnalysisQueryKeys.relationshipsByProject(projectId),
        });
      }
    },
  });
}

/**
 * Mutation hook for deleting a relationship with optimistic updates
 */
export function useDeleteRelationship(projectId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (relationshipId: string) => deleteRelationshipApi(relationshipId),
    onMutate: async relationshipId => {
      if (!projectId) return;

      await queryClient.cancelQueries({
        queryKey: docsAnalysisQueryKeys.relationshipsByProject(projectId),
      });

      const previousRelationships = queryClient.getQueryData<ContextGroupRelationship[]>(
        docsAnalysisQueryKeys.relationshipsByProject(projectId)
      );

      // Optimistically remove the relationship
      queryClient.setQueryData<ContextGroupRelationship[]>(
        docsAnalysisQueryKeys.relationshipsByProject(projectId),
        old => (old ?? []).filter(rel => rel.id !== relationshipId)
      );

      return { previousRelationships };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousRelationships && projectId) {
        queryClient.setQueryData(
          docsAnalysisQueryKeys.relationshipsByProject(projectId),
          context.previousRelationships
        );
      }
    },
    onSettled: () => {
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: docsAnalysisQueryKeys.relationshipsByProject(projectId),
        });
      }
    },
  });
}
