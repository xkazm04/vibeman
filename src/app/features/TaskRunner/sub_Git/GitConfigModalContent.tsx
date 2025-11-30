'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, RotateCcw, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { useGitConfig, GitConfig } from './useGitConfig';
import { validateGitCommand, validateCommitMessageTemplate } from './lib/gitConfigValidator';
import { ProjectOverviewItem } from '@/app/runner/types';

interface GitConfigModalContentProps {
  onClose: () => void;
}

const DEFAULT_CONFIG: GitConfig = {
  commands: [
    'git add .',
    'git commit -m "{commitMessage}"',
    'git push'
  ],
  commitMessageTemplate: 'Auto-commit: {requirementName}'
};

export default function GitConfigModalContent({ onClose }: GitConfigModalContentProps) {
  const { gitConfig, setGitConfig } = useGitConfig();
  const [localCommands, setLocalCommands] = useState<string[]>([]);
  const [localTemplate, setLocalTemplate] = useState('');
  const [projects, setProjects] = useState<ProjectOverviewItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    setLocalCommands([...gitConfig.commands]);
    setLocalTemplate(gitConfig.commitMessageTemplate);
  }, [gitConfig]);

  // Real-time validation for commands
  const commandValidation = useMemo(() => {
    return localCommands.map((cmd, index) => validateGitCommand(cmd, index));
  }, [localCommands]);

  // Real-time validation for template
  const templateValidation = useMemo(() => {
    return validateCommitMessageTemplate(localTemplate);
  }, [localTemplate]);

  // Overall validation status
  const isConfigValid = useMemo(() => {
    const allCommandsValid = commandValidation.every(v => v.valid);
    return allCommandsValid && templateValidation.valid;
  }, [commandValidation, templateValidation]);

  // Collect all warnings
  const allWarnings = useMemo(() => {
    const warnings: string[] = [];
    commandValidation.forEach(v => warnings.push(...v.warnings));
    warnings.push(...templateValidation.warnings);
    return warnings;
  }, [commandValidation, templateValidation]);

  useEffect(() => {
    // Fetch projects
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects');
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
        }
      } catch (error) {
        // Failed to fetch projects
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, []);

  const handleSave = () => {
    // Only save if configuration is valid
    if (!isConfigValid) {
      return;
    }

    setGitConfig({
      commands: localCommands.filter(cmd => cmd.trim() !== ''),
      commitMessageTemplate: localTemplate.trim()
    });
    onClose();
  };

  const handleReset = () => {
    setLocalCommands([...DEFAULT_CONFIG.commands]);
    setLocalTemplate(DEFAULT_CONFIG.commitMessageTemplate);
  };

  const addCommand = () => {
    setLocalCommands([...localCommands, '']);
  };

  const removeCommand = (index: number) => {
    setLocalCommands(localCommands.filter((_, i) => i !== index));
  };

  const updateCommand = (index: number, value: string) => {
    const updated = [...localCommands];
    updated[index] = value;
    setLocalCommands(updated);
  };

  return (
    <div className="flex gap-6">
      {/* Left Column - Git Configuration */}
      <div className="flex-1 space-y-6">
        {/* Subtitle */}
        <p className="text-sm text-gray-400">
          Configure git commands to run after successful requirement completion
        </p>

        {/* Commit Message Template */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Commit Message Template
          </label>
          <div className="relative">
            <input
              type="text"
              value={localTemplate}
              onChange={(e) => setLocalTemplate(e.target.value)}
              placeholder="Auto-commit: {requirementName}"
              data-testid="git-commit-message-template-input"
              className={`w-full px-3 py-2 pr-10 bg-gray-800 border rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none transition-colors ${
                !templateValidation.valid
                  ? 'border-red-500 focus:border-red-400'
                  : 'border-gray-700 focus:border-purple-500'
              }`}
            />
            {localTemplate && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {templateValidation.valid ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            )}
          </div>
          {templateValidation.errors.length > 0 && (
            <div className="mt-2 space-y-1">
              {templateValidation.errors.map((error, idx) => (
                <p key={idx} className="text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {error}
                </p>
              ))}
            </div>
          )}
          <p className="text-sm text-gray-500 mt-1">
            Use <code className="text-purple-400">{'{requirementName}'}</code>, <code className="text-purple-400">{'{projectName}'}</code>, or <code className="text-purple-400">{'{branch}'}</code> as placeholders
          </p>
        </div>

        {/* Git Commands */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-300">
              Git Commands (in order)
            </label>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2 py-1 text-sm text-gray-400 hover:text-purple-400 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset to defaults
            </button>
          </div>

          <div className="space-y-3">
            {localCommands.map((cmd, index) => {
              const validation = commandValidation[index];
              const hasErrors = validation && !validation.valid;
              const hasWarnings = validation && validation.warnings.length > 0;

              return (
                <div key={index} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className={`flex items-center justify-center w-6 h-6 border rounded text-sm ${
                      hasErrors
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : hasWarnings
                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                        : 'bg-gray-800 border-gray-700 text-gray-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={cmd}
                        onChange={(e) => updateCommand(index, e.target.value)}
                        placeholder="git command..."
                        data-testid={`git-command-input-${index}`}
                        className={`w-full px-3 py-2 pr-10 bg-gray-800 border rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none transition-colors font-mono text-sm ${
                          hasErrors
                            ? 'border-red-500 focus:border-red-400'
                            : 'border-gray-700 focus:border-purple-500'
                        }`}
                      />
                      {cmd && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {hasErrors ? (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          ) : hasWarnings ? (
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeCommand(index)}
                      className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors text-gray-500"
                      title="Remove command"
                      data-testid={`git-command-remove-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Display validation errors for this command */}
                  {hasErrors && validation.errors.map((error, errorIdx) => (
                    <p key={errorIdx} className="text-xs text-red-400 ml-8 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {error.replace(/^Command \d+: /, '')}
                    </p>
                  ))}
                </div>
              );
            })}
          </div>

          <button
            onClick={addCommand}
            className="mt-2 flex items-center gap-2 px-3 py-2 text-sm text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
            data-testid="git-add-command-btn"
          >
            <Plus className="w-4 h-4" />
            Add Command
          </button>
        </div>

        {/* Warnings Display */}
        {allWarnings.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Warnings
            </h3>
            <ul className="text-sm text-gray-400 space-y-1">
              {allWarnings.map((warning, idx) => (
                <li key={idx}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-400 mb-2">How it works</h3>
          <ul className="text-sm text-gray-400 space-y-1">
            <li>• Commands execute in order after successful requirement completion</li>
            <li>• Only runs if project has git_repository configured</li>
            <li>• Use <code className="text-purple-400">{'{commitMessage}'}</code> placeholder in commands</li>
            <li>• If any command fails, the process stops and error is shown</li>
          </ul>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-700">
          {/* Validation Status */}
          <div className="flex items-center gap-2">
            {isConfigValid ? (
              <span className="text-sm text-green-400 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Configuration valid
              </span>
            ) : (
              <span className="text-sm text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Fix errors to save
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
              data-testid="git-config-cancel-btn"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isConfigValid}
              className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
                isConfigValid
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
              data-testid="git-config-save-btn"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>

      {/* Right Column - Projects List */}
      <div className="w-60 border-l border-gray-700 pl-6">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Projects Git Status</h3>

        {loadingProjects ? (
          <div className="text-sm text-gray-500">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="text-sm text-gray-500">No projects found</div>
        ) : (
          <div className="space-y-3 max-h-[1200px] overflow-y-auto pr-2">
            {projects.map((project) => {
              const needsSetup = !project.git?.repository || !project.git?.branch;

              return (
                <div
                  key={project.id}
                  className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 space-y-2"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-500 truncate" title={project.name}>
                      {project.name}
                    </div>
                  </div>

                  <div>
                    {needsSetup ? (
                      <div className="text-sm italic text-red-600/70">NEED SETUP</div>
                    ) : (
                      <div className="text-sm text-gray-300 font-mono">
                        {project.git?.branch || 'main'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
