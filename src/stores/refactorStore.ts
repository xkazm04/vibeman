/**
 * Refactor Store
 *
 * Manages state for the RefactorWizard feature using composable slices.
 * Split into focused sub-stores for better maintainability:
 * - analysisSlice: Scanning and analysis progress
 * - opportunitiesSlice: Refactoring opportunities list and selection
 * - wizardSlice: Wizard UI state and configuration
 * - packagesSlice: Package-based refactoring state
 * - dslSlice: DSL mode and spec operations
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useActiveProjectStore } from './activeProjectStore';
import { generateQueueId } from '@/lib/idGenerator';

import {
  createAnalysisSlice,
  createOpportunitiesSlice,
  createWizardSlice,
  createPackagesSlice,
  createDSLSlice,
} from './slices/refactor';

import type { RefactorState } from './slices/refactor/types';

// Re-export types for backward compatibility
export type {
  RefactorOpportunity,
  AnalysisStatus,
  WizardStep,
  PackageGenerationStatus,
  DSLExecutionStatus,
} from './slices/refactor/types';

export const useRefactorStore = create<RefactorState>()(
  persist(
    (set, get, api) => ({
      // Compose all slices
      ...createAnalysisSlice(set, get, api),
      ...createOpportunitiesSlice(set, get, api),
      ...createWizardSlice(set, get, api),
      ...createPackagesSlice(set, get, api),
      ...createDSLSlice(set, get, api),

      // Main analysis action that orchestrates multiple slices
      startAnalysis: async (
        projectId: string,
        projectPath: string,
        useAI: boolean = true,
        provider?: string,
        model?: string,
        projectType?: string,
        selectedFolders?: string[]
      ) => {
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
          const queueId = generateQueueId();

          const queueResponse = await fetch('/api/scan-queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId,
              scanType: 'code_refactor',
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
              selectedFolders: foldersToScan
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
    }),
    {
      name: 'refactor-wizard-storage',
      partialize: (state) => ({
        wizardPlan: state.wizardPlan,
        selectedScanGroups: Array.from(state.selectedScanGroups),
        packages: state.packages,
        selectedPackages: Array.from(state.selectedPackages),
        packageFilter: state.packageFilter,
        filterCategory: state.filterCategory,
        filterSeverity: state.filterSeverity,
        savedSpecs: state.savedSpecs,
        recentSpecs: state.recentSpecs,
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...(persistedState as object),
        selectedScanGroups: new Set(persistedState?.selectedScanGroups || []),
        selectedPackages: new Set(persistedState?.selectedPackages || []),
      }),
    }
  )
);
