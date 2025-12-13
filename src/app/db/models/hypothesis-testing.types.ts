/**
 * Hypothesis-Driven Testing Types
 *
 * Transforms testing into hypothesis-driven experimentation:
 * - AI generates hypotheses about code behavior
 * - Tests designed to prove/disprove hypotheses
 * - Property-based testing with AI-discovered invariants
 * - Fuzzing guided by vulnerability predictions
 */

// ============== Hypothesis Types ==============

export type HypothesisType =
  | 'complexity'      // O(n), O(n²), etc.
  | 'behavior'        // Function does X when given Y
  | 'invariant'       // Property always holds
  | 'boundary'        // Edge case behavior
  | 'performance'     // Response time, memory usage
  | 'security'        // Vulnerability patterns
  | 'concurrency'     // Race conditions, deadlocks
  | 'state'           // State transitions
  | 'integration';    // Component interactions

export type HypothesisStatus =
  | 'proposed'        // AI generated, not yet tested
  | 'testing'         // Currently being tested
  | 'proven'          // Tests confirm hypothesis
  | 'disproven'       // Tests contradict hypothesis
  | 'inconclusive'    // Not enough evidence
  | 'refined';        // Updated based on test results

export type VerificationMethod =
  | 'unit_test'       // Traditional unit tests
  | 'property_test'   // Property-based testing
  | 'fuzz_test'       // Fuzzing
  | 'benchmark'       // Performance benchmarks
  | 'static_analysis' // Code analysis
  | 'runtime_check'   // Runtime assertions
  | 'integration_test'; // End-to-end verification

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Database model for code hypotheses
 */
export interface DbHypothesis {
  id: string;
  project_id: string;
  context_id: string | null;

  // Hypothesis definition
  title: string;
  statement: string;                  // The formal hypothesis statement
  hypothesis_type: HypothesisType;
  target_code: string;                // File path or function signature
  target_lines: string | null;        // JSON: {start: number, end: number}

  // AI reasoning
  reasoning: string | null;           // Why AI generated this hypothesis
  confidence: number;                 // 0-100 AI confidence
  discovery_source: string;           // What led to this hypothesis

  // Testing metadata
  verification_method: VerificationMethod;
  status: HypothesisStatus;
  priority: number;                   // 1-10 priority for testing
  risk_level: RiskLevel;

  // Results
  test_count: number;                 // Number of tests run
  pass_count: number;                 // Tests supporting hypothesis
  fail_count: number;                 // Tests contradicting hypothesis
  evidence: string | null;            // JSON array of evidence items
  conclusion: string | null;          // Final conclusion after testing

  // Metadata
  created_at: string;
  updated_at: string;
  tested_at: string | null;
}

/**
 * Application model with parsed JSON
 */
export interface Hypothesis extends Omit<DbHypothesis, 'target_lines' | 'evidence'> {
  target_lines: { start: number; end: number } | null;
  evidence: HypothesisEvidence[];
}

export interface HypothesisEvidence {
  type: 'test_result' | 'benchmark' | 'trace' | 'counterexample' | 'coverage';
  timestamp: string;
  supports_hypothesis: boolean;
  summary: string;
  details: Record<string, unknown>;
}

export interface CreateHypothesisInput {
  project_id: string;
  context_id?: string;
  title: string;
  statement: string;
  hypothesis_type: HypothesisType;
  target_code: string;
  target_lines?: { start: number; end: number };
  reasoning?: string;
  confidence: number;
  discovery_source: string;
  verification_method: VerificationMethod;
  priority?: number;
  risk_level?: RiskLevel;
}

export interface UpdateHypothesisInput {
  title?: string;
  statement?: string;
  status?: HypothesisStatus;
  test_count?: number;
  pass_count?: number;
  fail_count?: number;
  evidence?: HypothesisEvidence[];
  conclusion?: string;
  confidence?: number;
}

// ============== Invariant Types ==============

export type InvariantScope = 'function' | 'class' | 'module' | 'global';
export type InvariantCategory =
  | 'null_safety'
  | 'range_bounds'
  | 'type_constraints'
  | 'relationship'     // Between two values
  | 'ordering'
  | 'uniqueness'
  | 'immutability'
  | 'idempotence'
  | 'custom';

/**
 * Database model for discovered invariants
 */
export interface DbInvariant {
  id: string;
  project_id: string;
  hypothesis_id: string | null;       // Link to hypothesis that discovered it

