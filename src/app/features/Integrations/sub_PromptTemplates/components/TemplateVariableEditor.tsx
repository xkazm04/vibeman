'use client';

/**
 * TemplateVariableEditor
 * Compact inline editor for template variables
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Variable, Plus, X, Sparkles, ChevronDown } from 'lucide-react';
import type { PromptTemplateVariable } from '@/app/db/models/types';

interface TemplateVariableEditorProps {
  variables: PromptTemplateVariable[];
  templateContent: string;
  onChange: (variables: PromptTemplateVariable[]) => void;
  disabled?: boolean;
}

export function TemplateVariableEditor({
  variables,
  templateContent,
  onChange,
  disabled = false,
}: TemplateVariableEditorProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  // Detect variables from content
  const detectedVariables = useMemo(() => {
    const matches = templateContent.match(/\{\{([^}]+)\}\}/g) || [];
    return [...new Set(matches.map((m) => m.slice(2, -2).trim()))];
  }, [templateContent]);

  // Count unsynced variables
  const existingNames = new Set(variables.map((v) => v.name));
  const newDetectedCount = detectedVariables.filter((name) => !existingNames.has(name)).length;

  // Auto-detect and sync variables
  const handleAutoDetect = () => {
    const newVariables = detectedVariables
      .filter((name) => !existingNames.has(name))
      .map((name) => ({
        name,
        type: 'string' as const,
        required: true,
      }));
    onChange([...variables, ...newVariables]);
  };

  // Update a single variable
  const updateVariable = (index: number, updates: Partial<PromptTemplateVariable>) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  // Remove a variable
  const removeVariable = (index: number) => {
    onChange(variables.filter((_, i) => i !== index));
  };

  // Add a new variable
  const addVariable = (name: string) => {
    const normalizedName = name.trim().toUpperCase().replace(/\s+/g, '_');
    if (normalizedName && !existingNames.has(normalizedName)) {
      onChange([
        ...variables,
        {
          name: normalizedName,
          type: 'string',
          required: true,
        },
      ]);
    }
    setShowAddForm(false);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
          <Variable className="w-4 h-4" />
          <span>Variables ({variables.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {newDetectedCount > 0 && (
            <button
              type="button"
              onClick={handleAutoDetect}
              disabled={disabled}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3" />
              Detect ({newDetectedCount})
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            disabled={disabled}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-gray-700/50 text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
      </div>

      {/* Variables List */}
      <div className="space-y-2">
        {variables.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-3 bg-gray-800/30 rounded-lg">
            No variables defined. Use {'{{VARIABLE_NAME}}'} in template.
          </p>
        ) : (
          <div className="grid gap-2">
            {variables.map((variable, index) => (
              <VariableRow
                key={variable.name}
                variable={variable}
                onChange={(updates) => updateVariable(index, updates)}
                onRemove={() => removeVariable(index)}
                disabled={disabled}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Variable Form */}
      <AnimatePresence>
        {showAddForm && (
          <AddVariableForm
            existingNames={existingNames}
            onAdd={addVariable}
            onCancel={() => setShowAddForm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Individual variable row
function VariableRow({
  variable,
  onChange,
  onRemove,
  disabled,
}: {
  variable: PromptTemplateVariable;
  onChange: (updates: Partial<PromptTemplateVariable>) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-800/40 rounded-lg border border-gray-700/50">
      {/* Variable name */}
      <code className="text-xs font-mono text-purple-400 bg-gray-900/50 px-2 py-0.5 rounded min-w-[100px]">
        {'{{'}{variable.name}{'}}'}
      </code>

      {/* Type selector */}
      <div className="relative">
        <select
          value={variable.type}
          onChange={(e) => onChange({ type: e.target.value as PromptTemplateVariable['type'] })}
          disabled={disabled}
          className="text-xs bg-gray-700/50 border border-gray-600/50 rounded px-2 py-1 text-gray-300 appearance-none pr-6 cursor-pointer disabled:opacity-50"
        >
          <option value="string">String</option>
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
        </select>
        <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>

      {/* Required checkbox */}
      <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
        <input
          type="checkbox"
          checked={variable.required}
          onChange={(e) => onChange({ required: e.target.checked })}
          disabled={disabled}
          className="w-3 h-3 rounded border-gray-600 bg-gray-700 text-purple-500"
        />
        Req
      </label>

      {/* Default value */}
      <input
        type="text"
        value={variable.default_value || ''}
        onChange={(e) => onChange({ default_value: e.target.value || undefined })}
        placeholder="Default"
        disabled={disabled}
        className="flex-1 text-xs bg-gray-700/30 border border-gray-600/50 rounded px-2 py-1 text-gray-300 placeholder-gray-500 min-w-[80px] disabled:opacity-50"
      />

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="p-1 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Add variable form
function AddVariableForm({
  existingNames,
  onAdd,
  onCancel,
}: {
  existingNames: Set<string>;
  onAdd: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const normalizedName = name.trim().toUpperCase().replace(/\s+/g, '_');
  const isDuplicate = existingNames.has(normalizedName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (normalizedName && !isDuplicate) {
      onAdd(normalizedName);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      onSubmit={handleSubmit}
      className="flex items-center gap-2 p-2 bg-gray-700/30 rounded-lg border border-gray-600/50"
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="VARIABLE_NAME"
        autoFocus
        className="flex-1 text-xs bg-gray-800/50 border border-gray-600/50 rounded px-2 py-1.5 text-gray-300 placeholder-gray-500 font-mono uppercase"
      />
      {isDuplicate && (
        <span className="text-xs text-red-400">Exists</span>
      )}
      <button
        type="submit"
        disabled={!normalizedName || isDuplicate}
        className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors disabled:opacity-50"
      >
        Add
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
      >
        Cancel
      </button>
    </motion.form>
  );
}
