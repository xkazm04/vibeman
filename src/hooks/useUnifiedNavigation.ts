'use client';

import { useCallback, useEffect } from 'react';
import { useOnboardingStore, type AppModule } from '@/stores/onboardingStore';
import { useWorkflowStore, getModuleLabel } from '@/stores/workflowStore';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

// Entity types that can be navigated to
export type NavigableEntity = {
  type: 'context' | 'goal' | 'idea' | 'task' | 'requirement' | 'scan';
  id: string;
  name: string;
  projectId?: string;
};

// Mapping from entity types to their destination modules
const ENTITY_MODULE_MAP: Record<NavigableEntity['type'], AppModule> = {
  context: 'contexts',
  goal: 'coder',
  idea: 'ideas',
  task: 'tasker',
  requirement: 'tasker',
  scan: 'composer',
};

/**
 * Unified navigation hook that provides consistent navigation across the app
 * with workflow tracking, breadcrumbs, and entity-aware navigation.
 */
export function useUnifiedNavigation() {
  const { activeModule, setActiveModule } = useOnboardingStore();
  const {
    pushStep,
    addRecentEntity,
    generateSuggestions,
    openCommandPalette,
  } = useWorkflowStore();
  const { activeProject } = useActiveProjectStore();

  // Generate suggestions when module changes
  useEffect(() => {
    generateSuggestions(activeModule, activeProject?.id);
  }, [activeModule, activeProject?.id, generateSuggestions]);

  /**
   * Navigate to a module with workflow tracking
   */
  const navigateTo = useCallback((
    module: AppModule,
    options?: {
      entity?: NavigableEntity;
      skipHistory?: boolean;
    }
  ) => {
    const { entity, skipHistory = false } = options || {};

    // Set the active module
    setActiveModule(module);

    // Track in workflow history
    if (!skipHistory) {
      pushStep({
        module,
        label: getModuleLabel(module),
        entityId: entity?.id,
        entityType: entity?.type,
        entityName: entity?.name,
        projectId: entity?.projectId || activeProject?.id,
      });
    }

    // Track entity as recent
    if (entity) {
      addRecentEntity({
        id: entity.id,
        type: entity.type,
        name: entity.name,
        module,
        projectId: entity.projectId || activeProject?.id,
      });
    }
  }, [setActiveModule, pushStep, addRecentEntity, activeProject?.id]);

  /**
   * Navigate to an entity (context, goal, idea, etc.)
   */
  const navigateToEntity = useCallback((entity: NavigableEntity) => {
    const targetModule = ENTITY_MODULE_MAP[entity.type];
    navigateTo(targetModule, { entity });
  }, [navigateTo]);

  /**
   * Navigate to a context
   */
  const navigateToContext = useCallback((contextId: string, contextName: string, projectId?: string) => {
    navigateToEntity({
      type: 'context',
      id: contextId,
      name: contextName,
      projectId,
    });
  }, [navigateToEntity]);

  /**
   * Navigate to a goal
   */
  const navigateToGoal = useCallback((goalId: string, goalName: string, projectId?: string) => {
    navigateToEntity({
      type: 'goal',
      id: goalId,
      name: goalName,
      projectId,
    });
  }, [navigateToEntity]);

  /**
   * Navigate to an idea
   */
  const navigateToIdea = useCallback((ideaId: string, ideaName: string, projectId?: string) => {
    navigateToEntity({
      type: 'idea',
      id: ideaId,
      name: ideaName,
      projectId,
    });
  }, [navigateToEntity]);

  /**
   * Navigate to a task/requirement
   */
  const navigateToTask = useCallback((taskId: string, taskName: string, projectId?: string) => {
    navigateToEntity({
      type: 'task',
      id: taskId,
      name: taskName,
      projectId,
    });
  }, [navigateToEntity]);

  /**
   * Open the command palette
   */
  const openSearch = useCallback(() => {
    openCommandPalette();
  }, [openCommandPalette]);

  /**
   * Get keyboard shortcut for module navigation
   */
  const getModuleShortcut = useCallback((module: AppModule): string | null => {
    const shortcuts: Partial<Record<AppModule, string>> = {
      coder: 'Ctrl+1',
      contexts: 'Ctrl+2',
      ideas: 'Ctrl+3',
      tinder: 'Ctrl+4',
      tasker: 'Ctrl+5',
      manager: 'Ctrl+6',
    };
    return shortcuts[module] || null;
  }, []);

  return {
    // Current state
    activeModule,
    activeProject,

    // Navigation
    navigateTo,
    navigateToEntity,
    navigateToContext,
    navigateToGoal,
    navigateToIdea,
    navigateToTask,

    // Command palette
    openSearch,

    // Utilities
    getModuleShortcut,
    getModuleLabel,
  };
}

/**
 * Hook to set up global keyboard shortcuts for navigation
 */
export function useNavigationShortcuts() {
  const { navigateTo, openSearch } = useUnifiedNavigation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // Ctrl+1-6 for module navigation
      if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        const moduleMap: Record<string, AppModule> = {
          '1': 'coder',
          '2': 'contexts',
          '3': 'ideas',
          '4': 'tinder',
          '5': 'tasker',
          '6': 'manager',
        };

        const module = moduleMap[e.key];
        if (module) {
          e.preventDefault();
          navigateTo(module);
          return;
        }
      }

      // Note: Ctrl+K is handled by CommandPalette component
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateTo, openSearch]);
}
