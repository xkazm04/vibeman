'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, RotateCcw, AlertCircle, CheckCircle, AlertTriangle, Zap, GitCommit, Upload, Layers } from 'lucide-react';
import { validateGitCommand, validateCommitMessageTemplate } from '@/app/features/TaskRunner/sub_Git/lib/gitConfigValidator';
import type { CLIGitConfig } from './store/cliSessionStore';

// Preset configurations
const PRESETS = {
  standard: {
    label: 'Standard',
    icon: GitCommit,
    description: 'add → commit → push',
    commands: ['git add .', 'git commit -m "{commitMessage}"', 'git push'],
  },
  commitOnly: {
    label: 'Local Only',
    icon: Layers,
    description: 'add → commit (no push)',
    commands: ['git add .', 'git commit -m "{commitMessage}"'],
  },
  squash: {
    label: 'Amend',
    icon: Zap,
    description: 'add → amend last commit',
    commands: ['git add .', 'git commit --amend --no-edit'],
  },
} as const;

type PresetKey = keyof typeof PRESETS;

interface CLIGitConfigPanelProps {
  config: CLIGitConfig | null;
  projectName?: string;
  onChange: (config: CLIGitConfig) => void;
  onClose?: () => void;
}

const DEFAULT_TEMPLATE = 'Auto-commit: {requirementName}';

