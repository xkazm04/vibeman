/**
 * Adversarial Red Team Testing Types
 *
 * AI red team system where agents deliberately try to break code:
 * - Security Protector attempts exploits
 * - Performance Optimizer tries to create bottlenecks
 * - Bug Hunter generates edge cases that crash the system
 * - Parliament debate system surfaces vulnerabilities before production
 */

import type { ScanType } from '@/app/features/Ideas/lib/scanTypes';

// ============== Attack Types ==============

export type AttackCategory =
  | 'security'         // Security vulnerabilities, exploits
  | 'performance'      // Resource exhaustion, bottlenecks
  | 'edge_case'        // Crash-inducing edge cases
  | 'state'            // Invalid state transitions
  | 'concurrency'      // Race conditions, deadlocks
  | 'input'            // Malformed input handling
  | 'integration';     // Component boundary attacks

export type AttackSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type AttackStatus =
  | 'planned'          // Attack planned but not executed
  | 'executing'        // Currently running
  | 'succeeded'        // Attack found vulnerability
  | 'failed'           // Attack did not break the system
  | 'blocked'          // System properly defended
  | 'error';           // Attack execution error

export type RedTeamRole =
  | 'attacker'         // Attempting to break the system
  | 'defender'         // Arguing why system is safe
  | 'validator'        // Confirming findings
  | 'judge';           // Making final assessment

export type SessionStatus =
  | 'planning'         // Selecting targets and strategies
  | 'attacking'        // Executing attacks
  | 'debating'         // Parliament debate on findings
  | 'validating'       // Confirming vulnerabilities
  | 'reporting'        // Generating final report
  | 'completed';       // Session finished

// ============== Red Team Agent Mapping ==============

/**
 * Maps existing agents to red team attack specializations
 */
export const RED_TEAM_AGENT_ROLES: Record<ScanType, {
  attackTypes: AttackCategory[];
  adversaryPersona: string;
  focusAreas: string[];
}> = {
  security_protector: {
    attackTypes: ['security', 'input'],
    adversaryPersona: 'Malicious hacker attempting to compromise the system',
    focusAreas: [
      'SQL/Command injection',
      'XSS attacks',
      'Authentication bypass',
      'Authorization flaws',
      'Sensitive data exposure'
    ]
  },
  perf_optimizer: {
    attackTypes: ['performance', 'state'],
    adversaryPersona: 'Attacker trying to cause denial of service',
    focusAreas: [
      'Resource exhaustion',
      'Memory leaks',
      'CPU-bound operations',
      'Unbounded loops',
      'Large payload attacks'
    ]
  },
  bug_hunter: {
    attackTypes: ['edge_case', 'input', 'state'],
    adversaryPersona: 'Chaos engineer finding system breaking points',
    focusAreas: [
      'Null/undefined handling',
      'Empty array/object scenarios',
      'Boundary conditions',
      'Race conditions',
      'Invalid state combinations'
    ]
  },
  data_flow_optimizer: {
    attackTypes: ['state', 'concurrency'],
    adversaryPersona: 'Attacker exploiting data flow weaknesses',
    focusAreas: [
      'State corruption',
      'Data race conditions',
      'Cache poisoning',
      'Stale data exploitation'
    ]
  },
  zen_architect: {
    attackTypes: ['integration', 'state'],
    adversaryPersona: 'Adversary exploiting architectural weaknesses',
    focusAreas: [
      'Component boundary violations',
      'Dependency confusion',
      'Circular dependencies',
      'Tight coupling exploits'
    ]
  },
  // Default mappings for other agents
  insight_synth: {
    attackTypes: ['integration'],
    adversaryPersona: 'Analyst finding hidden connections to exploit',
    focusAreas: ['Cross-cutting concerns', 'Hidden dependencies']
  },
  ambiguity_guardian: {
    attackTypes: ['edge_case'],
    adversaryPersona: 'Attacker exploiting ambiguous behavior',
    focusAreas: ['Undefined behavior', 'Specification gaps']
  },
  business_visionary: {
    attackTypes: ['state'],
    adversaryPersona: 'Business logic abuser',
    focusAreas: ['Business rule violations', 'Process bypasses']
  },
  ui_perfectionist: {
    attackTypes: ['input'],
    adversaryPersona: 'UI exploiter',
    focusAreas: ['UI injection', 'Layout breaking']
  },
  feature_scout: {
    attackTypes: ['integration'],
    adversaryPersona: 'Feature interaction exploiter',
    focusAreas: ['Feature conflicts', 'Unexpected combinations']
  },
  onboarding_optimizer: {
    attackTypes: ['state', 'input'],
    adversaryPersona: 'First-time user abuse scenario',
    focusAreas: ['Empty state failures', 'Setup process vulnerabilities']
  },
  ai_integration_scout: {
    attackTypes: ['input', 'security'],
    adversaryPersona: 'AI/ML adversary',
    focusAreas: ['Prompt injection', 'Model abuse', 'AI hallucination exploits']
  },
  delight_designer: {
    attackTypes: ['performance'],
    adversaryPersona: 'Animation/interaction attacker',
    focusAreas: ['Animation performance', 'Interaction blocking']
  },
  code_refactor: {
    attackTypes: ['state', 'integration'],
    adversaryPersona: 'Legacy code exploiter',
    focusAreas: ['Dead code paths', 'Deprecated API abuse']
  },
  user_empathy_champion: {
    attackTypes: ['edge_case'],
    adversaryPersona: 'Frustrated user scenario generator',
    focusAreas: ['Error recovery failures', 'Confusing workflows']
  },
  paradigm_shifter: {
    attackTypes: ['integration', 'state'],
    adversaryPersona: 'Architecture breaker',
    focusAreas: ['Paradigm assumption violations', 'Pattern anti-patterns']
  },
  moonshot_architect: {
    attackTypes: ['performance', 'integration'],
    adversaryPersona: 'Scale breaker',
    focusAreas: ['Scale limit exploits', 'Future-proofing failures']
  },
  dev_experience_engineer: {
    attackTypes: ['edge_case'],
    adversaryPersona: 'Developer workflow attacker',
    focusAreas: ['Build process failures', 'Dev tooling exploits']
  },
  pragmatic_integrator: {
    attackTypes: ['integration'],
    adversaryPersona: 'E2E workflow attacker',
    focusAreas: ['End-to-end scenario failures', 'Integration gaps']
  },
  refactor_analysis: {
    attackTypes: ['state'],
    adversaryPersona: 'Refactoring regression hunter',
    focusAreas: ['Regression introduction', 'Behavioral changes']
  }
};

