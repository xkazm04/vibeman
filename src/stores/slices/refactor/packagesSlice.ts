/**
 * Packages Slice - Manages refactoring packages and dependencies
 */

import type { StateCreator } from 'zustand';
import type { PackagesSlice, RefactorState, PackageGenerationStatus } from './types';
import type { RefactoringPackage, DependencyGraph, ProjectContext, PackageFilter } from '@/app/features/RefactorWizard/lib/types';
import { useActiveProjectStore } from '@/stores/activeProjectStore';

export const createPackagesSlice: StateCreator<
  RefactorState,
  [],
  [],
  PackagesSlice
> = (set, get) => ({
  // Initial state
  packages: [],
  selectedPackages: new Set(),
  packageDependencies: null,
  packageFilter: { category: 'all', impact: 'all', effort: 'all', status: 'all' },
  packageGenerationStatus: 'idle',
  packageGenerationError: null,
  projectContext: null,

  // Actions
  setPackages: (packages: RefactoringPackage[]) => set({
    packages,
    packageGenerationStatus: 'completed',
    packageGenerationError: null
  }),

  togglePackageSelection: (packageId: string) => {
    const selected = new Set(get().selectedPackages);
    if (selected.has(packageId)) {
      selected.delete(packageId);
    } else {
      selected.add(packageId);
    }
    set({ selectedPackages: selected });
  },

  selectPackagesWithDependencies: (packageId: string) => {
    const { packages } = get();
    const selected = new Set(get().selectedPackages);
    const pkg = packages.find(p => p.id === packageId);

    if (!pkg) return;

    // Select this package
    selected.add(packageId);
    set({ selectedPackages: selected });
  },

  setPackageFilter: (filter: Partial<PackageFilter>) => set((state) => ({
    packageFilter: { ...state.packageFilter, ...filter }
  })),

  clearPackages: () => set({
    packages: [],
    selectedPackages: new Set(),
    packageDependencies: null,
    packageGenerationStatus: 'idle',
    packageGenerationError: null,
  }),

  setPackageDependencies: (graph: DependencyGraph) => set({ packageDependencies: graph }),

  setProjectContext: (context: ProjectContext) => set({ projectContext: context }),

  setPackageGenerationStatus: (status: PackageGenerationStatus, error?: string) => set({
    packageGenerationStatus: status,
    packageGenerationError: error || null,
  }),

  selectAllPackages: () => {
    const selected = new Set(get().packages.map(p => p.id));
    set({ selectedPackages: selected });
  },

  clearPackageSelection: () => {
    set({ selectedPackages: new Set() });
  },

  selectPackagesByCategory: (category: string) => {
    const selected = new Set(
      get().packages
        .filter(p => p.name.toLowerCase().includes(category.toLowerCase()))
        .map(p => p.id)
    );
    set({ selectedPackages: selected });
  },

  selectFoundationalPackages: () => {
    const selected = new Set(
      get().packages
        .filter(p => p.priority === 1 || p.priority === undefined)
        .map(p => p.id)
    );
    set({ selectedPackages: selected });
  },

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
          selectedFolders: selectedFolders,
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
});
