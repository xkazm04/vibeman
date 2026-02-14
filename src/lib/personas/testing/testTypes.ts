import type { DesignAnalysisResult } from '@/app/features/Personas/lib/designTypes';
import type { PersonaTriggerType } from '@/app/db/models/persona.types';
import type { UseCaseFlow } from './flowTypes';

// ============================================================================
// Test Case Definition
// ============================================================================

export interface StructuralExpectation {
  minTools?: number;
  maxTools?: number;
  requiredConnectors?: string[];       // e.g. ['gmail', 'slack']
  requiredTriggerTypes?: PersonaTriggerType[];
  requiredNotificationChannels?: string[]; // e.g. ['slack']
  requireEventSubscriptions?: boolean;
  minCustomSections?: number;
  expectedFeasibility?: 'ready' | 'partial' | 'blocked';
}

export interface SemanticExpectation {
  identityKeywords?: string[];        // Keywords that should appear in identity
  behaviorRequirements?: string[];    // High-level requirements the prompt should cover
  toolUsageScenarios?: string[];      // Scenarios that should be covered in toolGuidance
  errorHandlingCoverage?: string[];   // Error types that should be handled
}

export interface DesignTestCase {
  id: string;
  name: string;
  description: string;
  instruction: string;  // Natural language input to design engine
  mode: 'create' | 'edit';
  expectations: {
    structural: StructuralExpectation;
    semantic: SemanticExpectation;
  };
  mockContext: {
    personaName: string;
    personaDescription: string;
    availableTools: string[];  // Tool names from builtin tools
  };
}

// ============================================================================
// Evaluation Results
// ============================================================================

export interface StructuralCheck {
  name: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
  weight: number;
  message: string;
}

export interface StructuralEvaluation {
  passed: boolean;
  score: number;  // 0-100
  checks: StructuralCheck[];
}

export interface SemanticDimension {
  name: string;
  score: number;  // 0-100
  feedback: string;
}

export interface SemanticEvaluation {
  passed: boolean;
  overallScore: number;  // 0-100
  dimensions: SemanticDimension[];
  llmReasoning: string;
}

// ============================================================================
// Test Run Results
// ============================================================================

export type TestCaseStatus = 'passed' | 'failed' | 'error';

export interface TestCaseResult {
  testCaseId: string;
  testCaseName: string;
  status: TestCaseStatus;
  designResult: DesignAnalysisResult | null;
  structuralEvaluation: StructuralEvaluation;
  semanticEvaluation: SemanticEvaluation | null;
  connectorsUsed: string[];
  triggerTypes: string[];
  errors: string[];
  durationMs: number;
  flows?: UseCaseFlow[];
}

export interface TestRunConfig {
  testRunId: string;
  useCases: DesignTestCase[];
  outputDir: string;
}

export interface TestRunResult {
  testRunId: string;
  startedAt: string;
  completedAt: string;
  totalTests: number;
  passed: number;
  failed: number;
  errored: number;
  results: TestCaseResult[];
}

// ============================================================================
// Database Model
// ============================================================================

export interface DbDesignReview {
  id: string;
  test_case_id: string;
  test_case_name: string;
  instruction: string;
  status: TestCaseStatus;
  structural_score: number | null;
  semantic_score: number | null;
  connectors_used: string;     // JSON string[]
  trigger_types: string;       // JSON string[]
  design_result: string | null;       // JSON DesignAnalysisResult
  structural_evaluation: string | null; // JSON StructuralEvaluation
  semantic_evaluation: string | null;   // JSON SemanticEvaluation
  test_run_id: string;
  reviewed_at: string;
  created_at: string;
  // Self-improvement columns (migration 098)
  had_references: number;              // 1 if reference patterns were injected
  suggested_adjustment: string | null; // JSON AdjustmentSuggestion
  adjustment_generation: number;       // 0-3, tracks retry depth
  use_case_flows: string | null;         // JSON UseCaseFlow[]
}