export function CLIGitConfigPanel({
  config,
  projectName,
  onChange,
  onClose,
}: CLIGitConfigPanelProps) {
  const [localCommands, setLocalCommands] = useState<string[]>(
    config?.commands || [...PRESETS.standard.commands]
  );
  const [localTemplate, setLocalTemplate] = useState(
    config?.commitMessageTemplate || DEFAULT_TEMPLATE
  );
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);

  // Detect active preset
  useEffect(() => {
    const commandsStr = localCommands.join('|');
    for (const [key, preset] of Object.entries(PRESETS)) {
      if (preset.commands.join('|') === commandsStr) {
        setActivePreset(key as PresetKey);
        return;
      }
    }
    setActivePreset(null);
  }, [localCommands]);

  // Real-time validation
  const commandValidation = useMemo(() => {
    return localCommands.map((cmd, index) => validateGitCommand(cmd, index));
  }, [localCommands]);

  const templateValidation = useMemo(() => {
    return validateCommitMessageTemplate(localTemplate);
  }, [localTemplate]);

  const isConfigValid = useMemo(() => {
    const allCommandsValid = commandValidation.every(v => v.valid);
    return allCommandsValid && templateValidation.valid && localCommands.length > 0;
  }, [commandValidation, templateValidation, localCommands.length]);

  // Live preview
  const commitPreview = useMemo(() => {
    const exampleTask = 'add-user-authentication';
    return localTemplate
      .replace(/{requirementName}/g, exampleTask)
      .replace(/{projectName}/g, projectName || 'my-project')
      .replace(/{branch}/g, 'main');
  }, [localTemplate, projectName]);

  const handlePresetSelect = (presetKey: PresetKey) => {
    setLocalCommands([...PRESETS[presetKey].commands]);
  };

  const handleSave = () => {
    if (!isConfigValid) return;
    onChange({
      commands: localCommands.filter(cmd => cmd.trim() !== ''),
      commitMessageTemplate: localTemplate.trim(),
    });
    onClose?.();
  };

  const addCommand = () => setLocalCommands([...localCommands, '']);
  const removeCommand = (index: number) => setLocalCommands(localCommands.filter((_, i) => i !== index));
  const updateCommand = (index: number, value: string) => {
    const updated = [...localCommands];
    updated[index] = value;
    setLocalCommands(updated);
  };

  return (
    <div className="space-y-4 max-w-xl">
      {/* Project Context */}
      {projectName && (
        <div className="flex items-center gap-2 text-xs text-gray-400 pb-2 border-b border-gray-700/50">
          <span>Project:</span>
          <span className="text-gray-200 font-medium">{projectName}</span>
        </div>
      )}

      {/* Presets Row */}
      <div className="flex gap-2">
        {Object.entries(PRESETS).map(([key, preset]) => {
          const Icon = preset.icon;
          const isActive = activePreset === key;
          return (
            <button
              key={key}
              onClick={() => handlePresetSelect(key as PresetKey)}
              className={`flex-1 flex flex-col items-center gap-1 px-3 py-2 rounded-lg border transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/50 text-purple-300 shadow-sm shadow-purple-500/10'
                  : 'bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600 hover:text-gray-300 hover:bg-gray-800/70 active:scale-[0.98]'
              } focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-xs font-medium">{preset.label}</span>
              <span className="text-[10px] opacity-60">{preset.description}</span>
            </button>
          );
        })}
      </div>

      {/* Commit Template */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-gray-400">Commit Message</label>
          <div className="flex gap-1">
            {['{requirementName}', '{projectName}'].map(tag => (
              <button
                key={tag}
                onClick={() => setLocalTemplate(prev => prev + ' ' + tag)}
                className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded-md hover:bg-purple-500/20 transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        <div className="relative">
          <input
            type="text"
            value={localTemplate}
            onChange={(e) => setLocalTemplate(e.target.value)}
            placeholder={DEFAULT_TEMPLATE}
            className={`w-full px-3 py-1.5 pr-8 bg-gray-800/80 border rounded-md text-sm text-gray-200 placeholder-gray-500 focus:outline-none transition-all duration-200 ${
              !templateValidation.valid
                ? 'border-red-500/50 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
                : 'border-gray-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20'
            }`}
          />
          {localTemplate && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              {templateValidation.valid ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-500/70" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-red-500/70" />
              )}
            </div>
          )}
        </div>
        {/* Live Preview */}
        <div className="mt-1.5 px-2 py-1 bg-gray-900/70 rounded-md text-[10px] text-gray-500 font-mono truncate border border-gray-800/50">
          Preview: <span className="text-gray-300">{commitPreview}</span>
        </div>
      </div>

      {/* Commands */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-gray-400">Commands</label>
          <button
            onClick={() => handlePresetSelect('standard')}
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-purple-400 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            Reset
          </button>
        </div>

        <div className="space-y-1.5">
          {localCommands.map((cmd, index) => {
            const validation = commandValidation[index];
            const hasErrors = validation && !validation.valid;
            return (
              <div key={index} className="flex items-center gap-1.5">
                <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-medium transition-colors duration-200 ${
                  hasErrors
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-gray-800 text-gray-500 border border-gray-700/50'
                }`}>
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={cmd}
                  onChange={(e) => updateCommand(index, e.target.value)}
                  placeholder="git command..."
                  className={`flex-1 px-2 py-1 bg-gray-800/80 border rounded-md text-xs text-gray-200 font-mono placeholder-gray-600 focus:outline-none transition-all duration-200 ${
                    hasErrors
                      ? 'border-red-500/50 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
                      : 'border-gray-700/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20'
                  }`}
                />
                <button
                  onClick={() => removeCommand(index)}
                  className="p-1 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-all duration-200 hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={addCommand}
          className="mt-1.5 flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <Plus className="w-3 h-3" />
          Add command
        </button>
      </div>

      {/* Validation Errors */}
      {(!templateValidation.valid || commandValidation.some(v => !v.valid)) && (
        <div className="flex items-start gap-2 px-2 py-1.5 bg-gradient-to-r from-red-500/10 to-red-600/5 border border-red-500/20 rounded-md text-[10px] text-red-400">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5">
            {templateValidation.errors.map((err, i) => <div key={`t-${i}`}>{err}</div>)}
            {commandValidation.flatMap((v, i) =>
              v.errors.map((err, j) => <div key={`c-${i}-${j}`}>{err.replace(/^Command \d+: /, `Step ${i + 1}: `)}</div>)
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
        <div className="flex items-center gap-1.5 text-[10px]">
          {isConfigValid ? (
            <>
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span className="text-green-400">Valid</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3 text-red-500" />
              <span className="text-red-400">Fix errors</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1 text-xs text-gray-400 hover:text-gray-300 transition-all duration-200 hover:bg-gray-800/50 rounded active:scale-95"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isConfigValid}
            className={`px-3 py-1.5 text-xs rounded-md transition-all duration-200 font-medium ${
              isConfigValid
                ? 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-sm shadow-purple-500/20 hover:shadow-md hover:shadow-purple-500/30 active:scale-95'
                : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
            } focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50`}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
