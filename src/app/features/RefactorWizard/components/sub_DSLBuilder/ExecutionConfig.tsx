'use client';

import { motion } from 'framer-motion';
import {
  Play,
  Eye,
  Zap,
  TestTube,
  GitCommit,
  FileCode,
  Shield,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { CyberCard } from '@/components/ui/wizard';
import { ExecutionConfig as ExecutionConfigType, ValidationConfig, RefactorSpec } from '../../lib/dslTypes';

interface ExecutionConfigProps {
  execution: ExecutionConfigType | undefined;
  validation: ValidationConfig | undefined;
  onChange: (updates: Partial<RefactorSpec>) => void;
}

const EXECUTION_MODES = [
  {
    value: 'preview',
    label: 'Preview',
    icon: Eye,
    description: 'Show changes without applying them',
    color: 'blue',
  },
  {
    value: 'apply',
    label: 'Apply',
    icon: Play,
    description: 'Apply changes with manual confirmation',
    color: 'cyan',
  },
  {
    value: 'auto',
    label: 'Auto',
    icon: Zap,
    description: 'Automatically apply, test, and commit',
    color: 'yellow',
  },
];

/**
 * ExecutionConfig - Configure how transformations are executed
 */
export default function ExecutionConfig({ execution, validation, onChange }: ExecutionConfigProps) {
  const currentExecution = execution || {
    mode: 'preview' as const,
    runTestsAfterEach: false,
    commitAfterEach: false,
    typeCheck: true,
    lint: true,
    stopOnError: true,
    dryRun: true,
  };

  const currentValidation = validation || {
    runTests: true,
    runTypeCheck: true,
    runLint: true,
    runBuild: false,
  };

  const updateExecution = (updates: Partial<ExecutionConfigType>) => {
    onChange({ execution: { ...currentExecution, ...updates } });
  };

  const updateValidation = (updates: Partial<ValidationConfig>) => {
    onChange({ validation: { ...currentValidation, ...updates } });
  };

  const Toggle = ({ value, onToggle, label }: { value: boolean; onToggle: () => void; label: string }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-300">{label}</span>
      <button onClick={onToggle} data-testid={`toggle-${label.toLowerCase().replace(/\s/g, '-')}`}>
        {value ? (
          <ToggleRight className="w-8 h-8 text-cyan-400" />
        ) : (
          <ToggleLeft className="w-8 h-8 text-gray-500" />
        )}
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Execution Mode */}
      <CyberCard variant="dark" data-testid="execution-mode-card">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-cyan-400" />
            <h4 className="text-white font-medium">Execution Mode</h4>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {EXECUTION_MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = currentExecution.mode === mode.value;
              return (
                <button
                  key={mode.value}
                  onClick={() => updateExecution({ mode: mode.value as 'preview' | 'apply' | 'auto' })}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    isSelected
                      ? `bg-${mode.color}-500/10 border-${mode.color}-500/40`
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                  }`}
                  data-testid={`mode-${mode.value}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-5 h-5 ${isSelected ? `text-${mode.color}-400` : 'text-gray-400'}`} />
                    <span className={`font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                      {mode.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{mode.description}</p>
                </button>
              );
            })}
          </div>

          {currentExecution.mode === 'auto' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
            >
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-yellow-300 font-medium">Automatic Mode</p>
                <p className="text-yellow-400/70">
                  Changes will be applied, tested, and committed automatically.
                  Make sure to enable test validation to prevent breaking changes.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </CyberCard>

      {/* Execution Options */}
      <CyberCard variant="dark" data-testid="execution-options-card">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-400" />
            <h4 className="text-white font-medium">Execution Options</h4>
          </div>

          <div className="divide-y divide-white/5">
            <Toggle
              value={currentExecution.runTestsAfterEach || false}
              onToggle={() => updateExecution({ runTestsAfterEach: !currentExecution.runTestsAfterEach })}
              label="Run tests after each transformation"
            />

            <Toggle
              value={currentExecution.commitAfterEach || false}
              onToggle={() => updateExecution({ commitAfterEach: !currentExecution.commitAfterEach })}
              label="Commit after each transformation"
            />

            <Toggle
              value={currentExecution.typeCheck || false}
              onToggle={() => updateExecution({ typeCheck: !currentExecution.typeCheck })}
              label="Run TypeScript type checking"
            />

            <Toggle
              value={currentExecution.lint || false}
              onToggle={() => updateExecution({ lint: !currentExecution.lint })}
              label="Run ESLint"
            />

            <Toggle
              value={currentExecution.stopOnError || false}
              onToggle={() => updateExecution({ stopOnError: !currentExecution.stopOnError })}
              label="Stop on first error"
            />

            <Toggle
              value={currentExecution.dryRun || false}
              onToggle={() => updateExecution({ dryRun: !currentExecution.dryRun })}
              label="Dry run (no actual changes)"
            />
          </div>
        </div>
      </CyberCard>

      {/* Commit Template */}
      {currentExecution.commitAfterEach && (
        <CyberCard variant="dark" data-testid="commit-template-card">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <GitCommit className="w-5 h-5 text-green-400" />
              <h4 className="text-white font-medium">Commit Template</h4>
            </div>

            <input
              type="text"
              value={currentExecution.commitTemplate || 'refactor: {{ruleName}}'}
              onChange={(e) => updateExecution({ commitTemplate: e.target.value })}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-green-500 focus:outline-none"
              placeholder="e.g., refactor: {{ruleName}}"
              data-testid="commit-template-input"
            />

            <p className="text-xs text-gray-500">
              Available placeholders: {'{{ruleName}}'}, {'{{ruleId}}'}, {'{{filesChanged}}'}
            </p>
          </div>
        </CyberCard>
      )}

      {/* Validation Options */}
      <CyberCard variant="dark" data-testid="validation-options-card">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            <h4 className="text-white font-medium">Post-Execution Validation</h4>
          </div>

          <p className="text-sm text-gray-400">
            Run these checks after all transformations complete
          </p>

          <div className="divide-y divide-white/5">
            <Toggle
              value={currentValidation.runTests || false}
              onToggle={() => updateValidation({ runTests: !currentValidation.runTests })}
              label="Run test suite (npm test)"
            />

            <Toggle
              value={currentValidation.runTypeCheck || false}
              onToggle={() => updateValidation({ runTypeCheck: !currentValidation.runTypeCheck })}
              label="Run type checking (tsc --noEmit)"
            />

            <Toggle
              value={currentValidation.runLint || false}
              onToggle={() => updateValidation({ runLint: !currentValidation.runLint })}
              label="Run linting (eslint)"
            />

            <Toggle
              value={currentValidation.runBuild || false}
              onToggle={() => updateValidation({ runBuild: !currentValidation.runBuild })}
              label="Run production build (npm run build)"
            />
          </div>
        </div>
      </CyberCard>

      {/* Parallelism */}
      <CyberCard variant="dark" data-testid="parallelism-card">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-orange-400" />
            <h4 className="text-white font-medium">Parallelism</h4>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={8}
              value={currentExecution.parallelism || 1}
              onChange={(e) => updateExecution({ parallelism: parseInt(e.target.value) })}
              className="flex-1 accent-cyan-500"
              data-testid="parallelism-slider"
            />
            <span className="text-white font-mono w-8 text-center">
              {currentExecution.parallelism || 1}
            </span>
          </div>

          <p className="text-xs text-gray-500">
            Number of files to process in parallel (higher = faster but more resource-intensive)
          </p>
        </div>
      </CyberCard>
    </div>
  );
}
