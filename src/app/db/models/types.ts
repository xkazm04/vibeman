/**
 * Database model type definitions
 * Centralized type system for all database entities
 */

import type { IdeaCategory } from '@/types/ideaCategory';

// Goal types
export interface DbGoal {
  id: string;
  project_id: string;
  context_id: string | null;
  order_index: number;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
  // Extended Goal Hub fields
  progress?: number;
  hypotheses_total?: number;
  hypotheses_verified?: number;
  target_date?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  // GitHub sync
  github_item_id: string | null;
  created_at: string;
  updated_at: string;
}

// Backlog types
export interface ImpactedFile {
  path: string;
  changeType: 'create' | 'modify' | 'delete';
  description?: string;
}

export interface DbBacklogItem {
  id: string;
  project_id: string;
  goal_id: string | null;
  agent: 'developer' | 'mastermind' | 'tester' | 'artist' | 'custom';
  title: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress';
  type: 'proposal' | 'custom';
  impacted_files: string | null; // JSON string
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  rejected_at: string | null;
}

// Context group types
export interface DbContextGroup {
  id: string;
  project_id: string;
  name: string;
  color: string;
  accent_color: string | null; // Optional accent color for gradient transitions
  position: number;
  type: 'pages' | 'client' | 'server' | 'external' | null; // Architecture layer type
  icon: string | null; // Icon name for visual representation
  created_at: string;
  updated_at: string;
}

// Context group relationship types
export interface DbContextGroupRelationship {
  id: string;
  project_id: string;
  source_group_id: string;
  target_group_id: string;
  created_at: string;
}

// Context types
export interface DbContext {
  id: string;
  project_id: string;
  group_id: string | null;
  name: string;
  description: string | null;
  file_paths: string; // JSON string of file paths array
  has_context_file: number; // Boolean flag (0 or 1)
  context_file_path: string | null;
  preview: string | null; // Preview image path
  test_scenario: string | null; // Testing steps for automated screenshots
  test_updated: string | null; // Last time screenshot was taken
  target: string | null; // Goal/target functionality of this context
  target_fulfillment: string | null; // Current progress toward target
  target_rating: number | null; // Rating 1-5 for target progress visualization
  implemented_tasks: number; // Counter for implemented tasks in this context
  // NEW: Enhanced context fields (Phase 1)
  category: 'ui' | 'lib' | 'api' | 'data' | null; // File category classification
  api_routes: string | null; // JSON array of API paths handled by this context
  business_feature: string | null; // Human-readable business feature name
  created_at: string;
  updated_at: string;
}

// Context API Route mapping types (Phase 1)
export interface DbContextApiRoute {
  id: string;
  context_id: string;           // References contexts.id
  api_path: string;             // e.g., "/api/users", "/api/ideas"
  http_methods: string;         // Comma-separated: "GET,POST,PUT,DELETE"
  layer: 'pages' | 'client' | 'server' | 'external';
  created_at: string;
}

// X-Ray Event types (Phase 1 - for persisted API traffic visualization)
export interface DbXRayEvent {
  id: string;
  api_call_id: string | null;   // References obs_api_calls.id
  context_id: string | null;    // References contexts.id
  context_group_id: string | null; // References context_groups.id
  source_layer: 'pages' | 'client' | 'server' | null;
  target_layer: 'server' | 'external' | null;
  method: string;               // HTTP method
  path: string;                 // API path
  status: number;               // HTTP status code
  duration: number;             // Response time in ms
  timestamp: number;            // Unix timestamp
  created_at: string;
}

// Event types
export interface DbEvent {
  id: string;
  project_id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'proposal_accepted' | 'proposal_rejected';
  agent: string | null;
  message: string | null;
  context_id: string | null;
  created_at: string;
}

// Scan types
export interface DbScan {
  id: string;
  project_id: string;
  scan_type: string;
  timestamp: string;
  summary: string | null;
  input_tokens: number | null; // LLM input tokens used
  output_tokens: number | null; // LLM output tokens used
  created_at: string;
}

