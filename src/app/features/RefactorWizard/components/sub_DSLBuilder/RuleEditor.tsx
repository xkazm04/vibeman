'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Code2,
  FileText,
  Target,
  Replace,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { CyberCard } from '@/components/ui/wizard';
import {
  TransformationRule,
  TransformationType,
  PatternConfig,
  ReplacementConfig,
  ValidationError,
} from '../../lib/dslTypes';

interface RuleEditorProps {
  rule: TransformationRule;
  onChange: (updates: Partial<TransformationRule>) => void;
  errors: ValidationError[];
}

const TRANSFORMATION_TYPES: { value: TransformationType; label: string; description: string }[] = [
  { value: 'find-replace', label: 'Find & Replace', description: 'Simple text replacement' },
  { value: 'regex-replace', label: 'Regex Replace', description: 'Regex-based replacement' },
  { value: 'ast-transform', label: 'AST Transform', description: 'AST-aware transformation' },
  { value: 'extract-component', label: 'Extract Component', description: 'Extract into new component' },
  { value: 'extract-hook', label: 'Extract Hook', description: 'Extract into custom hook' },
  { value: 'extract-utility', label: 'Extract Utility', description: 'Extract into utility function' },
  { value: 'inline', label: 'Inline', description: 'Inline function/component calls' },
  { value: 'move-file', label: 'Move File', description: 'Move file to new location' },
  { value: 'rename-export', label: 'Rename Export', description: 'Rename exported symbol' },
  { value: 'upgrade-syntax', label: 'Upgrade Syntax', description: 'Upgrade to newer syntax' },
  { value: 'migrate-import', label: 'Migrate Import', description: 'Change import paths' },
  { value: 'migrate-api', label: 'Migrate API', description: 'Update API usage patterns' },
  { value: 'add-type', label: 'Add Type', description: 'Add TypeScript types' },
  { value: 'add-error-handling', label: 'Add Error Handling', description: 'Wrap with try/catch' },
  { value: 'add-memoization', label: 'Add Memoization', description: 'Add useMemo/useCallback' },
  { value: 'remove-dead-code', label: 'Remove Dead Code', description: 'Remove unused code' },
  { value: 'consolidate', label: 'Consolidate', description: 'Merge duplicate code' },
  { value: 'custom', label: 'Custom', description: 'User-defined transformation' },
];

const PATTERN_TYPES = [
  { value: 'text', label: 'Text', description: 'Exact text match' },
  { value: 'regex', label: 'Regex', description: 'Regular expression' },
  { value: 'ast', label: 'AST', description: 'Abstract syntax tree pattern' },
  { value: 'semantic', label: 'Semantic', description: 'Semantic code pattern' },
];

const IMPACT_OPTIONS = [
  { value: 'low', label: 'Low', color: 'green' },
  { value: 'medium', label: 'Medium', color: 'yellow' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'critical', label: 'Critical', color: 'red' },
];

/**
 * RuleEditor - Edit a single transformation rule
 */
