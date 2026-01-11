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

// Quick action for command palette
export interface QuickAction {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  category: 'navigation' | 'action' | 'entity' | 'recent';
  module?: AppModule;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  shortcut?: string;
  icon?: string;
  action?: () => void;
}

// Workflow template defining common user journeys
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: AppModule[];
}

// Predefined workflow templates
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'idea-to-implementation',
    name: 'Idea to Implementation',
    description: 'Full cycle from idea generation to code execution',
    steps: ['ideas', 'tinder', 'coder', 'tasker'],
  },
  {
    id: 'context-review',
    name: 'Context Review',
    description: 'Review and organize code contexts',
    steps: ['contexts', 'ideas', 'manager'],
  },
  {
    id: 'daily-standup',
    name: 'Daily Standup',
    description: 'Morning workflow for daily progress',
    steps: ['coder', 'tasker', 'manager'],
  },
  {
    id: 'refactoring-flow',
    name: 'Refactoring Flow',
    description: 'Analyze and refactor code systematically',
    steps: ['refactor', 'contexts', 'tasker'],
  },
];

// Module metadata for quick navigation
export const MODULE_METADATA: Record<AppModule, { label: string; description: string; keywords: string[]; icon: string }> = {
  coder: { label: 'Project / Goals', description: 'View project goals and progress', keywords: ['project', 'goals', 'objectives', 'progress'], icon: 'Target' },
  contexts: { label: 'Contexts', description: 'Manage code contexts and domains', keywords: ['context', 'domain', 'code', 'files'], icon: 'FolderTree' },
  ideas: { label: 'Ideas', description: 'Generate and browse AI ideas', keywords: ['ideas', 'suggestions', 'ai', 'generate'], icon: 'Lightbulb' },
  tinder: { label: 'Tinder', description: 'Evaluate and swipe on ideas', keywords: ['evaluate', 'swipe', 'approve', 'reject'], icon: 'Heart' },
  tasker: { label: 'Tasker', description: 'Run and manage tasks', keywords: ['tasks', 'run', 'execute', 'batch'], icon: 'Play' },
  manager: { label: 'Manager', description: 'Analytics and project management', keywords: ['analytics', 'stats', 'metrics', 'management'], icon: 'BarChart3' },
  reflector: { label: 'Reflector', description: 'Reflect on past implementations', keywords: ['reflect', 'review', 'history', 'analysis'], icon: 'Activity' },
  docs: { label: 'Docs', description: 'Documentation and guides', keywords: ['docs', 'documentation', 'help', 'guide'], icon: 'BookOpen' },
  refactor: { label: 'Refactor Wizard', description: 'Analyze and plan refactoring', keywords: ['refactor', 'wizard', 'improve', 'clean'], icon: 'Wand2' },
  halloffame: { label: 'Hall of Fame', description: 'Showcase of best implementations', keywords: ['hall', 'fame', 'best', 'showcase'], icon: 'Trophy' },
  social: { label: 'Social', description: 'Community and sharing', keywords: ['social', 'community', 'share', 'team'], icon: 'Users' },
  composer: { label: 'Blueprint Composer', description: 'Compose project blueprints', keywords: ['blueprint', 'compose', 'setup', 'wizard'], icon: 'Layers' },
  zen: { label: 'Zen Mode', description: 'Focused work mode', keywords: ['zen', 'focus', 'calm', 'work'], icon: 'Sunrise' },
  blueprint: { label: 'Blueprint', description: 'Project blueprint and setup', keywords: ['blueprint', 'setup', 'project'], icon: 'Map' },
  questions: { label: 'Questions', description: 'Generate clarifying questions for precise idea generation', keywords: ['questions', 'clarify', 'context', 'requirements'], icon: 'HelpCircle' },
};

interface WorkflowState {
  // Navigation history (breadcrumbs)
  history: WorkflowStep[];
  maxHistoryLength: number;

  // Command palette state
  isCommandPaletteOpen: boolean;
  commandPaletteQuery: string;

  // Recent entities for quick access
  recentEntities: Array<{
    id: string;
    type: 'context' | 'goal' | 'idea' | 'task' | 'requirement' | 'scan';
    name: string;
    module: AppModule;
    projectId?: string;
    timestamp: number;
  }>;

  // Active workflow template (if following a predefined workflow)
  activeWorkflow: WorkflowTemplate | null;
  workflowProgress: number; // 0-based index of current step in workflow

  // Suggested next actions based on context
  suggestions: WorkflowSuggestion[];

  // Actions
  pushStep: (step: Omit<WorkflowStep, 'timestamp'>) => void;
  popStep: () => WorkflowStep | undefined;
  clearHistory: () => void;
  getBackStep: () => WorkflowStep | undefined;

  // Command palette
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  setCommandPaletteQuery: (query: string) => void;

  // Recent entities
  addRecentEntity: (entity: Omit<WorkflowState['recentEntities'][0], 'timestamp'>) => void;
  clearRecentEntities: () => void;

