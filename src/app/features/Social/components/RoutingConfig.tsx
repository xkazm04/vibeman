'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Power,
  PowerOff,
  GripVertical,
  Copy,
  RotateCcw,
  AlertCircle,
  Check,
  type LucideIcon,
} from 'lucide-react';
import type {
  RoutingRule,
  RoutingCondition,
  RoutingAction,
  RoutingConditionType,
  RoutingOperator,
} from '../lib/feedbackRouter';

interface RoutingConfigProps {
  rules: RoutingRule[];
  onSave: (rule: RoutingRule) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onResetDefaults?: () => void;
}

// Condition type options
const CONDITION_TYPES: Array<{ value: RoutingConditionType; label: string }> = [
  { value: 'classification', label: 'Classification' },
  { value: 'priority', label: 'Priority' },
  { value: 'channel', label: 'Channel' },
  { value: 'team', label: 'Team' },
  { value: 'sentiment', label: 'Sentiment Score' },
  { value: 'urgency', label: 'Urgency Level' },
  { value: 'confidence', label: 'Confidence' },
  { value: 'tag', label: 'Has Tag' },
  { value: 'keyword', label: 'Contains Keyword' },
  { value: 'author', label: 'Author Field' },
  { value: 'engagement', label: 'Engagement' },
];

// Operator options based on condition type
const OPERATORS_BY_TYPE: Record<RoutingConditionType, Array<{ value: RoutingOperator; label: string }>> = {
  classification: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'not equals' },
    { value: 'in', label: 'is one of' },
  ],
  priority: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'not equals' },
    { value: 'in', label: 'is one of' },
  ],
  channel: [
    { value: 'equals', label: 'equals' },
    { value: 'in', label: 'is one of' },
    { value: 'not_in', label: 'is not one of' },
  ],
  team: [
    { value: 'equals', label: 'equals' },
    { value: 'in', label: 'is one of' },
  ],
  sentiment: [
    { value: 'greater_than', label: 'greater than' },
    { value: 'less_than', label: 'less than' },
    { value: 'equals', label: 'equals' },
  ],
  urgency: [
    { value: 'equals', label: 'equals' },
    { value: 'in', label: 'is one of' },
  ],
  confidence: [
    { value: 'greater_than', label: 'greater than' },
    { value: 'less_than', label: 'less than' },
  ],
  tag: [
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
  ],
  keyword: [
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'matches', label: 'matches regex' },
  ],
  author: [
    { value: 'equals', label: 'equals' },
    { value: 'greater_than', label: 'greater than' },
    { value: 'less_than', label: 'less than' },
  ],
  engagement: [
    { value: 'greater_than', label: 'greater than' },
    { value: 'less_than', label: 'less than' },
  ],
  custom: [
    { value: 'equals', label: 'equals' },
    { value: 'matches', label: 'matches' },
  ],
};

// Action type options
const ACTION_TYPES: Array<{ value: string; label: string; requiresTarget: boolean }> = [
  { value: 'move_to_column', label: 'Move to Column', requiresTarget: true },
  { value: 'assign_team', label: 'Assign to Team', requiresTarget: true },
  { value: 'set_priority', label: 'Set Priority', requiresTarget: false },
  { value: 'add_tag', label: 'Add Tag', requiresTarget: false },
  { value: 'flag_for_review', label: 'Flag for Review', requiresTarget: false },
  { value: 'notify', label: 'Send Notification', requiresTarget: false },
];

