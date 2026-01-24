'use client';

import { motion } from 'framer-motion';
import { X, Check, AlertCircle, Loader2 } from 'lucide-react';
import type { PromptTemplateVariable } from '@/app/db/models/types';

export interface GeneratorItem {
  id: string;
  variableValues: Record<string, string>;
  requirementName: string;
  status: 'idle' | 'generating' | 'success' | 'error';
  result?: string;
  error?: string;
}

interface GeneratorItemCardProps {
  item: GeneratorItem;
  index: number;
  variables: PromptTemplateVariable[];
  onUpdateVariable: (varName: string, value: string) => void;
  onUpdateName: (name: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const inputClass = 'w-full px-2 py-1.5 bg-gray-900/60 border border-gray-700/50 rounded-md text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-purple-500/50 transition-colors';

export function GeneratorItemCard({
  item,
  index,
  variables,
  onUpdateVariable,
  onUpdateName,
  onRemove,
  canRemove,
}: GeneratorItemCardProps) {
  const statusColors = {
    idle: 'border-gray-700/50',
    generating: 'border-purple-500/50',
    success: 'border-green-500/50',
    error: 'border-red-500/50',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15, delay: index * 0.03 }}
      className={`relative p-3 bg-gray-900/60 border ${statusColors[item.status]} rounded-lg space-y-2`}
    >
      {/* Header: Index + Status + Remove */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-mono">#{index + 1}</span>
          {item.status === 'success' && <Check className="w-3 h-3 text-green-400" />}
          {item.status === 'error' && <AlertCircle className="w-3 h-3 text-red-400" />}
          {item.status === 'generating' && <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />}
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            className="p-0.5 text-gray-500 hover:text-red-400 transition-colors"
            title="Remove item"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Variable inputs */}
      {variables.map((v) => (
        <div key={v.name} className="space-y-0.5">
          <label className="flex items-center gap-1 text-[10px] text-gray-500">
            <code className="text-purple-400">{v.name}</code>
            {v.required && <span className="text-red-400">*</span>}
          </label>
          {v.type === 'text' ? (
            <textarea
              value={item.variableValues[v.name] || ''}
              onChange={(e) => onUpdateVariable(v.name, e.target.value)}
              placeholder={v.default_value || v.name}
              rows={2}
              className={`${inputClass} resize-none`}
              disabled={item.status === 'generating'}
            />
          ) : v.type === 'boolean' ? (
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={item.variableValues[v.name] === 'true'}
                onChange={(e) => onUpdateVariable(v.name, e.target.checked ? 'true' : 'false')}
                className="w-3 h-3 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-0 focus:ring-offset-0"
                disabled={item.status === 'generating'}
              />
              <span className="text-xs text-gray-400">
                {item.variableValues[v.name] === 'true' ? 'Yes' : 'No'}
              </span>
            </label>
          ) : (
            <input
              type={v.type === 'number' ? 'number' : 'text'}
              value={item.variableValues[v.name] || ''}
              onChange={(e) => onUpdateVariable(v.name, e.target.value)}
              placeholder={v.default_value || v.name}
              className={inputClass}
              disabled={item.status === 'generating'}
            />
          )}
        </div>
      ))}

      {/* Requirement name */}
      <div className="space-y-0.5 pt-1.5 border-t border-gray-800/50">
        <label className="text-[10px] text-gray-500">Requirement Name</label>
        <input
          value={item.requirementName}
          onChange={(e) => onUpdateName(e.target.value)}
          placeholder="requirement-name"
          className={inputClass}
          disabled={item.status === 'generating'}
        />
      </div>

      {/* Result/Error message */}
      {item.result && (
        <p className="text-[10px] text-green-400 truncate" title={item.result}>
          {item.result}
        </p>
      )}
      {item.error && (
        <p className="text-[10px] text-red-400 truncate" title={item.error}>
          {item.error}
        </p>
      )}
    </motion.div>
  );
}