  // Invariant definition
  name: string;
  description: string;
  category: InvariantCategory;
  scope: InvariantScope;

  // Target code
  target_code: string;
  expression: string;                 // The invariant expression/predicate

  // Validation
  validated: number;                  // Boolean: 0 or 1
  validation_count: number;           // Number of times validated
  violation_count: number;
  last_violation: string | null;      // JSON: {input, output, expected}

  // Metadata
  confidence: number;                 // 0-100 confidence in invariant
  auto_generated: number;             // Boolean: AI discovered
  created_at: string;
  updated_at: string;
}

export interface Invariant extends Omit<DbInvariant, 'validated' | 'auto_generated' | 'last_violation'> {
  validated: boolean;
  auto_generated: boolean;
  last_violation: InvariantViolation | null;
}

export interface InvariantViolation {
  input: unknown;
  output: unknown;
  expected: unknown;
  timestamp: string;
}

export interface CreateInvariantInput {
  project_id: string;
  hypothesis_id?: string;
  name: string;
  description: string;
  category: InvariantCategory;
  scope: InvariantScope;
  target_code: string;
  expression: string;
  confidence?: number;
  auto_generated?: boolean;
}

// ============== Fuzzing Types ==============

export type FuzzStrategy =
  | 'random'           // Pure random input generation
  | 'mutation'         // Mutate valid inputs
  | 'grammar'          // Grammar-based fuzzing
  | 'coverage'         // Coverage-guided fuzzing
  | 'property'         // Property-guided
  | 'vulnerability';   // Target known vulnerability patterns

export type VulnerabilityClass =
  | 'injection'        // SQL, command, XSS
  | 'overflow'         // Buffer/integer overflow
  | 'format_string'
  | 'null_deref'
  | 'race_condition'
  | 'auth_bypass'
  | 'path_traversal'
  | 'deserialization'
  | 'prototype_pollution'
  | 'regex_dos';

/**
 * Database model for fuzz test sessions
 */
export interface DbFuzzSession {
  id: string;
  project_id: string;
  hypothesis_id: string | null;

  // Target
  target_function: string;
  target_file: string;
  input_schema: string;               // JSON schema for input generation

  // Strategy
  strategy: FuzzStrategy;
  vulnerability_targets: string | null; // JSON array of VulnerabilityClass
  max_iterations: number;
  timeout_ms: number;

  // Progress
  status: 'pending' | 'running' | 'completed' | 'stopped' | 'crashed';
  iterations_completed: number;
  crashes_found: number;
  hangs_found: number;
  coverage_increase: number | null;   // Percentage

  // Results
  findings: string | null;            // JSON array of FuzzFinding
  best_inputs: string | null;         // JSON array of inputs that maximized coverage

  // Metadata
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FuzzSession extends Omit<DbFuzzSession, 'vulnerability_targets' | 'findings' | 'best_inputs'> {
  vulnerability_targets: VulnerabilityClass[];
  findings: FuzzFinding[];
  best_inputs: unknown[];
}

export interface FuzzFinding {
  id: string;
  type: 'crash' | 'hang' | 'assertion' | 'security' | 'coverage';
  severity: RiskLevel;
  input: unknown;
  output?: unknown;
  error?: string;
  stack_trace?: string;
  vulnerability_class?: VulnerabilityClass;
  timestamp: string;
}

export interface CreateFuzzSessionInput {
  project_id: string;
  hypothesis_id?: string;
  target_function: string;
  target_file: string;
  input_schema: Record<string, unknown>;
  strategy?: FuzzStrategy;
  vulnerability_targets?: VulnerabilityClass[];
  max_iterations?: number;
  timeout_ms?: number;
}

// ============== Property Test Types ==============

export type PropertyType =
  | 'for_all'          // ∀x: P(x)
  | 'there_exists'     // ∃x: P(x)
  | 'commutative'      // f(a,b) = f(b,a)
  | 'associative'      // f(f(a,b),c) = f(a,f(b,c))
  | 'idempotent'       // f(f(x)) = f(x)
  | 'inverse'          // f(g(x)) = x
  | 'monotonic'        // a < b → f(a) < f(b)
  | 'bounded'          // a ≤ f(x) ≤ b
  | 'custom';

/**
 * Database model for property-based tests
 */
export interface DbPropertyTest {
  id: string;
  project_id: string;
  hypothesis_id: string | null;
  invariant_id: string | null;

  // Property definition
  name: string;
  description: string;
  property_type: PropertyType;

  // Target
  target_function: string;
  target_file: string;

