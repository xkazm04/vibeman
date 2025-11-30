export { default as GitControl } from './GitControl';
export { default as GitConfigModalContent } from './GitConfigModalContent';
export { useGitConfig } from './useGitConfig';
export { executeGitOperations, generateCommitMessage } from './gitApi';
export type { GitConfig, GitConfigValidation, GitValidationReport, GitValidationResult, GitConfigState } from './useGitConfig';

// Export validation utilities for external use
export {
  validateGitConfig,
  validateGitCommand,
  validateCommitMessageTemplate,
  validateStateTransition,
  createGitConfigStateMachine,
  GitConfigValidationError,
  ALLOWED_GIT_COMMANDS,
  VALID_TEMPLATE_VARIABLES,
} from './lib/gitConfigValidator';
export type { ValidatedGitConfig, RawGitConfig } from './lib/gitConfigValidator';
