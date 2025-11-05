import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  StateMachineConfig,
  StateMachineInstance,
  StateMachineEditorAction,
} from '@/app/features/Onboarding/sub_Blueprint/lib/stateMachineTypes';
import {
  createStateMachineInstance,
  transitionToState,
  skipState,
  getNextState,
  getCurrentState,
  validateStateMachine,
  getProgressSummary,
} from '@/app/features/Onboarding/sub_Blueprint/lib/stateMachineInterpreter';
import { getDefaultStateMachine } from '@/app/features/Onboarding/sub_Blueprint/lib/defaultStateMachines';

interface StateMachineState {
  // Configuration management
  configs: Map<string, StateMachineConfig>; // projectType -> config
  currentConfig: StateMachineConfig | null;

  // Runtime instances
  instances: Map<string, StateMachineInstance>; // projectId -> instance

  // Editor state
  isEditorOpen: boolean;
  editorConfig: StateMachineConfig | null;
  editorIsDirty: boolean;
  editorValidationErrors: string[];

  // Actions - Configuration
  loadConfig: (projectType: string) => void;
  saveConfig: (config: StateMachineConfig) => Promise<void>;
  resetConfigToDefault: (projectType: string) => void;
  getConfigForProject: (projectType: string) => StateMachineConfig;

  // Actions - Instance
  startOnboarding: (projectId: string, projectType: string) => StateMachineInstance;
  completeCurrentStep: (projectId: string) => void;
  skipCurrentStep: (projectId: string) => void;
  goToState: (projectId: string, stateId: string) => void;
  getInstance: (projectId: string) => StateMachineInstance | null;

  // Actions - Editor
  openEditor: (projectType: string) => void;
  closeEditor: () => void;
  applyEditorAction: (action: StateMachineEditorAction) => void;
  saveEditorChanges: () => Promise<void>;
  discardEditorChanges: () => void;
}

