import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useActiveProjectStore } from './activeProjectStore';
import type { WizardPlan } from '@/app/features/RefactorWizard/lib/wizardOptimizer';
import type { ScanTechniqueGroup } from '@/app/features/RefactorWizard/lib/scanTechniques';
import type { RefactoringPackage, DependencyGraph, ProjectContext, PackageFilter } from '@/app/features/RefactorWizard/lib/types';

export type RefactorOpportunity = {
  id: string;
  title: string;
  description: string;
  category: 'performance' | 'maintainability' | 'security' | 'code-quality' | 'duplication' | 'architecture';
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  effort: 'low' | 'medium' | 'high';
  files: string[];
  lineNumbers?: Record<string, number[]>;
  suggestedFix?: string;
  autoFixAvailable: boolean;
  estimatedTime?: string;
};

export type AnalysisStatus = 'idle' | 'scanning' | 'analyzing' | 'generating-plan' | 'completed' | 'error';

interface RefactorState {
  // Analysis state
  analysisStatus: AnalysisStatus;
  analysisProgress: number;
  analysisError: string | null;
  analysisProgressMessage: string | null;
  currentQueueId: string | null;
  pollingInterval: NodeJS.Timeout | null;

  // Opportunities
  opportunities: RefactorOpportunity[];
  selectedOpportunities: Set<string>;
  filterCategory: RefactorOpportunity['category'] | 'all';
  filterSeverity: RefactorOpportunity['severity'] | 'all';

  // Wizard configuration
  wizardPlan: WizardPlan | null;
  selectedScanGroups: Set<string>;
  techniqueOverrides: Map<string, boolean>; // techniqueId -> enabled
  selectedFolders: string[]; // Folders to scan (empty = scan all)
  llmProvider: string;
  llmModel: string;

  // UI state
  isWizardOpen: boolean;
  currentStep: 'settings' | 'scan' | 'plan' | 'review' | 'package' | 'execute' | 'results';

  // ============================================================================
  // PACKAGE-BASED REFACTORING STATE (Phase 1)
  // ============================================================================

  packages: RefactoringPackage[];
  selectedPackages: Set<string>;
  packageDependencies: DependencyGraph | null;
  packageFilter: PackageFilter;
  packageGenerationStatus: 'idle' | 'generating' | 'completed' | 'error';
  packageGenerationError: string | null;
  projectContext: ProjectContext | null;

  // Actions
  startAnalysis: (projectId: string, projectPath: string, useAI?: boolean, provider?: string, model?: string, projectType?: string, selectedFolders?: string[]) => Promise<void>;
  setAnalysisStatus: (status: AnalysisStatus, progress?: number) => void;
  setAnalysisError: (error: string | null) => void;
  stopPolling: () => void;
  setOpportunities: (opportunities: RefactorOpportunity[]) => void;
  toggleOpportunity: (id: string) => void;
  selectAllOpportunities: () => void;
  clearSelection: () => void;
  setFilterCategory: (category: RefactorOpportunity['category'] | 'all') => void;
  setFilterSeverity: (severity: RefactorOpportunity['severity'] | 'all') => void;

  // Wizard configuration actions
  setWizardPlan: (plan: WizardPlan | null) => void;
  toggleScanGroup: (groupId: string) => void;
  toggleTechnique: (groupId: string, techniqueId: string) => void;
  selectAllGroups: () => void;
  clearGroupSelection: () => void;
  setSelectedFolders: (folders: string[]) => void;
  setLLMProvider: (provider: string) => void;
  setLLMModel: (model: string) => void;

  openWizard: () => void;
  closeWizard: () => void;
  setCurrentStep: (step: RefactorState['currentStep']) => void;
  resetWizard: () => void;

  // ============================================================================
  // PACKAGE ACTIONS (Phase 1)
  // ============================================================================

  setPackages: (packages: RefactoringPackage[]) => void;
  togglePackageSelection: (packageId: string) => void;
  selectPackagesWithDependencies: (packageId: string) => void;
  setPackageFilter: (filter: Partial<PackageFilter>) => void;
  clearPackages: () => void;
  setPackageDependencies: (graph: DependencyGraph) => void;
  setProjectContext: (context: ProjectContext) => void;
  setPackageGenerationStatus: (status: RefactorState['packageGenerationStatus'], error?: string) => void;

  // Bulk selection helpers
  selectAllPackages: () => void;
  clearPackageSelection: () => void;
  selectPackagesByCategory: (category: string) => void;
  selectFoundationalPackages: () => void;
  generatePackages: () => Promise<void>;
}