// Idea types
export interface DbIdea {
  id: string;
  scan_id: string;
  project_id: string;
  context_id: string | null;
  scan_type: string; // Type of scan that generated this idea
  category: string; // Accepts any text, but IdeaCategory enum provides guidelines
  title: string;
  description: string | null;
  reasoning: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'implemented';
  user_feedback: string | null;
  user_pattern: number; // Boolean flag (0 or 1)
  effort: number | null; // 1-10 scale: 1 = trivial (hours), 10 = massive (months)
  impact: number | null; // 1-10 scale: 1 = negligible, 10 = critical/transformational
  risk: number | null; // 1-10 scale: 1 = very safe, 10 = critical risk
  requirement_id: string | null; // Claude Code requirement file name
  goal_id: string | null; // Related goal (foreign key to goals table)
  created_at: string;
  updated_at: string;
  implemented_at: string | null; // Date when idea was implemented
}

// Enhanced idea type with context color (from JOIN query)
export interface DbIdeaWithColor extends DbIdea {
  context_color?: string | null;
}

// Implementation log types
export interface DbImplementationLog {
  id: string;
  project_id: string;
  context_id: string | null;
  requirement_name: string;
  title: string;
  overview: string;
  overview_bullets: string | null; // Newline-separated bullet points for card display
  tested: number; // SQLite boolean (0 or 1)
  screenshot: string | null; // Relative path from project/public to screenshot image
  created_at: string;
}


