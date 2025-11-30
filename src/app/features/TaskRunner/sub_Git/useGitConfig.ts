import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  validateGitConfig,
  validateGitCommand,
  validateCommitMessageTemplate,
  GitValidationReport,
  GitValidationResult,
  createGitConfigStateMachine,
  GitConfigState,
} from './lib/gitConfigValidator';

export interface GitConfig {
  commands: string[];
  commitMessageTemplate: string;
}

export interface GitConfigValidation {
  isValid: boolean;
  report: GitValidationReport | null;
  commandErrors: Map<number, string[]>;
  templateErrors: string[];
  warnings: string[];
}

const DEFAULT_GIT_CONFIG: GitConfig = {
  commands: [
    'git add .',
    'git commit -m "{commitMessage}"',
    'git push'
  ],
  commitMessageTemplate: 'Auto-commit: {requirementName}'
};

/**
 * Hook for managing git configuration with validation
 */
export function useGitConfig() {
  const [gitEnabled, setGitEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('taskRunner_gitEnabled');
      return stored === 'true';
    }
    return false;
  });

  const [gitConfig, setGitConfig] = useState<GitConfig>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('taskRunner_gitConfig');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return DEFAULT_GIT_CONFIG;
        }
      }
    }
    return DEFAULT_GIT_CONFIG;
  });

  // State machine for tracking git operation state
  const [gitState, setGitState] = useState<GitConfigState>(() =>
    gitEnabled ? 'enabled' : 'disabled'
  );

  // Validation state
  const [validation, setValidation] = useState<GitConfigValidation>({
    isValid: true,
    report: null,
    commandErrors: new Map(),
    templateErrors: [],
    warnings: [],
  });

  // Validate configuration whenever it changes
  useEffect(() => {
    const report = validateGitConfig({
      commands: gitConfig.commands,
      commitMessageTemplate: gitConfig.commitMessageTemplate,
    });

    // Build command-specific error map
    const commandErrors = new Map<number, string[]>();
    gitConfig.commands.forEach((cmd, index) => {
      const cmdResult = validateGitCommand(cmd, index);
      if (!cmdResult.valid) {
        commandErrors.set(index, cmdResult.errors);
      }
    });

    // Get template-specific errors
    const templateResult = validateCommitMessageTemplate(gitConfig.commitMessageTemplate);

    setValidation({
      isValid: report.valid,
      report,
      commandErrors,
      templateErrors: templateResult.errors,
      warnings: report.warnings,
    });
  }, [gitConfig]);

  // Sync git state with enabled flag
  useEffect(() => {
    setGitState(gitEnabled ? 'enabled' : 'disabled');
  }, [gitEnabled]);

  // Persist git enabled state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('taskRunner_gitEnabled', gitEnabled.toString());
    }
  }, [gitEnabled]);

  // Persist git config
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('taskRunner_gitConfig', JSON.stringify(gitConfig));
    }
  }, [gitConfig]);

  /**
   * Validate a single command without updating state
   */
  const validateCommand = useCallback((command: string, index: number): GitValidationResult => {
    return validateGitCommand(command, index);
  }, []);

  /**
   * Validate the commit message template without updating state
   */
  const validateTemplate = useCallback((template: string): GitValidationResult => {
    return validateCommitMessageTemplate(template);
  }, []);

  /**
   * Update git config with validation
   * Returns validation result for immediate feedback
   */
  const setGitConfigWithValidation = useCallback((config: GitConfig): GitValidationReport => {
    const report = validateGitConfig({
      commands: config.commands,
      commitMessageTemplate: config.commitMessageTemplate,
    });

    // Only update if valid, or always update and let UI show errors
    setGitConfig(config);

    return report;
  }, []);

  /**
   * Check if the current configuration is valid for execution
   */
  const isReadyForExecution = useMemo(() => {
    return gitEnabled && validation.isValid && gitConfig.commands.length > 0;
  }, [gitEnabled, validation.isValid, gitConfig.commands.length]);

  /**
   * Transition git state (for tracking execution status)
   */
  const transitionState = useCallback((to: GitConfigState) => {
    setGitState(to);
  }, []);

  return {
    // Core state
    gitEnabled,
    setGitEnabled,
    gitConfig,
    setGitConfig,

    // Validation
    validation,
    validateCommand,
    validateTemplate,
    setGitConfigWithValidation,
    isReadyForExecution,

    // State machine
    gitState,
    transitionState,

    // Default config for reset
    DEFAULT_GIT_CONFIG,
  };
}

/**
 * Export validation types and utilities for external use
 */
export type { GitValidationReport, GitValidationResult, GitConfigState };
export { validateGitConfig, validateGitCommand, validateCommitMessageTemplate } from './lib/gitConfigValidator';
