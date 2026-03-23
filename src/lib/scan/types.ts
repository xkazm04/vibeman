/**
 * Unified Scan Strategy Types
 *
 * Common interfaces and types for all scan operations:
 * - Agent-based scanning (Ideas with 19 personas)
 * - Structure/template validation
 * - File analysis and gathering
 */

// ─────────────────────────────────────────────────────────────────────────────
// Scan Organization
// ─────────────────────────────────────────────────────────────────────────────

export type ScanCategory = 'agent' | 'structure' | 'template' | 'blueprint';

export type ProjectType = 'nextjs' | 'fastapi' | 'django' | 'express' | 'generic';

export type SupportedProvider = 'openai' | 'anthropic' | 'groq' | 'ollama' | 'internal';

// ─────────────────────────────────────────────────────────────────────────────
// Scan Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface ScanConfig {
  // Project identification
  projectId: string;
  projectPath: string;
  projectType?: ProjectType;
  projectName?: string;

  // Scan type
  scanCategory: ScanCategory;

  // For agent scans
  scanType?: string; // E.g., 'zen_architect', 'bug_hunter', etc.

  // LLM provider selection
  provider?: SupportedProvider;

  // Optional filters
  contextId?: string;
  contextFilePaths?: string[];

  // Execution options
  maxConcurrent?: number;
  timeout?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// File Representation
// ─────────────────────────────────────────────────────────────────────────────

export interface CodebaseFile {
  path: string;              // Relative to projectPath
  content: string;           // File contents
  language?: string;         // Programming language (typescript, python, etc.)
  size: number;              // Bytes
  isGenerated?: boolean;      // Auto-generated files (node_modules, dist, etc.)
}

// ─────────────────────────────────────────────────────────────────────────────
// Scan Results
// ─────────────────────────────────────────────────────────────────────────────

export interface ScanMetadata {
  scanId: string;
  category: ScanCategory;
  startedAt: string;        // ISO timestamp
  completedAt: string;      // ISO timestamp
  duration: number;         // Ms
  fileCount: number;
  filesAnalyzed: number;
  provider?: string;
  agentType?: string;       // For agent scans
}

export interface ScanFinding {
  // Common fields
  id?: string;
  severity?: 'error' | 'warning' | 'info';

  // What was found
  title: string;
  description: string;
  impact?: 'low' | 'medium' | 'high';
  effort?: 'low' | 'medium' | 'high';

  // Where (optional)
  filePath?: string;
  lineNumber?: number;

  // Remediation
  suggestion?: string;
  examples?: string[];
}

export interface ScanResult {
  success: boolean;
  scanId: string;
  category: ScanCategory;

  // Results (polymorphic by category)
  findings: ScanFinding[];

  // Metadata
  metadata: ScanMetadata;

  // Error details (if failed)
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// File Gathering Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface FileGatherer {
  /**
   * Gather code files for scanning.
   * Implementations may use HTTP, filesystem, or other sources.
   */
  gather(
    config: ScanConfig,
    filters?: {
      extensions?: string[];      // E.g., ['.ts', '.tsx', '.py']
      exclude?: string[];          // Glob patterns to exclude
      maxFileSize?: number;        // Bytes
    }
  ): Promise<CodebaseFile[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scan Error
// ─────────────────────────────────────────────────────────────────────────────

export class ScanError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ScanError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress Events
// ─────────────────────────────────────────────────────────────────────────────

export type ScanEventType =
  | 'scan_started'
  | 'files_gathered'
  | 'analysis_started'
  | 'analysis_progress'
  | 'analysis_completed'
  | 'scan_completed'
  | 'scan_failed';

export interface ScanEvent {
  type: ScanEventType;
  scanId: string;
  timestamp: number;
  progress?: {
    current: number;
    total: number;
    message?: string;
  };
  data?: Record<string, unknown>;
}

export type ScanEventListener = (event: ScanEvent) => void;

// ─────────────────────────────────────────────────────────────────────────────
// Scan Repository Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface ScanRepository {
  /**
   * Save scan result to persistent storage.
   */
  save(result: ScanResult): Promise<void>;

  /**
   * Get scan result by ID.
   */
  getById(scanId: string): Promise<ScanResult | null>;

  /**
   * List recent scans for a project.
   */
  listByProject(projectId: string, limit?: number): Promise<ScanResult[]>;

  /**
   * Delete scan result.
   */
  delete(scanId: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scan Middleware
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mutable context passed through the middleware chain.
 * Each middleware can read/write fields relevant to its stage.
 */
export interface ScanContext {
  /** Scan configuration (immutable by convention) */
  readonly config: ScanConfig;

  /** Unique scan ID */
  scanId: string;

  /** Timestamp when the scan started */
  startTime: number;

  /** Files gathered from the codebase (populated by gather middleware) */
  files: CodebaseFile[];

  /** Findings from analysis (populated by analyze middleware) */
  findings: ScanFinding[];

  /** Final scan result (populated by result-building middleware) */
  result?: ScanResult;

  /** Event emitter callback */
  emitEvent: (event: ScanEvent) => void;

  /** Optional repository for persistence */
  repository?: ScanRepository;

  /** Timing data collected by timing middleware */
  timings: Record<string, number>;

  /** Arbitrary metadata for middleware to share state */
  extras: Record<string, unknown>;
}

/**
 * A single step in the scan pipeline.
 * Follows Express/Koa-style next() semantics — call next() to continue
 * the chain, or skip it to short-circuit.
 */
export interface ScanMiddleware {
  /** Human-readable name for logging/debugging */
  readonly name: string;

  /**
   * Execute this middleware step.
   * @param ctx - Shared mutable context
   * @param next - Call to invoke the next middleware in the chain
   */
  handle(ctx: ScanContext, next: () => Promise<void>): Promise<void>;
}
