'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FolderOpen,
  Plus,
  X,
  FileCode,
  Filter,
} from 'lucide-react';
import { CyberCard } from '@/components/ui/wizard';
import { ScopeConfig } from '../../lib/dslTypes';

interface ScopeEditorProps {
  scope: ScopeConfig;
  onChange: (scope: ScopeConfig) => void;
}

const FILE_TYPE_OPTIONS = [
  { value: 'tsx', label: 'TypeScript React', color: 'blue' },
  { value: 'ts', label: 'TypeScript', color: 'blue' },
  { value: 'jsx', label: 'JavaScript React', color: 'yellow' },
  { value: 'js', label: 'JavaScript', color: 'yellow' },
  { value: 'css', label: 'CSS', color: 'pink' },
  { value: 'scss', label: 'SCSS', color: 'pink' },
  { value: 'json', label: 'JSON', color: 'green' },
  { value: 'md', label: 'Markdown', color: 'gray' },
];

const COMMON_PATTERNS = {
  include: [
    { pattern: 'src/**/*.{ts,tsx}', label: 'All TypeScript files in src' },
    { pattern: 'src/components/**/*.tsx', label: 'Component files' },
    { pattern: 'src/hooks/**/*.ts', label: 'Hook files' },
    { pattern: 'src/lib/**/*.ts', label: 'Library files' },
    { pattern: 'src/app/**/*.tsx', label: 'App directory files' },
  ],
  exclude: [
    { pattern: 'node_modules/**', label: 'Node modules' },
    { pattern: '**/*.test.*', label: 'Test files' },
    { pattern: '**/*.spec.*', label: 'Spec files' },
    { pattern: '**/*.d.ts', label: 'Type declarations' },
    { pattern: 'dist/**', label: 'Build output' },
  ],
};

/**
 * ScopeEditor - Configure which files the transformations target
 */