// ============== Attack Definition ==============

/**
 * Database model for a planned/executed attack
 */
export interface DbRedTeamAttack {
  id: string;
  session_id: string;
  project_id: string;

  // Attack definition
  name: string;
  description: string;
  category: AttackCategory;
  agent_type: string;                  // ScanType that generated this attack
  target_component: string;            // File path or component name
  target_code: string | null;          // Specific code snippet being attacked

  // Attack strategy
  attack_vector: string;               // How the attack is performed
  payloads: string | null;             // JSON array of attack payloads
  prerequisites: string | null;        // JSON array of required conditions
  expected_outcome: string;            // What a successful attack looks like

  // Execution
  status: AttackStatus;
  severity: AttackSeverity;
  executed_at: string | null;
  execution_time_ms: number | null;

  // Results
  vulnerability_found: number;         // Boolean: 0 or 1
  actual_outcome: string | null;       // What actually happened
  error_message: string | null;
  stack_trace: string | null;
  evidence: string | null;             // JSON: screenshots, logs, etc.

  // AI confidence
  success_probability: number;         // 0-100 AI prediction
  impact_score: number;                // 1-10 potential impact if successful

  // Metadata
  created_at: string;
  updated_at: string;
}

export interface RedTeamAttack extends Omit<DbRedTeamAttack, 'payloads' | 'prerequisites' | 'evidence' | 'vulnerability_found'> {
  payloads: AttackPayload[];
  prerequisites: string[];
  evidence: AttackEvidence[];
  vulnerability_found: boolean;
}

export interface AttackPayload {
  id: string;
  type: 'input' | 'request' | 'action' | 'state';
  value: unknown;
  description: string;
}

