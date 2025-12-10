/**
 * Shared types for refactor store slices
 */

import type { WizardPlan } from '@/app/features/RefactorWizard/lib/wizardOptimizer';
import type { RefactoringPackage, DependencyGraph, ProjectContext, PackageFilter } from '@/app/features/RefactorWizard/lib/types';
import type { RefactorSpec, ExecutionResult } from '@/app/features/RefactorWizard/lib/dslTypes';

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

export type WizardStep = 'settings' | 'scan' | 'plan' | 'review' | 'package' | 'execute' | 'results';

export type PackageGenerationStatus = 'idle' | 'generating' | 'completed' | 'error';

export type DSLExecutionStatus = 'idle' | 'previewing' | 'executing' | 'completed' | 'failed';

// ============================================================================
// SLICE STATE INTERFACES
// ============================================================================

export interface AnalysisSlice {
  // State
  analysisStatus: AnalysisStatus;
  analysisProgress: number;
  analysisError: string | null;
  analysisProgressMessage: string | null;
  currentQueueId: string | null;
  pollingInterval: NodeJS.Timeout | null;

  // Actions
  setAnalysisStatus: (status: AnalysisStatus, progress?: number) => void;
  setAnalysisError: (error: string | null) => void;
  setAnalysisProgress: (progress: number, message?: string | null) => void;
  setCurrentQueueId: (queueId: string | null) => void;
  setPollingInterval: (interval: NodeJS.Timeout | null) => void;
  stopPolling: () => void;
}

export interface OpportunitiesSlice {
  // State
  opportunities: RefactorOpportunity[];
  selectedOpportunities: Set<string>;
  filterCategory: RefactorOpportunity['category'] | 'all';
  filterSeverity: RefactorOpportunity['severity'] | 'all';

  // Actions
  setOpportunities: (opportunities: RefactorOpportunity[]) => void;
  toggleOpportunity: (id: string) => void;
  selectAllOpportunities: () => void;
  clearSelection: () => void;
  setFilterCategory: (category: RefactorOpportunity['category'] | 'all') => void;
  setFilterSeverity: (severity: RefactorOpportunity['severity'] | 'all') => void;
}

export interface WizardSlice {
  // State
  wizardPlan: WizardPlan | null;
  selectedScanGroups: Set<string>;
  techniqueOverrides: Map<string, boolean>;
  selectedFolders: string[];
  llmProvider: string;
  llmModel: string;
  isWizardOpen: boolean;
  currentStep: WizardStep;

  // Actions
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
  setCurrentStep: (step: WizardStep) => void;
  resetWizard: () => void;
}

export interface PackagesSlice {
  // State
  packages: RefactoringPackage[];
  selectedPackages: Set<string>;
  packageDependencies: DependencyGraph | null;
  packageFilter: PackageFilter;
  packageGenerationStatus: PackageGenerationStatus;
  packageGenerationError: string | null;
  projectContext: ProjectContext | null;

  // Actions
  setPackages: (packages: RefactoringPackage[]) => void;
  togglePackageSelection: (packageId: string) => void;
  selectPackagesWithDependencies: (packageId: string) => void;
  setPackageFilter: (filter: Partial<PackageFilter>) => void;
  clearPackages: () => void;
  setPackageDependencies: (graph: DependencyGraph) => void;
  setProjectContext: (context: ProjectContext) => void;
  setPackageGenerationStatus: (status: PackageGenerationStatus, error?: string) => void;
  selectAllPackages: () => void;
  clearPackageSelection: () => void;
  selectPackagesByCategory: (category: string) => void;
  selectFoundationalPackages: () => void;
  generatePackages: () => Promise<void>;
}

export interface DSLSlice {
  // State
  isDSLMode: boolean;
  currentSpec: RefactorSpec | null;
  dslExecutionStatus: DSLExecutionStatus;
  dslExecutionResult: ExecutionResult | null;
  recentSpecs: { name: string; spec: RefactorSpec; timestamp: string }[];
  savedSpecs: RefactorSpec[];

  // Actions
  setDSLMode: (enabled: boolean) => void;
  setCurrentSpec: (spec: RefactorSpec | null) => void;
  updateCurrentSpec: (updates: Partial<RefactorSpec>) => void;
  setDSLExecutionStatus: (status: DSLExecutionStatus) => void;
  setDSLExecutionResult: (result: ExecutionResult | null) => void;
  saveCurrentSpec: () => void;
  loadSpec: (spec: RefactorSpec) => void;
  deleteSavedSpec: (name: string) => void;
  addToRecentSpecs: (spec: RefactorSpec) => void;
  executeDSLSpec: (spec: RefactorSpec) => Promise<void>;
}

// Combined store type
export type RefactorState = AnalysisSlice & OpportunitiesSlice & WizardSlice & PackagesSlice & DSLSlice & {
  startAnalysis: (projectId: string, projectPath: string, useAI?: boolean, provider?: string, model?: string, projectType?: string, selectedFolders?: string[]) => Promise<void>;
};
