/**
 * @module claudeCodeManager
 *
 * Unified entry point for managing Claude Code project folders, requirements,
 * logs, and execution.
 *
 * The implementation is split across focused sub-modules in
 * `sub_ClaudeCodeManager/`. This barrel file re-exports everything so
 * consumers can import from a single path:
 *
 * @example
 * ```ts
 * import {
 *   initializeClaudeFolder,
 *   createRequirement,
 *   executeRequirement,
 *   buildExecutionPrompt,
 * } from '@/app/Claude/lib/claudeCodeManager';
 * ```
 *
 * ### Sub-modules
 * | Module | Responsibility |
 * |--------|---------------|
 * | `folderManager` | `.claude/` folder CRUD, requirements, settings |
 * | `logManager` | Execution log directory and file paths |
 * | `executionManager` | Spawning Claude Code CLI sessions |
 * | `executionPrompt` | Building structured prompts for execution |
 */

// ── Folder management ────────────────────────────────────────────────

export {
  /** Shape of the `.claude/` folder tree. */
  type ClaudeFolderStructure,
  /** Persisted Claude settings (model, flags, etc.). */
  type ClaudeSettings,
  /** Returns the absolute path to a project's `.claude/` folder. */
  getClaudeFolderPath,
  /** Returns the full folder structure as a typed object. */
  getClaudeFolderStructure,
  /** Checks whether the `.claude/` folder exists on disk. */
  claudeFolderExists,
  /** Checks whether the folder has been initialized with required files. */
  isClaudeFolderInitialized,
  /** Creates and populates the `.claude/` folder for a project. */
  initializeClaudeFolder,
  /** Creates a new requirement markdown file. */
  createRequirement,
  /** Reads a requirement file by name. */
  readRequirement,
  /** Overwrites a requirement file's contents. */
  updateRequirement,
  /** Lists all requirement file names. */
  listRequirements,
  /** Deletes a requirement file. */
  deleteRequirement,
  /** Checks whether a requirement file exists. */
  requirementExists,
  /** Persists Claude settings to disk. */
  updateClaudeSettings,
  /** Reads persisted Claude settings. */
  readClaudeSettings,
  /** Creates the built-in context-scan requirement. */
  createContextScanRequirement,
  /** Creates the structure-rules reference file. */
  createStructureRulesFile,
  /** Copies bundled skill files into the project's `.claude/` folder. */
  copyDefaultSkills,
} from '../sub_ClaudeCodeManager/folderManager';

// ── Log management ───────────────────────────────────────────────────

export {
  /** Returns the directory where execution logs are stored. */
  getLogsDirectory,
  /** Returns the full path for a specific log file. */
  getLogFilePath,
} from '../sub_ClaudeCodeManager/logManager';

// ── Execution ────────────────────────────────────────────────────────

export {
  /** Spawns a Claude Code CLI session to execute a requirement. */
  executeRequirement,
  /** Git-related options passed to the execution runner. */
  type GitExecutionConfig,
  /** Session-level configuration (model, timeout, etc.). */
  type SessionConfig,
} from '../sub_ClaudeCodeManager/executionManager';

// ── Prompt building ──────────────────────────────────────────────────

export {
  /** Input configuration for building an execution prompt. */
  type ExecutionPromptConfig,
  /** Structured prompt output ready for the CLI. */
  type ExecutionPromptResult,
  /** Assembles a structured prompt from config, contexts, and constraints. */
  buildExecutionPrompt,
} from '../sub_ClaudeCodeManager/executionPrompt';