export interface AttackEvidence {
  type: 'screenshot' | 'log' | 'stack_trace' | 'response' | 'state_dump';
  timestamp: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface CreateAttackInput {
  session_id: string;
  project_id: string;
  name: string;
  description: string;
  category: AttackCategory;
  agent_type: string;
  target_component: string;
  target_code?: string;
  attack_vector: string;
  payloads?: AttackPayload[];
  prerequisites?: string[];
  expected_outcome: string;
  severity?: AttackSeverity;
  success_probability?: number;
  impact_score?: number;
}

export interface UpdateAttackInput {
  status?: AttackStatus;
  severity?: AttackSeverity;
  vulnerability_found?: boolean;
  actual_outcome?: string;
  error_message?: string;
  stack_trace?: string;
  evidence?: AttackEvidence[];
  execution_time_ms?: number;
}

// ============== Vulnerability Types ==============

export type VulnerabilityCategory =
  | 'injection'           // SQL, command, XSS
  | 'broken_auth'         // Authentication/authorization flaws
  | 'sensitive_exposure'  // Data leaks
  | 'xxe'                 // XML external entities
  | 'broken_access'       // Broken access control
  | 'misconfig'           // Security misconfiguration
  | 'xss'                 // Cross-site scripting
  | 'deserialization'     // Insecure deserialization
  | 'components'          // Vulnerable dependencies
  | 'logging'             // Insufficient logging
  | 'dos'                 // Denial of service
  | 'a11y'                // Accessibility failure
  | 'logic'               // Business logic flaw
  | 'race_condition';     // Concurrency issue

/**
 * Database model for discovered vulnerabilities
 */
export interface DbRedTeamVulnerability {
  id: string;
  session_id: string;
  attack_id: string | null;           // Attack that found it
  project_id: string;

  // Vulnerability definition
  title: string;
  description: string;
  category: VulnerabilityCategory;
  cwe_id: string | null;              // Common Weakness Enumeration ID
  owasp_category: string | null;      // OWASP Top 10 category

  // Location
  affected_component: string;
  affected_file: string | null;
  affected_lines: string | null;      // JSON: {start: number, end: number}
  code_snippet: string | null;

  // Severity assessment
  severity: AttackSeverity;
  cvss_score: number | null;          // 0-10 CVSS score
  exploitability: number;             // 1-10 how easy to exploit
  business_impact: number;            // 1-10 business impact

  // Reproduction
  reproduction_steps: string;         // JSON array of steps
  proof_of_concept: string | null;    // Code/payload to reproduce

  // Status
  status: 'open' | 'confirmed' | 'disputed' | 'fixed' | 'wont_fix' | 'false_positive';
  confirmed_by: string | null;        // JSON array of agent types that confirmed
  disputed_by: string | null;         // JSON array of agent types that disputed

  // Remediation
  remediation_suggestion: string | null;
  fix_effort: number | null;          // 1-10 effort to fix
  fix_priority: number | null;        // 1-10 priority

  // Metadata
  discovered_at: string;
  confirmed_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RedTeamVulnerability extends Omit<DbRedTeamVulnerability,
  'affected_lines' | 'reproduction_steps' | 'confirmed_by' | 'disputed_by'
> {
  affected_lines: { start: number; end: number } | null;
  reproduction_steps: string[];
  confirmed_by: string[];
  disputed_by: string[];
}

export interface CreateVulnerabilityInput {
  session_id: string;
  attack_id?: string;
  project_id: string;
  title: string;
  description: string;
  category: VulnerabilityCategory;
  cwe_id?: string;
  owasp_category?: string;
  affected_component: string;
  affected_file?: string;
  affected_lines?: { start: number; end: number };
  code_snippet?: string;
  severity: AttackSeverity;
  cvss_score?: number;
  exploitability?: number;
  business_impact?: number;
  reproduction_steps: string[];
  proof_of_concept?: string;
  remediation_suggestion?: string;
  fix_effort?: number;
  fix_priority?: number;
}

// ============== Red Team Session ==============

/**
 * Database model for a red team testing session
 */
export interface DbRedTeamSession {
  id: string;
  project_id: string;
  context_id: string | null;

  // Session definition
  name: string;
  description: string | null;
  target_scope: string;               // JSON array of target components/files
  attack_categories: string;          // JSON array of AttackCategory

  // Agent configuration
  participating_agents: string;       // JSON array of ScanType
  agent_roles: string;                // JSON map of ScanType -> RedTeamRole

  // Progress
  status: SessionStatus;
  current_phase: string | null;
  progress: number;                   // 0-100