export const useStateMachineStore = create<StateMachineState>()(
  persist(
    (set, get) => ({
      // Initial state
      configs: new Map(),
      currentConfig: null,
      instances: new Map(),
      isEditorOpen: false,
      editorConfig: null,
      editorIsDirty: false,
      editorValidationErrors: [],

      // Configuration management
      loadConfig: (projectType: string) => {
        const { configs } = get();
        let config = configs.get(projectType);

        if (!config) {
          // Load default config
          config = getDefaultStateMachine(projectType);
          configs.set(projectType, config);
        }

        set({ currentConfig: config, configs: new Map(configs) });
      },

      saveConfig: async (config: StateMachineConfig) => {
        const { configs } = get();

        // Validate config
        const errors = validateStateMachine(config);
        if (errors.length > 0) {
          throw new Error(`Invalid configuration: ${errors.join(', ')}`);
        }

        // Update timestamp
        config.updatedAt = new Date().toISOString();

        // Save to store
        configs.set(config.projectType, config);
        set({ configs: new Map(configs) });

        // Persist to database
        try {
          const response = await fetch('/api/onboarding/state-machine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
          });

          if (!response.ok) {
            throw new Error('Failed to save configuration');
          }
        } catch (error) {
          console.error('Failed to persist state machine config:', error);
          // Continue anyway - we have it in local storage
        }
      },

      resetConfigToDefault: (projectType: string) => {
        const { configs } = get();
        const defaultConfig = getDefaultStateMachine(projectType);
        configs.set(projectType, defaultConfig);
        set({ configs: new Map(configs), currentConfig: defaultConfig });
      },

      getConfigForProject: (projectType: string) => {
        const { configs } = get();
        let config = configs.get(projectType);

        if (!config) {
          config = getDefaultStateMachine(projectType);
          configs.set(projectType, config);
          set({ configs: new Map(configs) });
        }

        return config;
      },

      // Instance management
      startOnboarding: (projectId: string, projectType: string) => {
        const { instances, getConfigForProject } = get();
        const config = getConfigForProject(projectType);

        // Create new instance
        const instance = createStateMachineInstance(config, projectId);
        instance.status = 'in-progress';

        instances.set(projectId, instance);
        set({ instances: new Map(instances) });

        return instance;
      },

      completeCurrentStep: (projectId: string) => {
        const { instances, getConfigForProject } = get();
        const instance = instances.get(projectId);

        if (!instance) {
          throw new Error(`No instance found for project ${projectId}`);
        }

        const currentState = getCurrentState(
          getConfigForProject(instance.configId.replace('default-', '')),
          instance
        );

        if (!currentState) {
          throw new Error('Invalid current state');
        }

        // Get next state
        const config = getConfigForProject(instance.configId.replace('default-', ''));
        const nextState = getNextState(config, instance, 'accept');

        if (nextState) {
          const updatedInstance = transitionToState(config, instance, nextState.id);
          instances.set(projectId, updatedInstance);
          set({ instances: new Map(instances) });
        }
      },

      skipCurrentStep: (projectId: string) => {
        const { instances, getConfigForProject } = get();
        const instance = instances.get(projectId);

        if (!instance) {
          throw new Error(`No instance found for project ${projectId}`);
        }

        const config = getConfigForProject(instance.configId.replace('default-', ''));
        const updatedInstance = skipState(config, instance);

        instances.set(projectId, updatedInstance);
        set({ instances: new Map(instances) });
      },

      goToState: (projectId: string, stateId: string) => {
        const { instances, getConfigForProject } = get();
        const instance = instances.get(projectId);

        if (!instance) {
          throw new Error(`No instance found for project ${projectId}`);
        }

        const config = getConfigForProject(instance.configId.replace('default-', ''));
        const updatedInstance = transitionToState(config, instance, stateId);

        instances.set(projectId, updatedInstance);
        set({ instances: new Map(instances) });
      },

      getInstance: (projectId: string) => {
        return get().instances.get(projectId) || null;
      },

      // Editor actions
      openEditor: (projectType: string) => {
        const config = get().getConfigForProject(projectType);
        const errors = validateStateMachine(config);

        set({
          isEditorOpen: true,
          editorConfig: JSON.parse(JSON.stringify(config)), // Deep clone
          editorIsDirty: false,
          editorValidationErrors: errors,
        });
      },

      closeEditor: () => {
        set({
          isEditorOpen: false,
          editorConfig: null,
          editorIsDirty: false,
          editorValidationErrors: [],
        });
      },

      applyEditorAction: (action: StateMachineEditorAction) => {
        const { editorConfig } = get();
        if (!editorConfig) return;

        let updatedConfig = { ...editorConfig };

        switch (action.type) {
          case 'TOGGLE_STATE': {
            updatedConfig.states = updatedConfig.states.map(s =>
              s.id === action.stateId ? { ...s, enabled: !s.enabled } : s
            );
            break;
          }

          case 'REORDER_STATE': {
            updatedConfig.states = updatedConfig.states.map(s =>
              s.id === action.stateId ? { ...s, order: action.newOrder } : s
            );
            break;
          }

          case 'TOGGLE_GROUP': {
            const groupStates = updatedConfig.states.filter(
              s => s.group === action.group
            );
            const allEnabled = groupStates.every(s => s.enabled);

            updatedConfig.states = updatedConfig.states.map(s =>
              s.group === action.group ? { ...s, enabled: !allEnabled } : s
            );
            break;
          }

          case 'ADD_STATE': {
            updatedConfig.states.push(action.state);
            break;
          }

          case 'REMOVE_STATE': {
            updatedConfig.states = updatedConfig.states.filter(
              s => s.id !== action.stateId
            );
            updatedConfig.transitions = updatedConfig.transitions.filter(
              t => t.fromState !== action.stateId && t.toState !== action.stateId
            );
            break;
          }

          case 'ADD_TRANSITION': {
            updatedConfig.transitions.push(action.transition);
            break;
          }

          case 'REMOVE_TRANSITION': {
            updatedConfig.transitions = updatedConfig.transitions.filter(
              t => t.id !== action.transitionId
            );
            break;
          }

          case 'SET_INITIAL_STATE': {
            updatedConfig.initialState = action.stateId;
            break;
          }

          case 'RESET_TO_DEFAULT': {
            updatedConfig = getDefaultStateMachine(updatedConfig.projectType);
            break;
          }

          case 'LOAD_CONFIG': {
            updatedConfig = action.config;
            break;
          }
        }

        const errors = validateStateMachine(updatedConfig);

        set({
          editorConfig: updatedConfig,
          editorIsDirty: true,
          editorValidationErrors: errors,
        });
      },

      saveEditorChanges: async () => {
        const { editorConfig, saveConfig } = get();
        if (!editorConfig) return;

        await saveConfig(editorConfig);

        set({
          isEditorOpen: false,
          editorConfig: null,
          editorIsDirty: false,
          editorValidationErrors: [],
        });
      },

      discardEditorChanges: () => {
        set({
          isEditorOpen: false,
          editorConfig: null,
          editorIsDirty: false,
          editorValidationErrors: [],
        });
      },
    }),
    {
      name: 'state-machine-storage',
      partialize: (state) => ({
        configs: Array.from(state.configs.entries()),
        instances: Array.from(state.instances.entries()),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert arrays back to Maps
          state.configs = new Map(state.configs as any);
          state.instances = new Map(state.instances as any);
        }
      },
    }
  )
);