export default function RoutingConfig({
  rules,
  onSave,
  onDelete,
  onToggle,
  onResetDefaults,
}: RoutingConfigProps) {
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [showNewRuleForm, setShowNewRuleForm] = useState(false);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedRules);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRules(newExpanded);
  };

  const handleEdit = (rule: RoutingRule) => {
    setEditingRule({ ...rule });
    setShowNewRuleForm(false);
  };

  const handleNewRule = () => {
    setEditingRule({
      id: `rule-${Date.now()}`,
      name: '',
      description: '',
      enabled: true,
      priority: 50,
      conditions: [],
      conditionLogic: 'and',
      actions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setShowNewRuleForm(true);
  };

  const handleSaveRule = () => {
    if (editingRule) {
      onSave(editingRule);
      setEditingRule(null);
      setShowNewRuleForm(false);
    }
  };

  const handleCancel = () => {
    setEditingRule(null);
    setShowNewRuleForm(false);
  };

  const handleDuplicate = (rule: RoutingRule) => {
    const newRule: RoutingRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      name: `${rule.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      matchCount: 0,
    };
    onSave(newRule);
  };

  // Sort rules by priority
  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-200">Routing Rules</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Define how feedback is automatically classified and routed
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onResetDefaults && (
            <button
              onClick={onResetDefaults}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset to Defaults
            </button>
          )}
          <button
            onClick={handleNewRule}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            <Plus className="w-3 h-3" />
            New Rule
          </button>
        </div>
      </div>

      {/* Rule Editor Modal/Form */}
      <AnimatePresence>
        {(editingRule || showNewRuleForm) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4"
          >
            <RuleEditor
              rule={editingRule!}
              onChange={setEditingRule}
              onSave={handleSaveRule}
              onCancel={handleCancel}
              isNew={showNewRuleForm}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules List */}
      <div className="space-y-2">
        {sortedRules.map((rule) => (
          <motion.div
            key={rule.id}
            layout
            className={`bg-gray-900/50 border rounded-lg overflow-hidden ${
              rule.enabled ? 'border-gray-800' : 'border-gray-800/50 opacity-60'
            }`}
          >
            {/* Rule Header */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-800/30 transition-colors"
              onClick={() => toggleExpand(rule.id)}
            >
              {/* Drag handle */}
              <GripVertical className="w-4 h-4 text-gray-600 cursor-grab" />

              {/* Expand icon */}
              <motion.div
                animate={{ rotate: expandedRules.has(rule.id) ? 90 : 0 }}
                className="text-gray-500"
              >
                <ChevronRight className="w-4 h-4" />
              </motion.div>

              {/* Rule info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200 truncate">
                    {rule.name}
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] rounded bg-gray-800 text-gray-400">
                    Priority {rule.priority}
                  </span>
                </div>
                {rule.description && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {rule.description}
                  </p>
                )}
              </div>

              {/* Stats */}
              {rule.matchCount !== undefined && rule.matchCount > 0 && (
                <span className="text-xs text-gray-500">
                  {rule.matchCount} matches
                </span>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onToggle(rule.id, !rule.enabled)}
                  className={`p-1.5 rounded transition-colors ${
                    rule.enabled
                      ? 'text-green-400 hover:bg-green-500/10'
                      : 'text-gray-500 hover:bg-gray-700'
                  }`}
                  title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                >
                  {rule.enabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleEdit(rule)}
                  className="p-1.5 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors"
                  title="Edit rule"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDuplicate(rule)}
                  className="p-1.5 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors"
                  title="Duplicate rule"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(rule.id)}
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                  title="Delete rule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
              {expandedRules.has(rule.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-800 overflow-hidden"
                >
                  <div className="px-4 py-3 space-y-3">
                    {/* Conditions */}
                    <div>
                      <div className="text-xs text-gray-400 mb-2">
                        Conditions ({rule.conditionLogic.toUpperCase()})
                      </div>
                      <div className="space-y-1">
                        {rule.conditions.map((condition, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs bg-gray-800/50 rounded px-2 py-1"
                          >
                            <span className="text-blue-400">{condition.type}</span>
                            {condition.field && (
                              <span className="text-gray-500">.{condition.field}</span>
                            )}
                            <span className="text-gray-400">{condition.operator}</span>
                            <span className="text-green-400">
                              {JSON.stringify(condition.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div>
                      <div className="text-xs text-gray-400 mb-2">Actions</div>
                      <div className="space-y-1">
                        {rule.actions.map((action, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs bg-gray-800/50 rounded px-2 py-1"
                          >
                            <span className="text-purple-400">{action.type}</span>
                            {action.target && (
                              <span className="text-gray-300">→ {action.target}</span>
                            )}
                            {action.value != null && (
                              <span className="text-yellow-400">
                                = {JSON.stringify(action.value)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {rules.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No routing rules configured</p>
            <p className="text-xs mt-1">Click "New Rule" to create one</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Rule editor component
 */
interface RuleEditorProps {
  rule: RoutingRule;
  onChange: (rule: RoutingRule) => void;
  onSave: () => void;
  onCancel: () => void;
  isNew: boolean;
}

function RuleEditor({ rule, onChange, onSave, onCancel, isNew }: RuleEditorProps) {
  const [errors, setErrors] = useState<string[]>([]);

  const updateRule = (updates: Partial<RoutingRule>) => {
    onChange({ ...rule, ...updates });
  };

  const addCondition = () => {
    const newCondition: RoutingCondition = {
      type: 'classification',
      operator: 'equals',
      value: '',
    };
    updateRule({ conditions: [...rule.conditions, newCondition] });
  };

  const updateCondition = (index: number, updates: Partial<RoutingCondition>) => {
    const newConditions = [...rule.conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    updateRule({ conditions: newConditions });
  };

  const removeCondition = (index: number) => {
    updateRule({ conditions: rule.conditions.filter((_, i) => i !== index) });
  };

  const addAction = () => {
    const newAction: RoutingAction = {
      type: 'add_tag',
      value: '',
    };
    updateRule({ actions: [...rule.actions, newAction] });
  };

  const updateAction = (index: number, updates: Partial<RoutingAction>) => {
    const newActions = [...rule.actions];
    newActions[index] = { ...newActions[index], ...updates };
    updateRule({ actions: newActions });
  };

  const removeAction = (index: number) => {
    updateRule({ actions: rule.actions.filter((_, i) => i !== index) });
  };

  const validate = () => {
    const errs: string[] = [];
    if (!rule.name.trim()) errs.push('Rule name is required');
    if (rule.conditions.length === 0) errs.push('At least one condition is required');
    if (rule.actions.length === 0) errs.push('At least one action is required');
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-200">
          {isNew ? 'New Rule' : 'Edit Rule'}
        </h4>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
          >
            <Save className="w-3 h-3" />
            Save Rule
          </button>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-400">{err}</p>
          ))}
        </div>
      )}

      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Name</label>
          <input
            type="text"
            value={rule.name}
            onChange={(e) => updateRule({ name: e.target.value })}
            className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:border-blue-500 focus:outline-none"
            placeholder="Rule name..."
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Priority (0-100)</label>
          <input
            type="number"
            value={rule.priority}
            onChange={(e) => updateRule({ priority: Number(e.target.value) })}
            min={0}
            max={100}
            className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
        <input
          type="text"
          value={rule.description || ''}
          onChange={(e) => updateRule({ description: e.target.value })}
          className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:border-blue-500 focus:outline-none"
          placeholder="What does this rule do?"
        />
      </div>

      {/* Conditions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-400">Conditions</label>
          <div className="flex items-center gap-2">
            <select
              value={rule.conditionLogic}
              onChange={(e) => updateRule({ conditionLogic: e.target.value as 'and' | 'or' })}
              className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300"
            >
              <option value="and">Match ALL</option>
              <option value="or">Match ANY</option>
            </select>
            <button
              onClick={addCondition}
              className="flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:text-blue-300"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {rule.conditions.map((condition, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-2">
              <select
                value={condition.type}
                onChange={(e) => updateCondition(i, { type: e.target.value as RoutingConditionType })}
                className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300"
              >
                {CONDITION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {(condition.type === 'author' || condition.type === 'engagement') && (
                <input
                  type="text"
                  value={condition.field || ''}
                  onChange={(e) => updateCondition(i, { field: e.target.value })}
                  placeholder="field"
                  className="w-24 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300"
                />
              )}
              <select
                value={condition.operator}
                onChange={(e) => updateCondition(i, { operator: e.target.value as RoutingOperator })}
                className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300"
              >
                {(OPERATORS_BY_TYPE[condition.type] || []).map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={typeof condition.value === 'string' ? condition.value : JSON.stringify(condition.value)}
                onChange={(e) => {
                  let val: unknown = e.target.value;
                  try {
                    val = JSON.parse(e.target.value);
                  } catch {
                    // Keep as string
                  }
                  updateCondition(i, { value: val });
                }}
                placeholder="value"
                className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300"
              />
              <button
                onClick={() => removeCondition(i)}
                className="p-1 text-gray-500 hover:text-red-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-gray-400">Actions</label>
          <button
            onClick={addAction}
            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-400 hover:text-blue-300"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>
        <div className="space-y-2">
          {rule.actions.map((action, i) => (
            <div key={i} className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-2">
              <select
                value={action.type}
                onChange={(e) => updateAction(i, { type: e.target.value as RoutingAction['type'] })}
                className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300"
              >
                {ACTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={action.target || (typeof action.value === 'string' ? action.value : '')}
                onChange={(e) => {
                  const actionConfig = ACTION_TYPES.find((t) => t.value === action.type);
                  if (actionConfig?.requiresTarget) {
                    updateAction(i, { target: e.target.value });
                  } else {
                    updateAction(i, { value: e.target.value });
                  }
                }}
                placeholder={ACTION_TYPES.find((t) => t.value === action.type)?.requiresTarget ? 'target' : 'value'}
                className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300"
              />
              <button
                onClick={() => removeAction(i)}
                className="p-1 text-gray-500 hover:text-red-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