  // Results summary
  total_attacks: number;
  successful_attacks: number;
  vulnerabilities_found: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;

  // Risk assessment
  overall_risk_score: number | null;  // 0-100 calculated risk
  risk_summary: string | null;

  // Token tracking
  input_tokens: number | null;
  output_tokens: number | null;

  // Metadata
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RedTeamSession extends Omit<DbRedTeamSession,
  'target_scope' | 'attack_categories' | 'participating_agents' | 'agent_roles'
> {
  target_scope: string[];
  attack_categories: AttackCategory[];
  participating_agents: ScanType[];
  agent_roles: Map<ScanType, RedTeamRole>;
}

export interface CreateSessionInput {
  project_id: string;
  context_id?: string;
  name: string;
  description?: string;
  target_scope: string[];
  attack_categories?: AttackCategory[];
  participating_agents?: ScanType[];
}

export interface UpdateSessionInput {
  status?: SessionStatus;
  current_phase?: string;
  progress?: number;
  total_attacks?: number;
  successful_attacks?: number;
  vulnerabilities_found?: number;
  critical_count?: number;
  high_count?: number;
  medium_count?: number;
  low_count?: number;
  overall_risk_score?: number;
  risk_summary?: string;
  input_tokens?: number;
  output_tokens?: number;
}

// ============== Parliament Debate for Red Team ==============

export type DebateOutcome =
  | 'vulnerability_confirmed'    // Agents agree it's a real vulnerability
  | 'vulnerability_disputed'     // Agents disagree on severity/validity
  | 'false_positive'            // Consensus that it's not a real issue
  | 'needs_more_evidence'       // Inconclusive, more testing needed
  | 'escalated';                // Sent to human for review

/**
 * Database model for vulnerability debates
 */
export interface DbVulnerabilityDebate {
  id: string;
  session_id: string;
  vulnerability_id: string;
  project_id: string;

  // Debate configuration
  participating_agents: string;       // JSON array of ScanType
  max_rounds: number;
  consensus_threshold: number;        // 0-1

  // Debate progress
  status: 'pending' | 'in_progress' | 'completed';
  current_round: number;
  turns: string;                      // JSON array of DebateTurn

  // Outcome
  outcome: DebateOutcome | null;
  consensus_level: number | null;     // 0-1 how much agents agreed
  final_severity: AttackSeverity | null;
  reasoning_summary: string | null;

  // Token tracking
  input_tokens: number | null;
  output_tokens: number | null;

  // Metadata
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VulnerabilityDebateTurn {
  id: string;
  round: number;
  agent_type: ScanType;
  role: RedTeamRole;
  action: 'argue' | 'counter' | 'concede' | 'validate' | 'dispute' | 'vote';
  content: string;
  severity_assessment?: AttackSeverity;
  confidence: number;                  // 0-100
  timestamp: string;
}

export interface VulnerabilityDebate extends Omit<DbVulnerabilityDebate,
  'participating_agents' | 'turns'
> {
  participating_agents: ScanType[];
  turns: VulnerabilityDebateTurn[];
}

export interface CreateDebateInput {
  session_id: string;
  vulnerability_id: string;
  project_id: string;
  participating_agents?: ScanType[];
  max_rounds?: number;
  consensus_threshold?: number;
}

// ============== Summary Types ==============

export interface RedTeamSummary {
  total_sessions: number;
  active_sessions: number;
  completed_sessions: number;

  total_attacks: number;
  successful_attacks: number;
  attack_success_rate: number;

  total_vulnerabilities: number;
  by_severity: Record<AttackSeverity, number>;
  by_category: Record<VulnerabilityCategory, number>;

  open_vulnerabilities: number;
  confirmed_vulnerabilities: number;
  fixed_vulnerabilities: number;

  average_risk_score: number;
  highest_risk_session_id: string | null;