// Scan Queue types
export interface DbScanQueueItem {
  id: string;
  project_id: string;
  scan_type: string;
  context_id: string | null;
  trigger_type: 'manual' | 'git_push' | 'file_change' | 'scheduled';
  trigger_metadata: string | null; // JSON string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  progress: number; // 0-100
  progress_message: string | null;
  current_step: string | null;
  total_steps: number | null;
  scan_id: string | null;
  result_summary: string | null;
  error_message: string | null;
  auto_merge_enabled: number; // Boolean flag (0 or 1)
  auto_merge_status: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TriggerMetadata {
  files?: string[]; // Files that triggered the scan
  commitHash?: string; // Git commit hash
  branch?: string; // Git branch
  author?: string; // Commit author
  [key: string]: string | string[] | number | boolean | undefined; // Allow additional metadata
}

// Scan Notification types
export interface DbScanNotification {
  id: string;
  queue_item_id: string;
  project_id: string;
  notification_type: 'scan_started' | 'scan_completed' | 'scan_failed' | 'auto_merge_completed';
  title: string;
  message: string;
  data: string | null; // JSON string
  read: number; // Boolean flag (0 or 1)
  created_at: string;
}

// File Watch Config types
export interface DbFileWatchConfig {
  id: string;
  project_id: string;
  enabled: number; // Boolean flag (0 or 1)
  watch_patterns: string; // JSON array of glob patterns
  ignore_patterns: string | null; // JSON array of glob patterns
  scan_types: string; // JSON array of scan types
  debounce_ms: number;
  created_at: string;
  updated_at: string;
}

// Test Selectors types
export interface DbTestSelector {
  id: string;
  context_id: string;
  data_testid: string;
  title: string;
  filepath: string;
  created_at: string;
  updated_at: string;
}

// Goal Candidates types
export interface DbGoalCandidate {
  id: string;
  project_id: string;
  context_id: string | null;
  title: string;
  description: string | null;
  reasoning: string | null;
  priority_score: number; // 0-100
  source: string; // 'repository_scan' | 'git_issues' | 'pull_requests' | 'tech_debt' | 'manual'
  source_metadata: string | null; // JSON string with additional source info
  suggested_status: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
  user_action: 'accepted' | 'rejected' | 'tweaked' | 'pending' | null;
  goal_id: string | null; // Reference to created goal if accepted
  created_at: string;
  updated_at: string;
}

export interface GoalCandidateSourceMetadata {
  issueNumber?: number;
  prNumber?: number;
  commitHash?: string;
  filePaths?: string[];
  techDebtId?: string;
  [key: string]: string | string[] | number | boolean | undefined;
}

// Test Case Management types
export interface DbTestCaseScenario {
  id: string;
  context_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTestCaseStep {
  id: string;
  scenario_id: string;
  step_order: number;
  step_name: string;
  expected_result: string;
  test_selector_id: string | null;
  created_at: string;
  updated_at: string;
}

// Idea Execution Outcome types (for Self-Optimizing Development Cycle)
export interface DbIdeaExecutionOutcome {
  id: string;
  idea_id: string;
  project_id: string;
  predicted_effort: number | null; // 1-3 scale
  predicted_impact: number | null; // 1-3 scale
  actual_effort: number | null; // 1-3 scale (based on execution metrics)
  actual_impact: number | null; // 1-3 scale (based on success/failure)
  execution_time_ms: number | null; // Time to execute
  files_changed: number | null; // Number of files modified
  lines_added: number | null;
  lines_removed: number | null;
  success: number; // Boolean flag (0 or 1)
  error_type: string | null; // Type of error if failed
  user_feedback_score: number | null; // User rating 1-5
  category: string; // Idea category for pattern analysis
  scan_type: string; // Scan type that generated the idea
  executed_at: string;
  created_at: string;
}

// Scoring Weight Configuration
export interface DbScoringWeight {
  id: string;
  project_id: string;
  category: string; // Idea category or 'default'
  scan_type: string; // Scan type or 'default'
  effort_accuracy_weight: number; // Weight for effort prediction accuracy
  impact_accuracy_weight: number; // Weight for impact prediction accuracy
  success_rate_weight: number; // Weight for success rate
  execution_time_factor: number; // Factor for execution time normalization
  sample_count: number; // Number of samples used for this weight
  last_calibrated_at: string;
  created_at: string;
  updated_at: string;
}

// Scoring Threshold Configuration
export interface DbScoringThreshold {
  id: string;
  project_id: string;
  threshold_type: 'auto_accept' | 'auto_reject' | 'priority_boost';
  min_score: number | null; // Minimum score threshold
  max_score: number | null; // Maximum score threshold
  min_confidence: number | null; // Minimum confidence level
  enabled: number; // Boolean flag (0 or 1)
  created_at: string;
  updated_at: string;
}

// Blueprint Configuration types
export interface DbBlueprintConfig {
  id: string;
  project_id: string | null; // null = template available to all projects
  name: string;
  description: string | null;
  is_template: number; // Boolean flag (0 or 1)
  config: string; // JSON string containing nodes and edges configuration
  created_at: string;
  updated_at: string;
}

export interface BlueprintNodeConfig {
  id: string;
  componentId: string;
  config: Record<string, unknown>;
  position?: { x: number; y: number };
}

export interface BlueprintEdgeConfig {
  id: string;
  source: string;
  target: string;
  sourceOutput?: string;
  targetInput?: string;
}

export interface BlueprintConfigData {
  nodes: BlueprintNodeConfig[];
  edges: BlueprintEdgeConfig[];
}

// Blueprint Execution types
export interface DbBlueprintExecution {
  id: string;
  blueprint_id: string;
  project_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  current_node_id: string | null;
  node_results: string | null; // JSON string of node execution results
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NodeExecutionResult {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  output?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
}

// Blueprint Component Registry types
export interface DbBlueprintComponent {
  id: string;
  component_id: string; // e.g., 'analyzer.console'
  type: 'analyzer' | 'processor' | 'executor' | 'tester';
  name: string;
  description: string;
  category: string | null;
  tags: string | null; // JSON array of tags
  icon: string | null;
  color: string | null;
  config_schema: string; // JSON schema
  default_config: string; // JSON default config
  input_types: string; // JSON array of input type names
  output_types: string; // JSON array of output type names
  supported_project_types: string; // JSON array of project types
  is_custom: number; // Boolean flag (0 or 1), true for user-defined
  created_at: string;
  updated_at: string;
}

// Developer Mind-Meld types (personalized AI learning system)
export interface DbDeveloperProfile {
  id: string;
  project_id: string; // null for global profile
  enabled: number; // Boolean flag (0 or 1)
  // Agent preferences (which agents resonate with the developer)
  preferred_scan_types: string; // JSON array of preferred scan types
  avoided_scan_types: string; // JSON array of scan types to deprioritize
  // Code style preferences
  preferred_patterns: string; // JSON array of pattern names/identifiers
  formatting_preferences: string; // JSON object with formatting settings
  // Thresholds
  security_posture: 'strict' | 'balanced' | 'relaxed';
  performance_threshold: 'high' | 'medium' | 'low'; // How performance-sensitive
  // Learning stats
  total_decisions: number;
  total_accepted: number;
  total_rejected: number;
  learning_confidence: number; // 0-100 based on decision count
  last_profile_update: string;
  created_at: string;
  updated_at: string;
}

export interface DbDeveloperDecision {
  id: string;
  profile_id: string;
  project_id: string;
  // What was decided on
  decision_type: 'idea_accept' | 'idea_reject' | 'pattern_apply' | 'pattern_skip' | 'suggestion_accept' | 'suggestion_dismiss';
  entity_id: string; // ID of the idea/pattern/suggestion
  entity_type: string; // 'idea', 'refactoring_pattern', 'consistency_suggestion'
  // Decision context
  scan_type: string | null;
  category: string | null;
  effort: number | null;
  impact: number | null;
  // The decision
  accepted: number; // Boolean flag (0 or 1)
  feedback: string | null; // Optional user feedback
  // For learning
  context_snapshot: string | null; // JSON snapshot of relevant context
  created_at: string;
}

export interface DbLearningInsight {
  id: string;
  profile_id: string;
  project_id: string;
  // Type of insight
  insight_type: 'pattern_detected' | 'consistency_violation' | 'skill_gap' | 'preference_learned' | 'prediction_confidence';
  // Insight details
  title: string;
  description: string;
  data: string; // JSON with insight-specific data
  // Relevance
  confidence: number; // 0-100
  importance: 'high' | 'medium' | 'low';
  // State
  status: 'active' | 'acknowledged' | 'dismissed' | 'applied';
  // Related entity
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbCodePatternUsage {
  id: string;
  profile_id: string;
  project_id: string;
  // Pattern identification
  pattern_name: string; // e.g., 'api_handler_structure', 'component_layout', 'error_handling'
  pattern_signature: string; // Hash or identifier for the specific pattern variant
  // Usage tracking
  usage_count: number;
  last_used_at: string;
  first_used_at: string;
  // Files where pattern was used
  file_paths: string; // JSON array of file paths
  // Metadata
  category: string; // 'api', 'component', 'utility', 'test', etc.
  created_at: string;
  updated_at: string;
}

export interface DbConsistencyRule {
  id: string;
  profile_id: string;
  project_id: string;
  // Rule definition
  rule_name: string;
  rule_type: 'api_structure' | 'component_pattern' | 'naming_convention' | 'file_organization' | 'error_handling' | 'custom';
  description: string;
  // Pattern to enforce
  pattern_template: string; // JSON template describing the expected pattern
  example_code: string | null; // Example of correct usage
  // Enforcement
  enabled: number; // Boolean flag (0 or 1)
  severity: 'error' | 'warning' | 'suggestion';
  auto_suggest: number; // Boolean flag - should system proactively suggest?
  // Stats
  violations_detected: number;
  violations_fixed: number;
  created_at: string;
  updated_at: string;
}

export interface DbSkillTracking {
  id: string;
  profile_id: string;
  project_id: string;
  // Skill identification
  skill_area: string; // e.g., 'react', 'api_design', 'testing', 'security', 'performance'
  sub_skill: string | null; // e.g., 'hooks', 'context', 'suspense' for 'react'
  // Tracking
  proficiency_score: number; // 0-100 calculated from success rate
  implementations_count: number;
  success_count: number;
  failure_count: number;
  // Trend
  trend: 'improving' | 'stable' | 'declining';
  last_activity_at: string;
  // Recommendations
  improvement_suggestions: string | null; // JSON array of suggestions
  created_at: string;
  updated_at: string;
}

// Developer profile preferences JSON structure types
export interface DeveloperFormattingPreferences {
  indentation?: 'tabs' | 'spaces';
  indentSize?: number;
  semicolons?: boolean;
  trailingCommas?: boolean;
  singleQuotes?: boolean;
  maxLineLength?: number;
}

export interface PatternTemplate {
  structure: string;
  requiredElements: string[];
  optionalElements: string[];
  antiPatterns: string[];
}

export interface LearningInsightData {
  patternName?: string;
  occurrences?: number;
  files?: string[];
  suggestedAction?: string;
  violationDetails?: string;
  comparisonData?: Record<string, unknown>;
}

// Question types (for guided idea generation)
export interface DbQuestion {
  id: string;
  project_id: string;
  context_map_id: string;      // References context_map.json entry id
  context_map_title: string;   // Denormalized for display
  goal_id: string | null;      // Set when answer is saved (auto-creates goal)
  question: string;
  answer: string | null;
  status: 'pending' | 'answered';
  created_at: string;
  updated_at: string;
}

// Direction types (for actionable development guidance)
export interface DbDirection {
  id: string;
  project_id: string;
  // Legacy JSON-based fields (kept for backwards compatibility)
  context_map_id: string;           // References context_map.json entry id
  context_map_title: string;        // Denormalized for display
  // NEW: SQLite context-based fields (Phase 5)
  context_id: string | null;        // References contexts.id
  context_name: string | null;      // Denormalized for display
  context_group_id: string | null;  // References context_groups.id
  // Content
  direction: string;                // Full markdown content
  summary: string;                  // One-liner summary
  status: 'pending' | 'accepted' | 'rejected';
  requirement_id: string | null;    // Set when accepted (created requirement)
  requirement_path: string | null;  // Path to created requirement file
  created_at: string;
  updated_at: string;
}

// Claude Terminal Session types
export interface DbTerminalSession {
  id: string;
  project_path: string;
  status: 'idle' | 'running' | 'waiting_approval' | 'completed' | 'error';
  message_count: number;
  last_prompt: string | null;
  total_tokens_in: number;
  total_tokens_out: number;
  total_cost_usd: number;
  created_at: string;
  updated_at: string;
}

export interface DbTerminalMessage {
  id: string;
  session_id: string;
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'error' | 'system' | 'approval_request' | 'streaming';
  content: string;
  timestamp: string;
  metadata: string | null; // JSON string
}

export interface DbPendingApproval {
  id: string;
  session_id: string;
  tool_use_id: string;
  tool_name: string;
  tool_input: string; // JSON string
  status: 'pending' | 'approved' | 'denied';
  decision: 'approve' | 'deny' | null;
  decision_reason: string | null;
  decided_at: string | null;
  created_at: string;
}

// Prompt Template types (for reusable prompt composition and requirement generation)
export type PromptTemplateCategory = 'storywriting' | 'research' | 'code_generation' | 'analysis' | 'review' | 'custom';

export interface PromptTemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'text';
  required: boolean;
  default_value?: string;
  description?: string;
}

export interface DbPromptTemplate {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  category: PromptTemplateCategory;
  template_content: string;
  variables: string; // JSON array of PromptTemplateVariable
  created_at: string;
  updated_at: string;
}

// === Workspace Types ===

export interface DbWorkspace {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  base_path: string | null; // Root directory for projects in this workspace
  position: number;
  created_at: string;
  updated_at: string;
}

export interface DbWorkspaceProject {
  id: string;
  workspace_id: string;
  project_id: string;
  position: number;
  added_at: string;
}

// Export standard category type for use in type annotations
export type { IdeaCategory };
