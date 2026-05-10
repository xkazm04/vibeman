/**
 * Task Dependency Store
 *
 * Manages dependency edges between requirements (parent → child).
 * A child is "blocked" until all its parents reach `completed` status.
 * Also manages the Cmd+click linking UX state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createPersistConfig } from '@/stores/utils/persistence';
import type { DependencyEdge, RequirementIdString, TaskStatusUnion } from '../lib/types';
import {
  detectCycle,
  buildMaps,
  isRequirementBlocked,
  getBlockingParents as getBlockingParentsUtil,
} from '../lib/dependencyUtils';

// ============================================================================
// State
// ============================================================================

interface DependencyState {
  edges: DependencyEdge[];
  /** Derived caches — rebuilt on every edge mutation */
  parentMap: Record<string, string[]>;
  childMap: Record<string, string[]>;
  /** Active linking source for Cmd+click UX */
  linkingFrom: RequirementIdString | null;
}

interface DependencyActions {
  addDependency: (from: RequirementIdString, to: RequirementIdString) => boolean;
  removeDependency: (from: RequirementIdString, to: RequirementIdString) => void;
  clearDependenciesFor: (reqId: RequirementIdString) => void;
  startLinking: (from: RequirementIdString) => void;
  completeLinking: (to: RequirementIdString) => boolean;
  cancelLinking: () => void;
  pruneOrphanedEdges: (validIds: Set<string>) => void;

  // Queries (use getState() for imperative access)
  getParents: (reqId: string) => string[];
  getChildren: (reqId: string) => string[];
  isBlocked: (reqId: string, taskStatuses: Record<string, { status: TaskStatusUnion }>) => boolean;
  getBlockingParents: (reqId: string, taskStatuses: Record<string, { status: TaskStatusUnion }>) => string[];
  hasCycle: (from: string, to: string) => boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function rebuildMaps(edges: DependencyEdge[]) {
  return buildMaps(edges);
}

// ============================================================================
// Store
// ============================================================================

export const useDependencyStore = create<DependencyState & DependencyActions>()(
  persist(
    (set, get) => ({
      edges: [],
      parentMap: {},
      childMap: {},
      linkingFrom: null,

      addDependency: (from, to) => {
        const { edges } = get();
        // Check for duplicate
        if (edges.some(e => e.from === from && e.to === to)) return false;
        // Check for cycle
        if (detectCycle(edges, from, to)) return false;

        const newEdges = [...edges, { from, to }];
        const maps = rebuildMaps(newEdges);
        set({ edges: newEdges, ...maps });
        return true;
      },

      removeDependency: (from, to) => {
        const { edges } = get();
        const newEdges = edges.filter(e => !(e.from === from && e.to === to));
        if (newEdges.length === edges.length) return;
        const maps = rebuildMaps(newEdges);
        set({ edges: newEdges, ...maps });
      },

      clearDependenciesFor: (reqId) => {
        const { edges } = get();
        const newEdges = edges.filter(e => e.from !== reqId && e.to !== reqId);
        if (newEdges.length === edges.length) return;
        const maps = rebuildMaps(newEdges);
        set({ edges: newEdges, ...maps });
      },

      startLinking: (from) => {
        set({ linkingFrom: from });
      },

      completeLinking: (to) => {
        const { linkingFrom, edges } = get();
        if (!linkingFrom || linkingFrom === to) {
          set({ linkingFrom: null });
          return false;
        }

        // Check for duplicate
        if (edges.some(e => e.from === linkingFrom && e.to === to)) {
          set({ linkingFrom: null });
          return false;
        }

        // Check for cycle
        if (detectCycle(edges, linkingFrom, to)) {
          set({ linkingFrom: null });
          return false;
        }

        const newEdges = [...edges, { from: linkingFrom, to }];
        const maps = rebuildMaps(newEdges);
        set({ edges: newEdges, ...maps, linkingFrom: null });
        return true;
      },

      cancelLinking: () => {
        set({ linkingFrom: null });
      },

      pruneOrphanedEdges: (validIds) => {
        const { edges } = get();
        const newEdges = edges.filter(e => validIds.has(e.from) && validIds.has(e.to));
        if (newEdges.length === edges.length) return;
        const maps = rebuildMaps(newEdges);
        set({ edges: newEdges, ...maps });
      },

      // Queries
      getParents: (reqId) => get().parentMap[reqId] ?? [],
      getChildren: (reqId) => get().childMap[reqId] ?? [],

      isBlocked: (reqId, taskStatuses) => {
        return isRequirementBlocked(reqId, get().parentMap, taskStatuses);
      },

      getBlockingParents: (reqId, taskStatuses) => {
        return getBlockingParentsUtil(reqId, get().parentMap, taskStatuses);
      },

      hasCycle: (from, to) => {
        return detectCycle(get().edges, from, to);
      },
    }),
    createPersistConfig<DependencyState & DependencyActions>('task-dependencies', {
      category: 'session_work',
      version: 1,
      partialize: (state) => ({
        edges: state.edges,
        parentMap: state.parentMap,
        childMap: state.childMap,
      }) as Partial<DependencyState & DependencyActions>,
    }),
  ),
);