  // Agent effectiveness
  agent_stats: Record<string, {
    attacks_planned: number;
    attacks_succeeded: number;
    vulnerabilities_found: number;
    success_rate: number;
  }>;
}

export interface SessionReport {
  session: RedTeamSession;
  attacks: RedTeamAttack[];
  vulnerabilities: RedTeamVulnerability[];
  debates: VulnerabilityDebate[];
  summary: {
    total_attacks: number;
    successful_attacks: number;
    attack_success_rate: number;
    vulnerabilities_by_severity: Record<AttackSeverity, number>;
    vulnerabilities_by_category: Record<VulnerabilityCategory, number>;
    overall_risk_score: number;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    top_recommendations: string[];
  };
}

// ============== AI Generation Types ==============

export interface AttackGenerationRequest {
  project_id: string;
  context_id?: string;
  target_files?: string[];
  attack_categories?: AttackCategory[];
  max_attacks?: number;
  agent_types?: ScanType[];
}

export interface GeneratedAttack {
  name: string;
  description: string;
  category: AttackCategory;
  agent_type: ScanType;
  target_component: string;
  target_code?: string;
  attack_vector: string;
  payloads: AttackPayload[];
  prerequisites: string[];
  expected_outcome: string;
  success_probability: number;
  impact_score: number;
  reasoning: string;
}

export interface VulnerabilityAnalysisRequest {
  project_id: string;
  code_content: string;
  file_path: string;
  attack_categories?: AttackCategory[];
}

export interface PredictedVulnerability {
  category: VulnerabilityCategory;
  title: string;
  description: string;
  severity: AttackSeverity;
  location: { start: number; end: number };
  confidence: number;
  attack_vector: string;
  remediation: string;
}

// ============== Default Configurations ==============

export const DEFAULT_RED_TEAM_CONFIG = {
  maxAttacksPerSession: 50,
  maxDebateRounds: 3,
  consensusThreshold: 0.7,
  defaultSeverity: 'medium' as AttackSeverity,
  defaultAgents: [
    'security_protector',
    'bug_hunter',
    'perf_optimizer'
  ] as ScanType[],
  defaultAttackCategories: [
    'security',
    'edge_case',
    'performance'
  ] as AttackCategory[],
};

export const ATTACK_CATEGORY_CONFIGS: Record<AttackCategory, {
  label: string;
  emoji: string;
  color: string;
  description: string;
}> = {
  security: {
    label: 'Security',
    emoji: '🔓',
    color: 'bg-gradient-to-r from-red-500/20 to-red-600/20 border-red-500/40 text-red-300',
    description: 'Security vulnerabilities and exploits'
  },
  performance: {
    label: 'Performance',
    emoji: '🐌',
    color: 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-500/40 text-yellow-300',
    description: 'Resource exhaustion and bottlenecks'
  },
  edge_case: {
    label: 'Edge Cases',
    emoji: '💥',
    color: 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-orange-500/40 text-orange-300',
    description: 'Crash-inducing edge cases'
  },
  state: {
    label: 'State',
    emoji: '🔄',
    color: 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 border-purple-500/40 text-purple-300',
    description: 'Invalid state transitions'
  },
  concurrency: {
    label: 'Concurrency',
    emoji: '⚡',
    color: 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 border-cyan-500/40 text-cyan-300',
    description: 'Race conditions and deadlocks'
  },
  input: {
    label: 'Input',
    emoji: '📥',
    color: 'bg-gradient-to-r from-green-500/20 to-green-600/20 border-green-500/40 text-green-300',
    description: 'Malformed input handling'
  },
  integration: {
    label: 'Integration',
    emoji: '🔗',
    color: 'bg-gradient-to-r from-pink-500/20 to-pink-600/20 border-pink-500/40 text-pink-300',
    description: 'Component boundary attacks'
  }
};

export const SEVERITY_CONFIGS: Record<AttackSeverity, {
  label: string;
  emoji: string;
  color: string;
  weight: number;
}> = {
  info: {
    label: 'Info',
    emoji: 'ℹ️',
    color: 'bg-slate-500/20 border-slate-500/40 text-slate-300',
    weight: 1
  },
  low: {
    label: 'Low',
    emoji: '🟢',
    color: 'bg-green-500/20 border-green-500/40 text-green-300',
    weight: 2
  },
  medium: {
    label: 'Medium',
    emoji: '🟡',
    color: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
    weight: 5
  },
  high: {
    label: 'High',
    emoji: '🟠',
    color: 'bg-orange-500/20 border-orange-500/40 text-orange-300',
    weight: 8
  },
  critical: {
    label: 'Critical',
    emoji: '🔴',
    color: 'bg-red-500/20 border-red-500/40 text-red-300',
    weight: 10
  }
};
