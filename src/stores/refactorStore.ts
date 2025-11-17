import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

  // Opportunities
  opportunities: RefactorOpportunity[];
  selectedOpportunities: Set<string>;
  filterCategory: RefactorOpportunity['category'] | 'all';
  filterSeverity: RefactorOpportunity['severity'] | 'all';

  // Wizard configuration
  wizardPlan: WizardPlan | null;
  selectedScanGroups: Set<string>;
  techniqueOverrides: Map<string, boolean>; // techniqueId -> enabled
  llmProvider: string;
  llmModel: string;

  // UI state
  isWizardOpen: boolean;
  currentStep: 'settings' | 'scan' | 'config' | 'review' | 'package' | 'execute' | 'results';

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
  startAnalysis: (projectId: string, projectPath: string, useAI?: boolean, provider?: string, model?: string, projectType?: string) => Promise<void>;
  setAnalysisStatus: (status: AnalysisStatus, progress?: number) => void;
  setAnalysisError: (error: string | null) => void;
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
}

export const useRefactorStore = create<RefactorState>()(
  persist(
    (set, get) => ({
      // Initial state
      analysisStatus: 'idle',
      analysisProgress: 0,
      analysisError: null,
      opportunities: [],
      selectedOpportunities: new Set(),
      filterCategory: 'all',
      filterSeverity: 'all',
      wizardPlan: null,
      selectedScanGroups: new Set(),
      techniqueOverrides: new Map(),
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
      startAnalysis: async (projectId: string, projectPath: string, useAI: boolean = true, provider?: string, model?: string, projectType?: string) => {
        set({
          analysisStatus: 'generating-plan',
          analysisProgress: 10,
          analysisError: null,
          opportunities: [],
          selectedOpportunities: new Set()
        });

        try {
          // Get selected groups to pass to the API
          const { selectedScanGroups } = get();
          const selectedGroupsArray = Array.from(selectedScanGroups);

          const response = await fetch('/api/refactor/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              projectPath,
              useAI,
              provider,
              model,
              selectedGroups: selectedGroupsArray,
              projectType
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Analysis failed');
          }

          const data = await response.json();

          // Set wizard plan if available
          if (data.wizardPlan) {
            set({
              wizardPlan: data.wizardPlan,
              selectedScanGroups: new Set(data.wizardPlan.recommendedGroups.map((g: any) => g.id)),
            });
          }

          // NEW: Store packages if generated
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

            // Auto-select foundational packages (optional)
            get().selectFoundationalPackages();
          }

          set({
            opportunities: data.opportunities || [],
            analysisStatus: 'completed',
            analysisProgress: 100,
            currentStep: data.wizardPlan ? 'config' : 'review',
          });
        } catch (error) {
          set({
            analysisStatus: 'error',
            analysisError: error instanceof Error ? error.message : 'Unknown error',
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
        set({
          analysisStatus: 'idle',
          analysisProgress: 0,
          analysisError: null,
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
