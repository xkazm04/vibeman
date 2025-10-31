'use client';

import { motion } from 'framer-motion';
import { Trash2, ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { StructureRule } from '@/app/api/structure-scan/structureTemplates';
import { StyledCheckbox } from '@/components/ui';

interface RuleEditorRowProps {
  rule: StructureRule;
  index: number;
  onUpdate: (rule: StructureRule) => void;
  onDelete: () => void;
}

export default function RuleEditorRow({ rule, index, onUpdate, onDelete }: RuleEditorRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localExamples, setLocalExamples] = useState<string[]>(rule.examples || []);
  const [newExample, setNewExample] = useState('');

  const handlePatternChange = (pattern: string) => {
    onUpdate({ ...rule, pattern });
  };

  const handleDescriptionChange = (description: string) => {
    onUpdate({ ...rule, description });
  };

  const handleRequiredChange = (required: boolean) => {
    onUpdate({ ...rule, required });
  };

  const handleContextChange = (context: boolean) => {
    onUpdate({ ...rule, context });
  };

  const handleAddExample = () => {
    if (newExample.trim()) {
      const updatedExamples = [...localExamples, newExample.trim()];
      setLocalExamples(updatedExamples);
      onUpdate({ ...rule, examples: updatedExamples });
      setNewExample('');
    }
  };

  const handleRemoveExample = (exampleIndex: number) => {
    const updatedExamples = localExamples.filter((_, i) => i !== exampleIndex);
    setLocalExamples(updatedExamples);
    onUpdate({ ...rule, examples: updatedExamples });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="relative bg-gray-800/40 border border-gray-700/50 rounded-lg overflow-hidden pl-10"
    >
      {/* Rule Number - Absolute Position */}
      <div className="absolute left-2 top-3 flex-shrink-0 w-6 h-6 bg-cyan-500/10 border border-cyan-500/30 rounded flex items-center justify-center text-xs font-mono text-cyan-400">
        {index + 1}
      </div>

      {/* Main Row */}
      <div className="py-2.5 pr-3">
        <div className="flex items-center gap-2">
          {/* Expand Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 hover:bg-gray-700/50 rounded transition-colors flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            )}
          </button>

          {/* Pattern Input */}
          <input
            type="text"
            value={rule.pattern}
            onChange={(e) => handlePatternChange(e.target.value)}
            placeholder="e.g., src/app/**"
            className="w-64 px-2 py-1.5 bg-gray-900/50 border border-gray-600/50 rounded text-xs text-white placeholder-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all font-mono"
          />

          {/* Description Input */}
          <input
            type="text"
            value={rule.description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Description..."
            className="flex-1 min-w-0 px-2 py-1.5 bg-gray-900/50 border border-gray-600/50 rounded text-xs text-gray-300 placeholder-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all"
          />

          {/* Required Checkbox */}
          <div className="flex-shrink-0">
            <StyledCheckbox
              checked={rule.required || false}
              onChange={handleRequiredChange}
              label="Required"
              size="sm"
              colorScheme="cyan"
            />
          </div>

          {/* Context Checkbox */}
          <div className="flex-shrink-0">
            <StyledCheckbox
              checked={rule.context || false}
              onChange={handleContextChange}
              label="Context"
              size="sm"
              colorScheme="purple"
              title="Mark as context definition for scripted scanning"
            />
          </div>

          {/* Examples Count Badge */}
          <div className="flex-shrink-0 px-2 py-1 bg-gray-900/50 border border-gray-600/50 rounded text-xs text-gray-500 min-w-[60px] text-center">
            {localExamples.length > 0 ? `${localExamples.length} ex.` : 'No ex.'}
          </div>

          {/* Delete Button */}
          <button
            onClick={onDelete}
            className="p-1 hover:bg-red-500/10 rounded transition-colors text-gray-400 hover:text-red-400 flex-shrink-0"
            title="Delete rule"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded Section - Examples */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-gray-700/50 bg-gray-900/30 px-3 py-3 ml-8"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-gray-400">Examples</h4>
              <span className="text-xs text-gray-500">Optional path examples</span>
            </div>

            {/* Example List */}
            <div className="space-y-1.5">
              {localExamples.map((example, exampleIndex) => (
                <motion.div
                  key={exampleIndex}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 group"
                >
                  <div className="flex-1 px-2 py-1 bg-gray-800/50 border border-gray-700/50 rounded text-xs text-gray-300 font-mono">
                    {example}
                  </div>
                  <button
                    onClick={() => handleRemoveExample(exampleIndex)}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded transition-all text-gray-400 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Add Example */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newExample}
                onChange={(e) => setNewExample(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddExample()}
                placeholder="e.g., src/app/page.tsx"
                className="flex-1 px-2 py-1.5 bg-gray-800/50 border border-gray-600/50 rounded text-xs text-white placeholder-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all font-mono"
              />
              <button
                onClick={handleAddExample}
                disabled={!newExample.trim()}
                className="px-2 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span className="text-xs">Add</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
