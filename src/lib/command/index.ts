export {
  executeCommand,
  executeCommandWithTiming,
  executeCommandWithJsonOutput,
  CommandExecutionError,
  type CommandResult,
  type CommandOptions
} from './executeCommand';

export {
  escapeShellArg,
  escapeWindowsArg,
  escapeUnixArg,
  validateArgument,
  validateSafeArgument,
  validateBranchName,
  validateProjectName,
  validateCommitMessage,
  sanitizeFilePath,
  buildSafeArgs,
  validateArgs,
  type ValidationResult
} from './shellEscape';
