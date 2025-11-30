'use client';

import { motion } from 'framer-motion';
import { Code2, Plus, Trash2 } from 'lucide-react';
import { TransformationRule } from '../../lib/dslTypes';

export interface DSLRulesListProps {
  rules: TransformationRule[];
  selectedRuleId: string | null;
  onSelectRule: (id: string) => void;
  onAddRule: () => void;
  onDeleteRule: (id: string) => void;
}

/**
 * DSLRulesList - Rules sidebar for the DSL Builder
 * 
 * Displays a list of transformation rules with:
 * - Add new rule button
 * - Selectable rule items
 * - Delete rule functionality
 * - Rule type and enabled status indicators
 */
export default function DSLRulesList({
  rules,
  selectedRuleId,
  onSelectRule,
  onAddRule,
  onDeleteRule,
}: DSLRulesListProps) {
  return (
    <div className="w-80 flex-shrink-0 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-white font-medium">Transformation Rules</h4>
        <button
          onClick={onAddRule}
          className="flex items-center gap-1 px-2 py-1 text-xs text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
          data-testid="add-rule-btn"
        >
          <Plus className="w-3 h-3" />
          Add Rule
        </button>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
        {rules.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <Code2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No rules yet</p>
            <p className="text-xs">Start from a template or add a custom rule</p>
          </div>
        ) : (
          rules.map((rule, index) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onSelectRule(rule.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedRuleId === rule.id
                  ? 'bg-cyan-500/10 border-cyan-500/30'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
              data-testid={`rule-item-${index}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-white text-sm font-medium truncate">
                  {rule.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRule(rule.id);
                  }}
                  className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                  data-testid={`delete-rule-${index}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="px-1.5 py-0.5 bg-black/30 rounded">{rule.type}</span>
                {rule.enabled === false && (
                  <span className="text-yellow-500">Disabled</span>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
