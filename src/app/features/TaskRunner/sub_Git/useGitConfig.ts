import { useState, useEffect } from 'react';

export interface GitConfig {
  commands: string[];
  commitMessageTemplate: string;
}

const DEFAULT_GIT_CONFIG: GitConfig = {
  commands: [
    'git add .',
    'git commit -m "{commitMessage}"',
    'git push'
  ],
  commitMessageTemplate: 'Auto-commit: {requirementName}'
};

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

  return {
    gitEnabled,
    setGitEnabled,
    gitConfig,
    setGitConfig,
  };
}
