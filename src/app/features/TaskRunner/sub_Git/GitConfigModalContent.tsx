'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, RotateCcw } from 'lucide-react';
import { useGitConfig, GitConfig } from './useGitConfig';
import { ProjectOverviewItem } from '@/app/features/ProjectManager/types';

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
    setGitConfig({
      commands: localCommands,
      commitMessageTemplate: localTemplate
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
          <input
            type="text"
            value={localTemplate}
            onChange={(e) => setLocalTemplate(e.target.value)}
            placeholder="Auto-commit: {requirementName}"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <p className="text-sm text-gray-500 mt-1">
            Use <code className="text-purple-400">{'{requirementName}'}</code> and <code className="text-purple-400">{'{projectName}'}</code> as placeholders
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

          <div className="space-y-2">
            {localCommands.map((cmd, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 bg-gray-800 border border-gray-700 rounded text-sm text-gray-500">
                  {index + 1}
                </div>
                <input
                  type="text"
                  value={cmd}
                  onChange={(e) => updateCommand(index, e.target.value)}
                  placeholder="git command..."
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm"
                />
                <button
                  onClick={() => removeCommand(index)}
                  className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors text-gray-500"
                  title="Remove command"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addCommand}
            className="mt-2 flex items-center gap-2 px-3 py-2 text-sm text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Command
          </button>
        </div>

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
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors font-medium"
          >
            Save Configuration
          </button>
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