  // Workflow templates
  startWorkflow: (template: WorkflowTemplate) => void;
  advanceWorkflow: () => void;
  exitWorkflow: () => void;

  // Suggestions
  setSuggestions: (suggestions: WorkflowSuggestion[]) => void;
  generateSuggestions: (currentModule: AppModule, projectId?: string) => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      history: [],
      maxHistoryLength: 20,
      isCommandPaletteOpen: false,
      commandPaletteQuery: '',
      recentEntities: [],
      activeWorkflow: null,
      workflowProgress: 0,
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

      openCommandPalette: () => set({ isCommandPaletteOpen: true, commandPaletteQuery: '' }),
      closeCommandPalette: () => set({ isCommandPaletteOpen: false, commandPaletteQuery: '' }),
      toggleCommandPalette: () => set((state) => ({
        isCommandPaletteOpen: !state.isCommandPaletteOpen,
        commandPaletteQuery: state.isCommandPaletteOpen ? '' : state.commandPaletteQuery,
      })),
      setCommandPaletteQuery: (query) => set({ commandPaletteQuery: query }),

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

      startWorkflow: (template) => set({
        activeWorkflow: template,
        workflowProgress: 0,
      }),

      advanceWorkflow: () => {
        const { activeWorkflow, workflowProgress } = get();
        if (!activeWorkflow) return;

        const nextProgress = workflowProgress + 1;
        if (nextProgress >= activeWorkflow.steps.length) {
          // Workflow complete
          set({ activeWorkflow: null, workflowProgress: 0 });
        } else {
          set({ workflowProgress: nextProgress });
        }
      },

      exitWorkflow: () => set({ activeWorkflow: null, workflowProgress: 0 }),

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

// Helper to get all quick actions for command palette
export function getQuickActions(
  currentModule: AppModule,
  recentEntities: WorkflowState['recentEntities'],
  onNavigate: (module: AppModule) => void
): QuickAction[] {
  const actions: QuickAction[] = [];

  // Navigation actions for each module
  Object.entries(MODULE_METADATA).forEach(([module, meta]) => {
    actions.push({
      id: `nav-${module}`,
      label: meta.label,
      description: meta.description,
      keywords: meta.keywords,
      category: 'navigation',
      module: module as AppModule,
      icon: meta.icon,
      shortcut: module === 'coder' ? 'Ctrl+1' : undefined,
      action: () => onNavigate(module as AppModule),
    });
  });

  // Recent entity actions
  recentEntities.forEach((entity) => {
    actions.push({
      id: `recent-${entity.type}-${entity.id}`,
      label: entity.name,
      description: `Recent ${entity.type}`,
      keywords: [entity.name.toLowerCase(), entity.type],
      category: 'recent',
      module: entity.module,
      entityType: entity.type,
      entityId: entity.id,
      entityName: entity.name,
    });
  });

  // Common actions
  actions.push(
    {
      id: 'action-generate-ideas',
      label: 'Generate Ideas',
      description: 'Run AI idea generation for current project',
      keywords: ['generate', 'ideas', 'ai', 'suggestions'],
      category: 'action',
      module: 'ideas',
      icon: 'Sparkles',
    },
    {
      id: 'action-run-blueprint',
      label: 'Run Blueprint Scan',
      description: 'Analyze project structure',
      keywords: ['blueprint', 'scan', 'analyze', 'structure'],
      category: 'action',
      module: 'composer',
      icon: 'Scan',
    },
    {
      id: 'action-run-tasks',
      label: 'Run All Tasks',
      description: 'Execute pending tasks in batch',
      keywords: ['run', 'tasks', 'execute', 'batch'],
      category: 'action',
      module: 'tasker',
      icon: 'Play',
    },
    {
      id: 'action-refactor',
      label: 'Start Refactoring',
      description: 'Analyze code for refactoring opportunities',
      keywords: ['refactor', 'improve', 'clean', 'analyze'],
      category: 'action',
      module: 'refactor',
      icon: 'Wand2',
    }
  );

  return actions;
}

// Filter quick actions based on query
export function filterQuickActions(actions: QuickAction[], query: string): QuickAction[] {
  if (!query.trim()) {
    // Return top actions when no query
    return actions.slice(0, 8);
  }

  const lowerQuery = query.toLowerCase();
  const terms = lowerQuery.split(/\s+/);

  return actions
    .map((action) => {
      // Calculate match score
      let score = 0;

      // Check label match
      if (action.label.toLowerCase().includes(lowerQuery)) {
        score += 10;
      }

      // Check description match
      if (action.description.toLowerCase().includes(lowerQuery)) {
        score += 5;
      }

      // Check keyword matches
      terms.forEach((term) => {
        if (action.keywords.some((kw) => kw.includes(term))) {
          score += 3;
        }
      });

      // Boost recent items
      if (action.category === 'recent') {
        score += 2;
      }

      return { action, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ action }) => action)
    .slice(0, 10);
}
