/**
 * Blueprint Composer Store
 * Manages state for the visual blueprint composition interface
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  BlueprintComposition,
  ComponentMeta,
  DecisionNodeConfig,
  PromptMeta,
  ScanEvidence,
  ScanChain,
  ComposerTab,
  COLOR_PALETTE,
  ChainTrigger,
  ConditionalBranch,
  PostChainEvent,
  createManualTrigger,
} from '../types';

interface BlueprintComposerState {
  // UI State
  isOpen: boolean;
  activeTab: ComposerTab;

  // Current composition
  composition: BlueprintComposition;

  // Saved blueprints
  savedBlueprints: BlueprintComposition[];

  // Scan chains
  chains: ScanChain[];

  // Scan evidence (test runs)
  evidence: ScanEvidence[];

  // Actions - UI
  openComposer: () => void;
  closeComposer: () => void;
  setActiveTab: (tab: ComposerTab) => void;

  // Actions - Composition
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setColor: (color: string) => void;

  // Actions - Components
  selectAnalyzer: (analyzer: ComponentMeta | null) => void;
  addProcessor: (processor: ComponentMeta) => void;
  removeProcessor: (processorId: string) => void;
  reorderProcessors: (fromIndex: number, toIndex: number) => void;
  selectExecutor: (executor: ComponentMeta | null) => void;

  // Actions - Configuration
  setAnalyzerConfig: (config: Record<string, unknown>) => void;
  setProcessorConfig: (processorId: string, config: Record<string, unknown>) => void;
  setExecutorConfig: (config: Record<string, unknown>) => void;

  // Actions - Business Analyzer
  selectPrompt: (prompt: PromptMeta | null) => void;

  // Actions - Decision Nodes
  addDecisionNode: (config: DecisionNodeConfig) => void;
  removeDecisionNode: (index: number) => void;
  updateDecisionNode: (index: number, config: Partial<DecisionNodeConfig>) => void;

  // Actions - Blueprints
  saveBlueprint: () => BlueprintComposition;
  loadBlueprint: (id: string) => void;
  deleteBlueprint: (id: string) => void;
  resetComposition: () => void;

  // Actions - Chains
  createChain: (name: string, description: string) => ScanChain;
  addBlueprintToChain: (chainId: string, blueprintId: string) => void;
  removeBlueprintFromChain: (chainId: string, blueprintId: string) => void;
  reorderChain: (chainId: string, fromIndex: number, toIndex: number) => void;
  deleteChain: (chainId: string) => void;

  // Actions - Chain Triggers
  updateChainTrigger: (chainId: string, trigger: ChainTrigger) => void;
  toggleChainActive: (chainId: string) => void;

  // Actions - Conditional Branches
  addConditionalBranch: (chainId: string, branch: ConditionalBranch) => void;
  removeConditionalBranch: (chainId: string, branchId: string) => void;
  updateConditionalBranch: (chainId: string, branchId: string, updates: Partial<ConditionalBranch>) => void;

  // Actions - Post-Chain Events
  updatePostChainEvent: (chainId: string, event: PostChainEvent | null) => void;

  // Actions - Evidence
  addEvidence: (evidence: Omit<ScanEvidence, 'id' | 'timestamp'>) => string;
  updateEvidence: (id: string, updates: Partial<ScanEvidence>) => void;
  clearEvidence: () => void;
}

const initialComposition: BlueprintComposition = {
  name: '',
  description: '',
  color: COLOR_PALETTE[0].value,
  analyzer: null,
  processors: [],
  executor: null,
  decisionNodes: [],
};

export const useBlueprintComposerStore = create<BlueprintComposerState>()(
  persist(
    (set, get) => ({
      // Initial state
      isOpen: false,
      activeTab: 'compose',
      composition: { ...initialComposition },
      savedBlueprints: [],
      chains: [],
      evidence: [],

      // UI Actions
      openComposer: () => set({ isOpen: true }),
      closeComposer: () => set({ isOpen: false }),
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Composition Actions
      setName: (name) => set((state) => ({
        composition: { ...state.composition, name }
      })),

      setDescription: (description) => set((state) => ({
        composition: { ...state.composition, description }
      })),

      setColor: (color) => set((state) => ({
        composition: { ...state.composition, color }
      })),

      // Component Actions
      selectAnalyzer: (analyzer) => set((state) => ({
        composition: {
          ...state.composition,
          analyzer,
          // Reset prompt when changing analyzer
          selectedPrompt: undefined,
        }
      })),

      addProcessor: (processor) => set((state) => ({
        composition: {
          ...state.composition,
          processors: [...state.composition.processors, processor]
        }
      })),

      removeProcessor: (processorId) => set((state) => ({
        composition: {
          ...state.composition,
          processors: state.composition.processors.filter(p => p.id !== processorId)
        }
      })),

      reorderProcessors: (fromIndex, toIndex) => set((state) => {
        const processors = [...state.composition.processors];
        const [removed] = processors.splice(fromIndex, 1);
        processors.splice(toIndex, 0, removed);
        return { composition: { ...state.composition, processors } };
      }),

      selectExecutor: (executor) => set((state) => ({
        composition: { ...state.composition, executor }
      })),

      // Configuration Actions
      setAnalyzerConfig: (config) => set((state) => ({
        composition: { ...state.composition, analyzerConfig: config }
      })),

      setProcessorConfig: (processorId, config) => set((state) => ({
        composition: {
          ...state.composition,
          processorConfigs: {
            ...state.composition.processorConfigs,
            [processorId]: config
          }
        }
      })),

      setExecutorConfig: (config) => set((state) => ({
        composition: { ...state.composition, executorConfig: config }
      })),

      // Business Analyzer Actions
      selectPrompt: (prompt) => set((state) => ({
        composition: { ...state.composition, selectedPrompt: prompt ?? undefined }
      })),

      // Decision Node Actions
      addDecisionNode: (config) => set((state) => ({
        composition: {
          ...state.composition,
          decisionNodes: [...state.composition.decisionNodes, config]
        }
      })),

      removeDecisionNode: (index) => set((state) => ({
        composition: {
          ...state.composition,
          decisionNodes: state.composition.decisionNodes.filter((_, i) => i !== index)
        }
      })),

      updateDecisionNode: (index, config) => set((state) => {
        const decisionNodes = [...state.composition.decisionNodes];
        decisionNodes[index] = { ...decisionNodes[index], ...config };
        return { composition: { ...state.composition, decisionNodes } };
      }),

      // Blueprint Actions
      saveBlueprint: () => {
        const state = get();
        const id = `bp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const blueprint = { ...state.composition, id };

        set({
          savedBlueprints: [...state.savedBlueprints, blueprint],
          composition: { ...initialComposition }
        });

        return blueprint;
      },

      loadBlueprint: (id) => {
        const state = get();
        const blueprint = state.savedBlueprints.find(b => b.id === id);
        if (blueprint) {
          set({ composition: { ...blueprint } });
        }
      },

      deleteBlueprint: (id) => set((state) => ({
        savedBlueprints: state.savedBlueprints.filter(b => b.id !== id)
      })),

      resetComposition: () => set({ composition: { ...initialComposition } }),

      // Chain Actions
      createChain: (name, description) => {
        const chain: ScanChain = {
          id: `chain-${Date.now()}`,
          name,
          description,
          blueprints: [],
          trigger: createManualTrigger(),
          isActive: false,
          runCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({ chains: [...state.chains, chain] }));
        return chain;
      },

      addBlueprintToChain: (chainId, blueprintId) => set((state) => ({
        chains: state.chains.map(chain =>
          chain.id === chainId
            ? { ...chain, blueprints: [...chain.blueprints, blueprintId], updatedAt: new Date() }
            : chain
        )
      })),

      removeBlueprintFromChain: (chainId, blueprintId) => set((state) => ({
        chains: state.chains.map(chain =>
          chain.id === chainId
            ? { ...chain, blueprints: chain.blueprints.filter(id => id !== blueprintId), updatedAt: new Date() }
            : chain
        )
      })),

      reorderChain: (chainId, fromIndex, toIndex) => set((state) => ({
        chains: state.chains.map(chain => {
          if (chain.id !== chainId) return chain;
          const blueprints = [...chain.blueprints];
          const [removed] = blueprints.splice(fromIndex, 1);
          blueprints.splice(toIndex, 0, removed);
          return { ...chain, blueprints, updatedAt: new Date() };
        })
      })),

      deleteChain: (chainId) => set((state) => ({
        chains: state.chains.filter(c => c.id !== chainId)
      })),

      // Chain Trigger Actions
      updateChainTrigger: (chainId, trigger) => set((state) => ({
        chains: state.chains.map(chain =>
          chain.id === chainId
            ? { ...chain, trigger, updatedAt: new Date() }
            : chain
        )
      })),

      toggleChainActive: (chainId) => set((state) => ({
        chains: state.chains.map(chain =>
          chain.id === chainId
            ? { ...chain, isActive: !chain.isActive, updatedAt: new Date() }
            : chain
        )
      })),

      // Conditional Branch Actions
      addConditionalBranch: (chainId, branch) => set((state) => ({
        chains: state.chains.map(chain =>
          chain.id === chainId
            ? {
                ...chain,
                conditionalBranches: [...(chain.conditionalBranches || []), branch],
                updatedAt: new Date()
              }
            : chain
        )
      })),

      removeConditionalBranch: (chainId, branchId) => set((state) => ({
        chains: state.chains.map(chain =>
          chain.id === chainId
            ? {
                ...chain,
                conditionalBranches: (chain.conditionalBranches || []).filter(b => b.id !== branchId),
                updatedAt: new Date()
              }
            : chain
        )
      })),

      updateConditionalBranch: (chainId, branchId, updates) => set((state) => ({
        chains: state.chains.map(chain =>
          chain.id === chainId
            ? {
                ...chain,
                conditionalBranches: (chain.conditionalBranches || []).map(branch =>
                  branch.id === branchId ? { ...branch, ...updates } : branch
                ),
                updatedAt: new Date()
              }
            : chain
        )
      })),

      // Post-Chain Event Actions
      updatePostChainEvent: (chainId, event) => set((state) => ({
        chains: state.chains.map(chain =>
          chain.id === chainId
            ? { ...chain, postChainEvent: event ?? undefined, updatedAt: new Date() }
            : chain
        )
      })),

      // Evidence Actions
      addEvidence: (evidence) => {
        const id = `ev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
          evidence: [
            ...state.evidence,
            { ...evidence, id, timestamp: new Date() }
          ]
        }));
        return id;
      },

      updateEvidence: (id, updates) => set((state) => ({
        evidence: state.evidence.map(e => e.id === id ? { ...e, ...updates } : e)
      })),

      clearEvidence: () => set({ evidence: [] }),
    }),
    {
      name: 'blueprint-composer-storage',
      partialize: (state) => ({
        savedBlueprints: state.savedBlueprints,
        chains: state.chains,
      }),
    }
  )
);