export default function RuleEditor({ rule, onChange, errors }: RuleEditorProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic', 'pattern', 'replacement'])
  );

  const toggleSection = (section: string) => {
    const newSections = new Set(expandedSections);
    if (newSections.has(section)) {
      newSections.delete(section);
    } else {
      newSections.add(section);
    }
    setExpandedSections(newSections);
  };

  const updatePattern = (updates: Partial<PatternConfig>) => {
    onChange({ pattern: { ...rule.pattern, ...updates } });
  };

  const updateReplacement = (updates: Partial<ReplacementConfig>) => {
    onChange({ replacement: { ...rule.replacement, ...updates } });
  };

  const getFieldError = (field: string): ValidationError | undefined => {
    return errors.find(e => e.path.endsWith(field));
  };

  const SectionHeader = ({ id, title, icon: Icon }: { id: string; title: string; icon: React.ComponentType<{ className?: string }> }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center gap-2 py-2 text-left text-white font-medium hover:text-cyan-400 transition-colors"
      data-testid={`section-toggle-${id}`}
    >
      {expandedSections.has(id) ? (
        <ChevronDown className="w-4 h-4" />
      ) : (
        <ChevronRight className="w-4 h-4" />
      )}
      <Icon className="w-4 h-4 text-cyan-400" />
      {title}
    </button>
  );

  return (
    <CyberCard variant="dark" data-testid="rule-editor">
      <div className="space-y-4">
        {/* Basic Info Section */}
        <div>
          <SectionHeader id="basic" title="Basic Info" icon={FileText} />
          {expandedSections.has('basic') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3 pl-6 pt-2"
            >
              {/* Name */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Rule Name</label>
                <input
                  type="text"
                  value={rule.name}
                  onChange={(e) => onChange({ name: e.target.value })}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none"
                  placeholder="Rule name"
                  data-testid="rule-name-input"
                />
                {getFieldError('name') && (
                  <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {getFieldError('name')?.message}
                  </span>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea
                  value={rule.description || ''}
                  onChange={(e) => onChange({ description: e.target.value })}
                  rows={2}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none resize-none"
                  placeholder="Describe what this rule does..."
                  data-testid="rule-description-input"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Transformation Type</label>
                <select
                  value={rule.type}
                  onChange={(e) => onChange({ type: e.target.value as TransformationType })}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none"
                  data-testid="rule-type-select"
                >
                  {TRANSFORMATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Enabled toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Enabled</span>
                <button
                  onClick={() => onChange({ enabled: rule.enabled === false ? true : false })}
                  className="text-cyan-400"
                  data-testid="rule-enabled-toggle"
                >
                  {rule.enabled !== false ? (
                    <ToggleRight className="w-8 h-8" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-500" />
                  )}
                </button>
              </div>

              {/* Impact */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Impact Level</label>
                <div className="flex gap-2">
                  {IMPACT_OPTIONS.map((impact) => (
                    <button
                      key={impact.value}
                      onClick={() => onChange({ impact: impact.value as 'low' | 'medium' | 'high' | 'critical' })}
                      className={`px-3 py-1 text-xs rounded-lg border transition-all ${
                        rule.impact === impact.value
                          ? `bg-${impact.color}-500/20 border-${impact.color}-500/40 text-${impact.color}-400`
                          : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                      data-testid={`impact-${impact.value}`}
                    >
                      {impact.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Pattern Section */}
        <div className="border-t border-white/5 pt-4">
          <SectionHeader id="pattern" title="Pattern Match" icon={Target} />
          {expandedSections.has('pattern') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3 pl-6 pt-2"
            >
              {/* Pattern type */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Pattern Type</label>
                <div className="flex gap-2">
                  {PATTERN_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => updatePattern({ type: type.value as PatternConfig['type'] })}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                        rule.pattern.type === type.value
                          ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                      data-testid={`pattern-type-${type.value}`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Match pattern */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Match Pattern</label>
                <textarea
                  value={rule.pattern.match}
                  onChange={(e) => updatePattern({ match: e.target.value })}
                  rows={3}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-cyan-500 focus:outline-none resize-none"
                  placeholder={
                    rule.pattern.type === 'regex'
                      ? 'e.g., console\\.log\\([^)]*\\)'
                      : rule.pattern.type === 'ast'
                      ? 'e.g., class $NAME extends Component'
                      : 'e.g., console.log'
                  }
                  data-testid="pattern-match-input"
                />
                {getFieldError('match') && (
                  <span className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {getFieldError('match')?.message}
                  </span>
                )}
              </div>

              {/* Case sensitive */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Case Sensitive</span>
                <button
                  onClick={() => updatePattern({ caseSensitive: !rule.pattern.caseSensitive })}
                  className="text-cyan-400"
                  data-testid="case-sensitive-toggle"
                >
                  {rule.pattern.caseSensitive !== false ? (
                    <ToggleRight className="w-8 h-8" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-500" />
                  )}
                </button>
              </div>

              {/* Whole word */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Whole Word Match</span>
                <button
                  onClick={() => updatePattern({ wholeWord: !rule.pattern.wholeWord })}
                  className="text-cyan-400"
                  data-testid="whole-word-toggle"
                >
                  {rule.pattern.wholeWord ? (
                    <ToggleRight className="w-8 h-8" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-500" />
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Replacement Section */}
        <div className="border-t border-white/5 pt-4">
          <SectionHeader id="replacement" title="Replacement" icon={Replace} />
          {expandedSections.has('replacement') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3 pl-6 pt-2"
            >
              {/* Template */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Replacement Template</label>
                <textarea
                  value={rule.replacement?.template || ''}
                  onChange={(e) => updateReplacement({ template: e.target.value })}
                  rows={3}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-cyan-500 focus:outline-none resize-none"
                  placeholder="Replacement template (use $1, $2 for capture groups)"
                  data-testid="replacement-template-input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use $1, $2, etc. for regex capture groups, or $NAME for AST patterns
                </p>
              </div>

              {/* Target path (for extract operations) */}
              {['extract-component', 'extract-hook', 'extract-utility', 'move-file'].includes(rule.type) && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Target Path</label>
                  <input
                    type="text"
                    value={rule.replacement?.targetPath || ''}
                    onChange={(e) => updateReplacement({ targetPath: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-cyan-500 focus:outline-none"
                    placeholder="e.g., src/hooks/useCustomHook.ts"
                    data-testid="target-path-input"
                  />
                </div>
              )}

              {/* New import (for migrate-import) */}
              {rule.type === 'migrate-import' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">New Import Path</label>
                  <input
                    type="text"
                    value={rule.replacement?.newImport || ''}
                    onChange={(e) => updateReplacement({ newImport: e.target.value })}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-cyan-500 focus:outline-none"
                    placeholder="e.g., @/lib/newLocation"
                    data-testid="new-import-input"
                  />
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Advanced Section */}
        <div className="border-t border-white/5 pt-4">
          <SectionHeader id="advanced" title="Advanced Options" icon={Code2} />
          {expandedSections.has('advanced') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3 pl-6 pt-2"
            >
              {/* Priority */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Priority (higher = runs first)
                </label>
                <input
                  type="number"
                  value={rule.priority || 0}
                  onChange={(e) => onChange({ priority: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={100}
                  className="w-24 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none"
                  data-testid="priority-input"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </CyberCard>
  );
}