export const useRefactorStore = create<RefactorState>()(
  persist(
    (set, get) => ({
      // Initial state
      analysisStatus: 'idle',
      analysisProgress: 0,
      analysisError: null,
      analysisProgressMessage: null,
      currentQueueId: null,
      pollingInterval: null,
      opportunities: [],
      selectedOpportunities: new Set(),
      filterCategory: 'all',
      filterSeverity: 'all',
      wizardPlan: null,
      selectedScanGroups: new Set(),
      techniqueOverrides: new Map(),
      selectedFolders: [],
      llmProvider: 'gemini',
      llmModel: '',
      isWizardOpen: false,
      currentStep: 'settings',

      // NEW: Package state (Phase 1)
      packages: [],
      selectedPackages: new Set(),
      packageDependencies: null,
      packageFilter: { category: 'all', impact: 'all', effort: 'all', status: 'all' },
      packageGenerationStatus: 'idle',
      packageGenerationError: null,
      projectContext: null,

      // Actions
      startAnalysis: async (projectId: string, projectPath: string, useAI: boolean = true, provider?: string, model?: string, projectType?: string, selectedFolders?: string[]) => {
        // Stop any existing polling
        get().stopPolling();

        // Get selectedFolders from store if not provided
        const foldersToScan = selectedFolders !== undefined ? selectedFolders : get().selectedFolders;

        set({
          analysisStatus: 'scanning',
          analysisProgress: 0,
          analysisError: null,
          analysisProgressMessage: foldersToScan.length > 0
            ? `Initializing analysis for ${foldersToScan.length} folder(s)...`
            : 'Initializing analysis for entire project...',
          opportunities: [],
          selectedOpportunities: new Set()
        });

        try {
          // Step 1: Create scan queue item
          const queueId = `queue-refactor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          const queueResponse = await fetch('/api/scan-queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              scanType: 'refactor_analysis',
              triggerType: 'manual',
              priority: 10,
            }),
          });

          if (!queueResponse.ok) {
            throw new Error('Failed to create scan queue item');
          }

          const { queueItem } = await queueResponse.json();
          const actualQueueId = queueItem.id;

          set({ currentQueueId: actualQueueId });

          // Step 2: Start background analysis
          const { selectedScanGroups } = get();
          const selectedGroupsArray = Array.from(selectedScanGroups);

          // Fire and forget - don't wait for completion
          fetch('/api/refactor/analyze-background', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              queueId: actualQueueId,
              projectId,
              projectPath,
              useAI,
              provider,
              model,
              selectedGroups: selectedGroupsArray,
              projectType,
              selectedFolders: foldersToScan // Pass selected folders for scoping
            }),
          }).catch(error => {
            console.error('[RefactorStore] Background analysis request failed:', error);
          });

          // Step 3: Start polling for progress
          const pollInterval = setInterval(async () => {
            try {
              const statusResponse = await fetch(`/api/scan-queue/${actualQueueId}`);
              if (!statusResponse.ok) {
                throw new Error('Failed to fetch queue status');
              }

              const { queueItem: updatedItem } = await statusResponse.json();

              // Update progress
              set({
                analysisProgress: updatedItem.progress || 0,
                analysisProgressMessage: updatedItem.progress_message || null,
              });

              // Check if completed or failed
              if (updatedItem.status === 'completed') {
                // Stop polling
                clearInterval(pollInterval);
                set({ pollingInterval: null });

                // Fetch the full results
                const resultsResponse = await fetch(`/api/refactor/results/${actualQueueId}`);

                if (resultsResponse.ok) {
                  const data = await resultsResponse.json();

                  // Set wizard plan if available
                  if (data.wizardPlan) {
                    set({
                      wizardPlan: data.wizardPlan,
                      selectedScanGroups: new Set(data.wizardPlan.recommendedGroups.map((g: any) => g.id)),
                    });
                  }

                  // Store packages if generated
                  if (data.packages && data.packages.length > 0) {
                    console.log('[RefactorStore] Storing', data.packages.length, 'packages');
                    set({
                      packages: data.packages,
                      projectContext: data.context,
                      packageGenerationStatus: 'completed',
                      packageGenerationError: null
                    });

                    if (data.dependencyGraph) {
                      set({ packageDependencies: data.dependencyGraph });
                    }

                    // Auto-select foundational packages
                    get().selectFoundationalPackages();
                  }

                  set({
                    opportunities: data.opportunities || [],
                    analysisStatus: 'completed',
                    analysisProgress: 100,
                    analysisProgressMessage: 'Analysis completed',
                    currentStep: data.wizardPlan ? 'plan' : 'review',
                  });
                }
              } else if (updatedItem.status === 'failed') {
                // Stop polling
                clearInterval(pollInterval);
                set({ pollingInterval: null });

                set({
                  analysisStatus: 'error',
                  analysisError: updatedItem.error_message || 'Analysis failed',
                  analysisProgressMessage: null,
                });
              }
            } catch (error) {
              console.error('[RefactorStore] Polling error:', error);
              // Continue polling - don't stop on transient errors
            }
          }, 2000); // Poll every 2 seconds

          set({ pollingInterval: pollInterval });

        } catch (error) {
          set({
            analysisStatus: 'error',
            analysisError: error instanceof Error ? error.message : 'Unknown error',
            analysisProgressMessage: null,
          });
        }
      },

      setAnalysisStatus: (status: AnalysisStatus, progress?: number) => {
        set({
          analysisStatus: status,
          ...(progress !== undefined && { analysisProgress: progress })
        });
      },

      setAnalysisError: (error: string | null) => {
        set({ analysisError: error });
      },

      stopPolling: () => {
        const { pollingInterval } = get();
        if (pollingInterval) {
          clearInterval(pollingInterval);
          set({ pollingInterval: null });
        }
      },

      setOpportunities: (opportunities: RefactorOpportunity[]) => {
        set({ opportunities });
      },

      toggleOpportunity: (id: string) => {
        const selected = new Set(get().selectedOpportunities);
        if (selected.has(id)) {
          selected.delete(id);
        } else {
          selected.add(id);
        }
        set({ selectedOpportunities: selected });
      },

      selectAllOpportunities: () => {
        const { opportunities } = get();
        const allIds = new Set(opportunities.map(o => o.id));
        set({ selectedOpportunities: allIds });
      },

      clearSelection: () => {
        set({ selectedOpportunities: new Set() });
      },

      setFilterCategory: (category) => {
        set({ filterCategory: category });
      },

      setFilterSeverity: (severity) => {
        set({ filterSeverity: severity });
      },

      // Wizard configuration actions
      setWizardPlan: (plan: WizardPlan | null) => {
        set({ wizardPlan: plan });
      },

      toggleScanGroup: (groupId: string) => {
        const selected = new Set(get().selectedScanGroups);
        if (selected.has(groupId)) {
          selected.delete(groupId);
        } else {
          selected.add(groupId);
        }
        set({ selectedScanGroups: selected });
      },

      toggleTechnique: (groupId: string, techniqueId: string) => {
        const overrides = new Map(get().techniqueOverrides);
        const key = `${groupId}:${techniqueId}`;
        const currentValue = overrides.get(key) ?? true;
        overrides.set(key, !currentValue);
        set({ techniqueOverrides: overrides });
      },

      selectAllGroups: () => {
        const { wizardPlan } = get();
        if (wizardPlan) {
          const allIds = new Set<string>(wizardPlan.recommendedGroups.map(g => g.id));
          set({ selectedScanGroups: allIds });
        } else {
          // If no wizard plan, select all available groups
          import('@/app/features/RefactorWizard/lib/scanTechniques').then(({ SCAN_TECHNIQUE_GROUPS }) => {
            const allGroupIds = new Set(SCAN_TECHNIQUE_GROUPS.map(g => g.id));
            set({ selectedScanGroups: allGroupIds });
          });
        }
      },

      clearGroupSelection: () => {
        set({ selectedScanGroups: new Set() });
      },

      setSelectedFolders: (folders: string[]) => {
        set({ selectedFolders: folders });
      },

      setLLMProvider: (provider: string) => {
        set({ llmProvider: provider });
      },

      setLLMModel: (model: string) => {
        set({ llmModel: model });
      },

      openWizard: () => {
        // Initialize with all groups selected by default
        const { selectedScanGroups } = get();
        if (selectedScanGroups.size === 0) {
          // Import and get all groups - we'll set them all as selected
          import('@/app/features/RefactorWizard/lib/scanTechniques').then(({ SCAN_TECHNIQUE_GROUPS }) => {
            const allGroupIds = new Set(SCAN_TECHNIQUE_GROUPS.map(g => g.id));
            set({ selectedScanGroups: allGroupIds });
          });
        }
        set({ isWizardOpen: true });
      },

      closeWizard: () => {
        set({ isWizardOpen: false });
      },

      setCurrentStep: (step) => {
        set({ currentStep: step });
      },

      resetWizard: () => {
        // Stop polling first
        get().stopPolling();

        set({
          analysisStatus: 'idle',
          analysisProgress: 0,
          analysisError: null,
          analysisProgressMessage: null,
          currentQueueId: null,
          selectedOpportunities: new Set(),
          wizardPlan: null,
          selectedScanGroups: new Set(),
          techniqueOverrides: new Map(),
          currentStep: 'settings',
        });
      },

      // ============================================================================
      // PACKAGE ACTIONS IMPLEMENTATION (Phase 1)
      // ============================================================================

      setPackages: (packages) => set({
        packages,
        packageGenerationStatus: 'completed',
        packageGenerationError: null
      }),

      togglePackageSelection: (packageId) => {
        const selected = new Set(get().selectedPackages);
        if (selected.has(packageId)) {
          selected.delete(packageId);
        } else {
          selected.add(packageId);
        }
        set({ selectedPackages: selected });
      },

      selectPackagesWithDependencies: (packageId) => {
        const { packages } = get();
        const selected = new Set(get().selectedPackages);
        const pkg = packages.find(p => p.id === packageId);

        if (!pkg) return;

        // Select this package
        selected.add(packageId);

        // Select all dependencies recursively
        const selectDeps = (pkgId: string) => {
          const p = packages.find(p => p.id === pkgId);
          if (!p) return;

          for (const depId of p.dependsOn) {
            if (!selected.has(depId)) {
              selected.add(depId);
              selectDeps(depId); // Recursive
            }
          }
        };

        selectDeps(packageId);
        set({ selectedPackages: selected });
      },

      setPackageFilter: (filter) => set((state) => ({
        packageFilter: { ...state.packageFilter, ...filter }
      })),

      clearPackages: () => set({
        packages: [],
        selectedPackages: new Set(),
        packageDependencies: null,
        packageGenerationStatus: 'idle',
        packageGenerationError: null,
      }),

      setPackageDependencies: (graph) => set({ packageDependencies: graph }),

      setProjectContext: (context) => set({ projectContext: context }),

      setPackageGenerationStatus: (status, error) => set({
        packageGenerationStatus: status,
        packageGenerationError: error || null,
      }),

      // Bulk selection helpers
      selectAllPackages: () => {
        const selected = new Set(get().packages.map(p => p.id));
        set({ selectedPackages: selected });
      },

      clearPackageSelection: () => {
        set({ selectedPackages: new Set() });
      },

      selectPackagesByCategory: (category) => {
        const selected = new Set(
          get().packages
            .filter(p => p.category === category)
            .map(p => p.id)
        );
        set({ selectedPackages: selected });
      },

      selectFoundationalPackages: () => {
        const selected = new Set(
          get().packages
            .filter(p => p.executionOrder === 1 || p.dependsOn.length === 0)
            .map(p => p.id)
        );
        set({ selectedPackages: selected });
      },
      // NEW: Generate packages on demand
      generatePackages: async () => {
        const { opportunities, selectedOpportunities, llmProvider, llmModel, selectedFolders } = get();
        const activeProject = useActiveProjectStore.getState().activeProject;

        if (!activeProject?.path) {
          set({ packageGenerationError: 'No active project selected' });
          return;
        }

        // Use only the selected opportunities for package generation
        const oppsToPackage = selectedOpportunities.size > 0
          ? opportunities.filter(o => selectedOpportunities.has(o.id))
          : opportunities;

        if (oppsToPackage.length === 0) {
          set({ packageGenerationError: 'No opportunities selected for packaging' });
          return;
        }

        set({
          packageGenerationStatus: 'generating',
          packageGenerationError: null
        });

        try {
          const response = await fetch('/api/refactor/generate-packages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              opportunities: oppsToPackage,
              projectPath: activeProject.path,
              selectedFolders: selectedFolders, // Pass folder context
              userPreferences: {
                provider: llmProvider,
                model: llmModel,
              },
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate packages');
          }

          const data = await response.json();

          set({
            packages: data.packages || [],
            projectContext: data.context || null,
            packageDependencies: data.dependencyGraph || null,
            packageGenerationStatus: 'completed',
            packageGenerationError: null
          });

          // Auto-select foundational packages
          get().selectFoundationalPackages();

        } catch (error) {
          console.error('[RefactorStore] Package generation failed:', error);
          set({
            packageGenerationStatus: 'error',
            packageGenerationError: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      },
    }),
    {
      name: 'refactor-wizard-storage',
      partialize: (state) => ({
        opportunities: state.opportunities,
        wizardPlan: state.wizardPlan,
        selectedScanGroups: Array.from(state.selectedScanGroups),
        // NEW: Persist packages (Phase 1)
        packages: state.packages,
        selectedPackages: Array.from(state.selectedPackages), // Convert Set to Array
        packageFilter: state.packageFilter,
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...(persistedState as object),
        selectedScanGroups: new Set(persistedState?.selectedScanGroups || []),
        // NEW: Handle Set deserialization for packages (Phase 1)
        selectedPackages: new Set(persistedState?.selectedPackages || []),
      }),
    }
  )
);
