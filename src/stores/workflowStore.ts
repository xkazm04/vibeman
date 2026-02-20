import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppModule } from './onboardingStore';

// Workflow step represents a navigation action with context
export interface WorkflowStep {
  module: AppModule;
  label: string;
  timestamp: number;
  entityId?: string;  // Optional entity ID (context, goal, idea, etc.)
  entityType?: 'context' | 'goal' | 'idea' | 'task' | 'scan' | 'requirement';
  entityName?: string;
  projectId?: string;
}

// Suggested next action based on current workflow state
export interface WorkflowSuggestion {
  id: string;
  label: string;
  description: string;
  module: AppModule;
  action?: string;
  priority: 'high' | 'medium' | 'low';
  icon?: string;
}

// Module metadata for quick navigation
export const MODULE_METADATA: Record<AppModule, { label: string; description: string; keywords: string[]; icon: string }> = {
  overview: { label: 'Overview', description: 'Architecture and system overview', keywords: ['overview', 'architecture', 'dashboard', 'system', 'map'], icon: 'Compass' },
  coder: { label: 'Project / Goals', description: 'View project goals and progress', keywords: ['project', 'goals', 'objectives', 'progress'], icon: 'Target' },
  contexts: { label: 'Contexts', description: 'Manage code contexts and domains', keywords: ['context', 'domain', 'code', 'files'], icon: 'FolderTree' },
  ideas: { label: 'Ideas', description: 'Generate and browse AI ideas', keywords: ['ideas', 'suggestions', 'ai', 'generate'], icon: 'Lightbulb' },
  tinder: { label: 'Tinder', description: 'Evaluate and swipe on ideas', keywords: ['evaluate', 'swipe', 'approve', 'reject'], icon: 'Heart' },
  tasker: { label: 'Tasker', description: 'Run and manage tasks', keywords: ['tasks', 'run', 'execute', 'batch'], icon: 'Play' },
  manager: { label: 'Manager', description: 'Analytics and project management', keywords: ['analytics', 'stats', 'metrics', 'management'], icon: 'BarChart3' },
  reflector: { label: 'Reflector', description: 'Reflect on past implementations', keywords: ['reflect', 'review', 'history', 'analysis'], icon: 'Activity' },
  refactor: { label: 'Refactor Wizard', description: 'Analyze and plan refactoring', keywords: ['refactor', 'wizard', 'improve', 'clean'], icon: 'Wand2' },
  halloffame: { label: 'Hall of Fame', description: 'Showcase of best implementations', keywords: ['hall', 'fame', 'best', 'showcase'], icon: 'Trophy' },
  social: { label: 'Social', description: 'Community and sharing', keywords: ['social', 'community', 'share', 'team'], icon: 'Users' },
  composer: { label: 'Blueprint Composer', description: 'Compose project blueprints', keywords: ['blueprint', 'compose', 'setup', 'wizard'], icon: 'Layers' },
  zen: { label: 'Zen Mode', description: 'Focused work mode', keywords: ['zen', 'focus', 'calm', 'work'], icon: 'Sunrise' },
  blueprint: { label: 'Blueprint', description: 'Project blueprint and setup', keywords: ['blueprint', 'setup', 'project'], icon: 'Map' },
  questions: { label: 'Questions', description: 'Generate clarifying questions for precise idea generation', keywords: ['questions', 'clarify', 'context', 'requirements'], icon: 'HelpCircle' },
  integrations: { label: 'Integrations', description: 'Manage external integrations and connectors', keywords: ['integrations', 'connectors', 'webhooks', 'external'], icon: 'Plug' },
  brain: { label: 'Brain', description: 'AI learning and memory system', keywords: ['brain', 'ai', 'learning', 'memory', 'signals'], icon: 'Brain' },
  commander: { label: 'Annette', description: 'Voice assistant and commander', keywords: ['annette', 'assistant', 'voice', 'commander'], icon: 'Bot' },
};

interface WorkflowState {
  // Navigation history (breadcrumbs)
  history: WorkflowStep[];
  maxHistoryLength: number;

  // Recent entities for quick access
  recentEntities: Array<{
    id: string;
    type: 'context' | 'goal' | 'idea' | 'task' | 'requirement' | 'scan';
    name: string;
    module: AppModule;
    projectId?: string;
    timestamp: number;
  }>;

  // Suggested next actions based on context
  suggestions: WorkflowSuggestion[];

  // Actions
  pushStep: (step: Omit<WorkflowStep, 'timestamp'>) => void;
  popStep: () => WorkflowStep | undefined;
  clearHistory: () => void;
  getBackStep: () => WorkflowStep | undefined;

