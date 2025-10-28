/**
 * Claude Code Manager - Main Entry Point
 *
 * This module has been refactored into smaller, focused modules in sub_ClaudeCodeManager/
 * All exports are re-exported here for backward compatibility
 */

// Re-export folder management functions
export {
  type ClaudeFolderStructure,
  type ClaudeSettings,
  getClaudeFolderPath,
  getClaudeFolderStructure,
  claudeFolderExists,
  isClaudeFolderInitialized,
  initializeClaudeFolder,
  createRequirement,
  readRequirement,
  listRequirements,
  deleteRequirement,
  updateClaudeSettings,
  readClaudeSettings,
  createContextScanRequirement,
  createStructureRulesFile,
} from '../sub_ClaudeCodeManager/folderManager';

// Re-export log management functions
export {
  getLogsDirectory,
  getLogFilePath,
} from '../sub_ClaudeCodeManager/logManager';

// Re-export execution functions
export {
  executeRequirement,
} from '../sub_ClaudeCodeManager/executionManager';

// Re-export execution prompt utilities
export {
  type ExecutionPromptConfig,
  buildExecutionPrompt,
} from '../sub_ClaudeCodeManager/executionPrompt';