export default function ScopeEditor({ scope, onChange }: ScopeEditorProps) {
  const [newInclude, setNewInclude] = useState('');
  const [newExclude, setNewExclude] = useState('');
  const [newModule, setNewModule] = useState('');

  const addPattern = (type: 'include' | 'exclude', pattern: string) => {
    if (!pattern.trim()) return;

    const current = type === 'include' ? scope.include : (scope.exclude || []);
    if (current.includes(pattern)) return;

    onChange({
      ...scope,
      [type]: [...current, pattern],
    });

    if (type === 'include') setNewInclude('');
    else setNewExclude('');
  };

  const removePattern = (type: 'include' | 'exclude', index: number) => {
    const current = type === 'include' ? scope.include : (scope.exclude || []);
    onChange({
      ...scope,
      [type]: current.filter((_, i) => i !== index),
    });
  };

  const toggleFileType = (fileType: string) => {
    const current = scope.fileTypes || [];
    const newTypes = current.includes(fileType as any)
      ? current.filter(t => t !== fileType)
      : [...current, fileType as any];
    onChange({ ...scope, fileTypes: newTypes });
  };

  const addModule = (module: string) => {
    if (!module.trim()) return;
    const current = scope.modules || [];
    if (current.includes(module)) return;
    onChange({ ...scope, modules: [...current, module] });
    setNewModule('');
  };

  const removeModule = (index: number) => {
    const current = scope.modules || [];
    onChange({ ...scope, modules: current.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      {/* Include Patterns */}
      <CyberCard variant="dark" data-testid="include-patterns-card">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-green-400" />
            <h4 className="text-white font-medium">Include Patterns</h4>
          </div>

          <p className="text-sm text-gray-400">
            Files matching these glob patterns will be processed
          </p>

          {/* Current patterns */}
          <div className="flex flex-wrap gap-2">
            {scope.include.map((pattern, index) => (
              <motion.span
                key={`${pattern}-${index}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded text-sm text-green-400 font-mono"
              >
                {pattern}
                <button
                  onClick={() => removePattern('include', index)}
                  className="p-0.5 hover:bg-green-500/20 rounded"
                  data-testid={`remove-include-${index}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.span>
            ))}
          </div>

          {/* Add new pattern */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newInclude}
              onChange={(e) => setNewInclude(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPattern('include', newInclude)}
              className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-green-500 focus:outline-none"
              placeholder="e.g., src/**/*.tsx"
              data-testid="new-include-input"
            />
            <button
              onClick={() => addPattern('include', newInclude)}
              className="px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
              data-testid="add-include-btn"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Quick add common patterns */}
          <div className="flex flex-wrap gap-1">
            {COMMON_PATTERNS.include.map(({ pattern, label }) => (
              <button
                key={pattern}
                onClick={() => addPattern('include', pattern)}
                disabled={scope.include.includes(pattern)}
                className="px-2 py-1 text-xs bg-white/5 border border-white/10 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title={label}
                data-testid={`quick-include-${pattern}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </CyberCard>

      {/* Exclude Patterns */}
      <CyberCard variant="dark" data-testid="exclude-patterns-card">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-red-400" />
            <h4 className="text-white font-medium">Exclude Patterns</h4>
          </div>

          <p className="text-sm text-gray-400">
            Files matching these patterns will be skipped
          </p>

          {/* Current patterns */}
          <div className="flex flex-wrap gap-2">
            {(scope.exclude || []).map((pattern, index) => (
              <motion.span
                key={`${pattern}-${index}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400 font-mono"
              >
                {pattern}
                <button
                  onClick={() => removePattern('exclude', index)}
                  className="p-0.5 hover:bg-red-500/20 rounded"
                  data-testid={`remove-exclude-${index}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.span>
            ))}
          </div>

          {/* Add new pattern */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newExclude}
              onChange={(e) => setNewExclude(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPattern('exclude', newExclude)}
              className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-red-500 focus:outline-none"
              placeholder="e.g., **/*.test.ts"
              data-testid="new-exclude-input"
            />
            <button
              onClick={() => addPattern('exclude', newExclude)}
              className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              data-testid="add-exclude-btn"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Quick add common patterns */}
          <div className="flex flex-wrap gap-1">
            {COMMON_PATTERNS.exclude.map(({ pattern, label }) => (
              <button
                key={pattern}
                onClick={() => addPattern('exclude', pattern)}
                disabled={(scope.exclude || []).includes(pattern)}
                className="px-2 py-1 text-xs bg-white/5 border border-white/10 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title={label}
                data-testid={`quick-exclude-${pattern}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </CyberCard>

      {/* File Types */}
      <CyberCard variant="dark" data-testid="file-types-card">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-cyan-400" />
            <h4 className="text-white font-medium">File Types</h4>
          </div>

          <p className="text-sm text-gray-400">
            Only process files of these types
          </p>

          <div className="flex flex-wrap gap-2">
            {FILE_TYPE_OPTIONS.map((type) => {
              const isSelected = (scope.fileTypes || []).includes(type.value as any);
              return (
                <button
                  key={type.value}
                  onClick={() => toggleFileType(type.value)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                    isSelected
                      ? `bg-${type.color}-500/20 border-${type.color}-500/40 text-${type.color}-400`
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                  data-testid={`file-type-${type.value}`}
                >
                  <span className="font-mono text-xs">.{type.value}</span>
                  <span className="text-xs">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </CyberCard>

      {/* Target Modules */}
      <CyberCard variant="dark" data-testid="modules-card">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-purple-400" />
            <h4 className="text-white font-medium">Target Modules (Optional)</h4>
          </div>

          <p className="text-sm text-gray-400">
            Limit transformations to specific directories/modules
          </p>

          {/* Current modules */}
          <div className="flex flex-wrap gap-2">
            {(scope.modules || []).map((module, index) => (
              <motion.span
                key={`${module}-${index}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 border border-purple-500/30 rounded text-sm text-purple-400 font-mono"
              >
                {module}
                <button
                  onClick={() => removeModule(index)}
                  className="p-0.5 hover:bg-purple-500/20 rounded"
                  data-testid={`remove-module-${index}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.span>
            ))}
          </div>

          {/* Add new module */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newModule}
              onChange={(e) => setNewModule(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addModule(newModule)}
              className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-purple-500 focus:outline-none"
              placeholder="e.g., src/components"
              data-testid="new-module-input"
            />
            <button
              onClick={() => addModule(newModule)}
              className="px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
              data-testid="add-module-btn"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CyberCard>
    </div>
  );
}