  // Recent entities
  addRecentEntity: (entity: Omit<WorkflowState['recentEntities'][0], 'timestamp'>) => void;
  clearRecentEntities: () => void;

  // Suggestions
  setSuggestions: (suggestions: WorkflowSuggestion[]) => void;
  generateSuggestions: (currentModule: AppModule, projectId?: string) => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      history: [],
      maxHistoryLength: 20,
      recentEntities: [],
      suggestions: [],

      pushStep: (step) => {
        set((state) => {
          const newStep: WorkflowStep = {
            ...step,
            timestamp: Date.now(),
          };

          // Don't add duplicate consecutive steps
          const lastStep = state.history[state.history.length - 1];
          if (lastStep?.module === step.module && lastStep?.entityId === step.entityId) {
            return state;
          }

          const newHistory = [...state.history, newStep];
          // Trim history if too long
          if (newHistory.length > state.maxHistoryLength) {
            newHistory.shift();
          }

          return { history: newHistory };
        });
      },

      popStep: () => {
        const { history } = get();
        if (history.length === 0) return undefined;

        const lastStep = history[history.length - 1];
        set({ history: history.slice(0, -1) });
        return lastStep;
      },

      clearHistory: () => set({ history: [] }),

      getBackStep: () => {
        const { history } = get();
        // Get the second-to-last step (the previous location)
        return history.length >= 2 ? history[history.length - 2] : undefined;
      },

      addRecentEntity: (entity) => {
        set((state) => {
          const newEntity = { ...entity, timestamp: Date.now() };
          // Remove existing entry for same entity
          const filtered = state.recentEntities.filter(
            (e) => !(e.id === entity.id && e.type === entity.type)
          );
          // Add to front and limit to 10 recent entities
          return {
            recentEntities: [newEntity, ...filtered].slice(0, 10),
          };
        });
      },

      clearRecentEntities: () => set({ recentEntities: [] }),

      setSuggestions: (suggestions) => set({ suggestions }),

      generateSuggestions: (currentModule, projectId) => {
        const suggestions: WorkflowSuggestion[] = [];

        // Context-aware suggestions based on current module
        switch (currentModule) {
          case 'coder':
            suggestions.push(
              { id: 'view-contexts', label: 'Review Contexts', description: 'Check code organization', module: 'contexts', priority: 'medium' },
              { id: 'generate-ideas', label: 'Generate Ideas', description: 'Get AI suggestions', module: 'ideas', priority: 'high' },
            );
            break;

          case 'contexts':
            suggestions.push(
              { id: 'generate-ideas', label: 'Generate Ideas', description: 'Get suggestions for selected contexts', module: 'ideas', priority: 'high' },
              { id: 'run-blueprint', label: 'Run Blueprint', description: 'Analyze project structure', module: 'composer', priority: 'medium' },
            );
            break;

          case 'ideas':
            suggestions.push(
              { id: 'evaluate-ideas', label: 'Evaluate Ideas', description: 'Swipe through generated ideas', module: 'tinder', priority: 'high' },
              { id: 'view-manager', label: 'View Analytics', description: 'Check idea statistics', module: 'manager', priority: 'low' },
            );
            break;

          case 'tinder':
            suggestions.push(
              { id: 'create-tasks', label: 'Create Tasks', description: 'Turn approved ideas into tasks', module: 'coder', priority: 'high' },
              { id: 'run-tasks', label: 'Run Tasks', description: 'Execute pending tasks', module: 'tasker', priority: 'medium' },
            );
            break;

          case 'tasker':
            suggestions.push(
              { id: 'view-results', label: 'View Results', description: 'Check execution history', module: 'reflector', priority: 'medium' },
              { id: 'view-manager', label: 'View Analytics', description: 'Check task statistics', module: 'manager', priority: 'low' },
            );
            break;

          case 'manager':
            suggestions.push(
              { id: 'run-refactor', label: 'Run Refactor Wizard', description: 'Analyze code for improvements', module: 'refactor', priority: 'medium' },
              { id: 'view-contexts', label: 'Organize Contexts', description: 'Review code organization', module: 'contexts', priority: 'low' },
            );
            break;

          default:
            suggestions.push(
              { id: 'view-project', label: 'View Project', description: 'Go to project overview', module: 'coder', priority: 'medium' },
            );
        }

        set({ suggestions });
      },
    }),
    {
      name: 'workflow-storage',
      partialize: (state) => ({
        history: state.history.slice(-10), // Only persist last 10 steps
        recentEntities: state.recentEntities,
      }),
    }
  )
);

// Helper to get module label
export function getModuleLabel(module: AppModule): string {
  return MODULE_METADATA[module]?.label || module;
}