  // Property expression
  generator_code: string;            // Code to generate test inputs
  predicate_code: string;            // The property predicate
  shrink_code: string | null;        // Code to shrink counterexamples

  // Execution
  num_tests: number;                  // Number of random tests to run
  seed: number | null;                // Random seed for reproducibility

  // Results
  status: 'pending' | 'running' | 'passed' | 'failed';
  tests_run: number;
  counterexamples: string | null;     // JSON array of counterexamples
  shrunk_example: string | null;      // JSON: smallest counterexample
  execution_time_ms: number | null;

  // Metadata
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyTest extends Omit<DbPropertyTest, 'counterexamples' | 'shrunk_example'> {
  counterexamples: unknown[];
  shrunk_example: unknown | null;
}

export interface CreatePropertyTestInput {
  project_id: string;
  hypothesis_id?: string;
  invariant_id?: string;
  name: string;
  description: string;
  property_type: PropertyType;
  target_function: string;
  target_file: string;
  generator_code: string;
  predicate_code: string;
  shrink_code?: string;
  num_tests?: number;
  seed?: number;
}

// ============== Test Knowledge Base Types ==============

export type KnowledgeType =
  | 'invariant_discovered'
  | 'bug_found'
  | 'performance_baseline'
  | 'security_issue'
  | 'behavior_documented'
  | 'edge_case_identified';

/**
 * Database model for test-derived knowledge
 * Tests become knowledge artifacts, not just check-boxes
 */
export interface DbTestKnowledge {
  id: string;
  project_id: string;
  hypothesis_id: string | null;

  // Knowledge classification
  knowledge_type: KnowledgeType;
  title: string;
  description: string;

  // Related code
  related_files: string;              // JSON array of file paths
  related_functions: string | null;   // JSON array of function names

  // Evidence
  source_test_id: string | null;      // Which test discovered this
  evidence_summary: string;
  confidence: number;

  // Impact
  impact_assessment: string | null;
  recommendations: string | null;     // JSON array of recommendations

  // Status
  acknowledged: number;               // Boolean
  resolved: number;                   // Boolean (for bugs/issues)
  resolution_notes: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface TestKnowledge extends Omit<DbTestKnowledge, 'related_files' | 'related_functions' | 'recommendations' | 'acknowledged' | 'resolved'> {
  related_files: string[];
  related_functions: string[] | null;
  recommendations: string[] | null;
  acknowledged: boolean;
  resolved: boolean;
}

export interface CreateTestKnowledgeInput {
  project_id: string;
  hypothesis_id?: string;
  knowledge_type: KnowledgeType;
  title: string;
  description: string;
  related_files: string[];
  related_functions?: string[];
  source_test_id?: string;
  evidence_summary: string;
  confidence?: number;
  impact_assessment?: string;
  recommendations?: string[];
}

// ============== Hypothesis Testing Summary ==============

export interface HypothesisTestingSummary {
  total_hypotheses: number;
  by_status: Record<HypothesisStatus, number>;
  by_type: Record<HypothesisType, number>;
  proven_rate: number;                // Percentage of hypotheses proven

  total_invariants: number;
  validated_invariants: number;
  violated_invariants: number;

  total_fuzz_sessions: number;
  total_findings: number;
  critical_findings: number;

  total_property_tests: number;
  passing_tests: number;

  knowledge_items: number;
  unresolved_issues: number;
}

// ============== AI Generation Types ==============

export interface HypothesisGenerationRequest {
  project_id: string;
  context_id?: string;
  target_files?: string[];
  focus_areas?: HypothesisType[];
  max_hypotheses?: number;
}

export interface GeneratedHypothesis {
  title: string;
  statement: string;
  hypothesis_type: HypothesisType;
  target_code: string;
  target_lines?: { start: number; end: number };
  reasoning: string;
  confidence: number;
  suggested_verification: VerificationMethod;
  priority: number;
  risk_level: RiskLevel;
}

export interface InvariantDiscoveryRequest {
  project_id: string;
  target_file: string;
  target_function?: string;
  sample_inputs?: unknown[];
  sample_outputs?: unknown[];
}

export interface VulnerabilityPredictionRequest {
  project_id: string;
  target_file: string;
  code_content: string;
}

export interface PredictedVulnerability {
  vulnerability_class: VulnerabilityClass;
  location: { start: number; end: number };
  confidence: number;
  reasoning: string;
  suggested_fuzz_inputs: unknown[];
}
