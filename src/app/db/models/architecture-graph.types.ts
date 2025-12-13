/**
 * Living Architecture Evolution Graph - Database Types
 * Transforms CodeTree into a living architecture model with weighted dependency edges
 */

// Node types in the architecture graph
export type ArchitectureNodeType =
  | 'module'      // Folder/module level
  | 'component'   // React component
  | 'api_route'   // API endpoint
  | 'utility'     // Shared utility/lib
  | 'store'       // State management
  | 'hook'        // Custom hook
  | 'context'     // React context or business context
  | 'service'     // Service layer
  | 'repository'  // Data access layer
  | 'external'    // External dependency
  | 'config';     // Configuration file

// Edge weight types
export type DependencyWeight = 'required' | 'optional' | 'circular' | 'weak' | 'strong';

// Architecture drift severity
export type DriftSeverity = 'info' | 'warning' | 'critical';

// Refactoring action types
export type RefactoringActionType =
  | 'extract_module'
  | 'merge_modules'
  | 'break_circular'
  | 'move_to_layer'
  | 'introduce_interface'
  | 'remove_dependency'
  | 'consolidate_utilities';

/**
 * Architecture Node - represents a module/component in the codebase
 */
export interface DbArchitectureNode {
  id: string;
  project_id: string;
  path: string;                    // File or folder path
  name: string;                    // Display name
  node_type: ArchitectureNodeType;
  layer: string | null;            // Architecture layer (pages, client, server, external)
  context_group_id: string | null; // Link to context group
  // Metrics
  complexity_score: number;        // 0-100
  stability_score: number;         // 0-100 (how often it changes)
  coupling_score: number;          // 0-100 (how coupled to other modules)
  cohesion_score: number;          // 0-100 (internal cohesion)
  loc: number;                     // Lines of code
  // Counts
  incoming_count: number;          // Number of modules depending on this
  outgoing_count: number;          // Number of dependencies
  // Status
  is_active: number;               // Boolean flag (0 or 1) - still exists in codebase
  last_modified: string | null;    // Last file modification timestamp
  created_at: string;
  updated_at: string;
}

/**
 * Architecture Edge - represents a dependency between nodes
 */
export interface DbArchitectureEdge {
  id: string;
  project_id: string;
  source_node_id: string;          // Dependent module
  target_node_id: string;          // Dependency
  weight: DependencyWeight;
  // Edge metadata
  import_count: number;            // How many imports between these modules
  import_types: string;            // JSON array of import types (default, named, etc.)
  is_circular: number;             // Boolean flag (0 or 1) - part of circular dependency
  // Calculated
  strength: number;                // 0-100 dependency strength
  created_at: string;
  updated_at: string;
}

/**
 * Architecture Drift Alert - when architecture deviates from ideals
 */
export interface DbArchitectureDrift {
  id: string;
  project_id: string;
  node_id: string | null;          // Related node if applicable
  edge_id: string | null;          // Related edge if applicable
  drift_type: string;              // Type of drift detected
  severity: DriftSeverity;
  title: string;
  description: string;
  detected_pattern: string | null; // JSON describing the detected issue
  ideal_pattern: string | null;    // JSON describing the expected pattern
  // Status
  status: 'active' | 'acknowledged' | 'resolved' | 'ignored';
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * AI Refactoring Suggestion - proactive architecture improvement
 */
export interface DbArchitectureSuggestion {
  id: string;
  project_id: string;
  scan_id: string | null;          // Link to scan if generated during scan
  suggestion_type: RefactoringActionType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  reasoning: string | null;        // Why this suggestion
  // Affected entities
  affected_nodes: string;          // JSON array of node IDs
  affected_edges: string;          // JSON array of edge IDs
  // Predicted impact
  predicted_effort: number | null; // 1-10 scale
  predicted_impact: number | null; // 1-10 scale
  predicted_risk: number | null;   // 1-10 scale
  // Status
  status: 'pending' | 'accepted' | 'rejected' | 'implemented';
  user_feedback: string | null;
  implemented_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Architecture Ideal/Rule - defines expected architecture patterns
 */
export interface DbArchitectureIdeal {
  id: string;
  project_id: string;
  name: string;
  description: string;
  rule_type: 'layer_rule' | 'dependency_rule' | 'naming_rule' | 'structure_rule' | 'custom';
  // Rule definition
  rule_config: string;             // JSON rule configuration
  // Examples
  example_compliant: string | null;   // JSON example of compliant code
  example_violation: string | null;   // JSON example of violation
  // Status
  enabled: number;                 // Boolean flag (0 or 1)
  severity: DriftSeverity;         // How critical violations are
  // Stats
  violations_count: number;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Architecture Snapshot - historical point-in-time capture
 */
export interface DbArchitectureSnapshot {
  id: string;
  project_id: string;
  snapshot_type: 'manual' | 'scheduled' | 'before_refactor' | 'milestone';
  name: string;
  description: string | null;
  // Snapshot data
  nodes_count: number;
  edges_count: number;
  circular_count: number;
  avg_complexity: number;
  avg_coupling: number;
  graph_data: string;              // JSON of full graph state
  // Metadata
  git_commit: string | null;       // Git commit hash if available
  created_at: string;
}

// Helper types for JSON fields
export interface ImportTypeInfo {
  type: 'default' | 'named' | 'namespace' | 'side_effect';
  identifiers: string[];
}

export interface DetectedPattern {
  patternType: string;
  nodes: string[];
  edges: string[];
  description: string;
}

export interface IdealPattern {
  layerOrder?: string[];
  allowedDependencies?: Record<string, string[]>;
  forbiddenPatterns?: string[];
}

export interface ArchitectureRuleConfig {
  type: 'layer_rule' | 'dependency_rule' | 'naming_rule' | 'structure_rule' | 'custom';
  // Layer rules
  sourceLayer?: string;
  targetLayer?: string;
  allowed?: boolean;
  // Dependency rules
  maxIncoming?: number;
  maxOutgoing?: number;
  forbidCircular?: boolean;
  // Naming rules
  pattern?: string;
  scope?: string;
  // Custom
  customCheck?: string;
}

export interface GraphSnapshotData {
  nodes: Array<{
    id: string;
    path: string;
    name: string;
    nodeType: ArchitectureNodeType;
    layer: string | null;
    metrics: {
      complexity: number;
      stability: number;
      coupling: number;
      cohesion: number;
      loc: number;
    };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    weight: DependencyWeight;
    strength: number;
    isCircular: boolean;
  }>;
  summary: {
    totalNodes: number;
    totalEdges: number;
    circularDependencies: number;
    avgComplexity: number;
    avgCoupling: number;
    layerDistribution: Record<string, number>;
  };
}
