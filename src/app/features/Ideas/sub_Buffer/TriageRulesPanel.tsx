'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  Plus,
  Trash2,
  Power,
  ChevronDown,
  ChevronRight,
  Zap,
  Eye,
  X,
} from 'lucide-react';
import type { DbTriageRule, TriageCondition, TriageAction, TriageConditionField, TriageConditionOperator } from '@/app/db/models/types';
import { useInvalidateIdeas } from '@/lib/queries/ideaQueries';

const FIELD_OPTIONS: { value: TriageConditionField; label: string }[] = [
  { value: 'impact', label: 'Impact' },
  { value: 'effort', label: 'Effort' },
  { value: 'risk', label: 'Risk' },
  { value: 'category', label: 'Category' },
  { value: 'scan_type', label: 'Scan Type' },
  { value: 'age_days', label: 'Age (days)' },
];

const OPERATOR_OPTIONS: { value: TriageConditionOperator; label: string }[] = [
  { value: 'gte', label: '>=' },
  { value: 'lte', label: '<=' },
  { value: 'eq', label: '=' },
  { value: 'neq', label: '!=' },
  { value: 'in', label: 'in' },
  { value: 'not_in', label: 'not in' },
];

const ACTION_OPTIONS: { value: TriageAction; label: string; color: string }[] = [
  { value: 'accept', label: 'Accept', color: 'text-emerald-400' },
  { value: 'reject', label: 'Reject', color: 'text-red-400' },
  { value: 'archive', label: 'Archive', color: 'text-amber-400' },
];

function getNumericOps(): TriageConditionOperator[] {
  return ['gte', 'lte', 'eq', 'neq'];
}

function isNumericField(field: TriageConditionField): boolean {
  return ['impact', 'effort', 'risk', 'age_days'].includes(field);
}

function parseConditions(json: string): TriageCondition[] {
  try {
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function conditionSummary(c: TriageCondition): string {
  const fieldLabel = FIELD_OPTIONS.find(f => f.value === c.field)?.label ?? c.field;
  const opLabel = OPERATOR_OPTIONS.find(o => o.value === c.operator)?.label ?? c.operator;
  const val = Array.isArray(c.value) ? c.value.join(', ') : String(c.value);
  return `${fieldLabel} ${opLabel} ${val}`;
}

interface TriageRulesPanelProps {
  projectId?: string;
}

export default function TriageRulesPanel({ projectId }: TriageRulesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rules, setRules] = useState<DbTriageRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const invalidateIdeas = useInvalidateIdeas();

  // Add form state
  const [formName, setFormName] = useState('');
  const [formAction, setFormAction] = useState<TriageAction>('accept');
  const [formConditions, setFormConditions] = useState<TriageCondition[]>([
    { field: 'impact', operator: 'gte', value: 8 },
  ]);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const params = projectId ? `?projectId=${projectId}` : '';
      const res = await fetch(`/api/triage-rules${params}`);
      const data = await res.json();
      if (data.success) setRules(data.rules);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen) fetchRules();
  }, [isOpen, fetchRules]);

  const handleToggleEnabled = useCallback(async (rule: DbTriageRule) => {
    try {
      await fetch('/api/triage-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
      });
      fetchRules();
    } catch {
      // Silently fail
    }
  }, [fetchRules]);

  const handleDelete = useCallback(async (ruleId: string) => {
    try {
      await fetch(`/api/triage-rules?id=${ruleId}`, { method: 'DELETE' });
      fetchRules();
    } catch {
      // Silently fail
    }
  }, [fetchRules]);

  const handleRunAll = useCallback(async () => {
    try {
      const res = await fetch('/api/triage-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'run',
          projectId: projectId !== 'all' ? projectId : undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.totalAffected > 0) {
        invalidateIdeas();
      }
      fetchRules();
    } catch {
      // Silently fail
    }
  }, [projectId, invalidateIdeas, fetchRules]);

  const handlePreview = useCallback(async () => {
    try {
      const res = await fetch('/api/triage-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: 'preview',
          projectId: projectId !== 'all' ? projectId : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const count = data.totalWouldAffect ?? 0;
        alert(`Preview: ${count} idea${count !== 1 ? 's' : ''} would be affected by enabled rules.`);
      }
    } catch {
      // Silently fail
    }
  }, [projectId]);

  const handleAddCondition = useCallback(() => {
    setFormConditions(prev => [...prev, { field: 'effort', operator: 'lte', value: 3 }]);
  }, []);

  const handleRemoveCondition = useCallback((idx: number) => {
    setFormConditions(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleConditionChange = useCallback(
    (idx: number, key: keyof TriageCondition, val: string | number | string[]) => {
      setFormConditions(prev =>
        prev.map((c, i) => {
          if (i !== idx) return c;
          const updated = { ...c, [key]: val };
          // Reset value when field changes
          if (key === 'field') {
            updated.value = isNumericField(val as TriageConditionField) ? 5 : '';
            updated.operator = isNumericField(val as TriageConditionField) ? 'gte' : 'eq';
          }
          return updated;
        })
      );
    },
    []
  );

  const handleCreateRule = useCallback(async () => {
    if (!formName.trim()) return;
    try {
      await fetch('/api/triage-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          action: formAction,
          conditions: formConditions,
          projectId: projectId !== 'all' ? projectId : undefined,
        }),
      });
      setShowAddForm(false);
      setFormName('');
      setFormAction('accept');
      setFormConditions([{ field: 'impact', operator: 'gte', value: 8 }]);
      fetchRules();
    } catch {
      // Silently fail
    }
  }, [formName, formAction, formConditions, projectId, fetchRules]);

  return (
    <div className="w-full">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-800/40 border border-gray-700/30 transition-colors"
      >
        <Filter className="w-3.5 h-3.5" />
        Triage Rules
        {rules.filter(r => r.enabled).length > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 font-mono">
            {rules.filter(r => r.enabled).length}
          </span>
        )}
        {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-4 bg-gray-900/60 border border-gray-700/40 rounded-xl space-y-3">
              {/* Actions bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowAddForm(prev => !prev)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Rule
                </button>
                {rules.length > 0 && (
                  <>
                    <button
                      onClick={handleRunAll}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 transition-colors"
                    >
                      <Zap className="w-3 h-3" />
                      Run All
                    </button>
                    <button
                      onClick={handlePreview}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-700/40 border border-gray-600/30 text-gray-300 hover:bg-gray-700/60 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      Preview
                    </button>
                  </>
                )}
              </div>

              {/* Add rule form */}
              <AnimatePresence>
                {showAddForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 bg-gray-800/50 border border-gray-700/30 rounded-lg space-y-3">
                      {/* Name */}
                      <input
                        type="text"
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                        placeholder="Rule name (e.g. Auto-accept high impact)"
                        className="w-full px-3 py-1.5 rounded-lg text-xs bg-gray-900/60 border border-gray-600/40 text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50"
                      />

                      {/* Action */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Action:</span>
                        {ACTION_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setFormAction(opt.value)}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              formAction === opt.value
                                ? `${opt.color} bg-gray-700/60 border border-gray-600/40`
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* Conditions */}
                      <div className="space-y-2">
                        <span className="text-xs text-gray-400">Conditions (all must match):</span>
                        {formConditions.map((cond, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            {/* Field */}
                            <select
                              value={cond.field}
                              onChange={e =>
                                handleConditionChange(idx, 'field', e.target.value)
                              }
                              className="px-2 py-1 rounded text-xs bg-gray-900/60 border border-gray-600/40 text-gray-200 focus:outline-none"
                            >
                              {FIELD_OPTIONS.map(f => (
                                <option key={f.value} value={f.value}>
                                  {f.label}
                                </option>
                              ))}
                            </select>

                            {/* Operator */}
                            <select
                              value={cond.operator}
                              onChange={e =>
                                handleConditionChange(idx, 'operator', e.target.value)
                              }
                              className="px-2 py-1 rounded text-xs bg-gray-900/60 border border-gray-600/40 text-gray-200 focus:outline-none"
                            >
                              {(isNumericField(cond.field)
                                ? OPERATOR_OPTIONS.filter(o => getNumericOps().includes(o.value))
                                : OPERATOR_OPTIONS
                              ).map(o => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>

                            {/* Value */}
                            {isNumericField(cond.field) ? (
                              <input
                                type="number"
                                value={typeof cond.value === 'number' ? cond.value : 0}
                                onChange={e =>
                                  handleConditionChange(idx, 'value', Number(e.target.value))
                                }
                                min={cond.field === 'age_days' ? 0 : 1}
                                max={cond.field === 'age_days' ? 365 : 10}
                                className="w-16 px-2 py-1 rounded text-xs bg-gray-900/60 border border-gray-600/40 text-gray-200 focus:outline-none"
                              />
                            ) : (
                              <input
                                type="text"
                                value={
                                  Array.isArray(cond.value)
                                    ? cond.value.join(', ')
                                    : String(cond.value ?? '')
                                }
                                onChange={e => {
                                  const v = e.target.value;
                                  if (['in', 'not_in'].includes(cond.operator)) {
                                    handleConditionChange(
                                      idx,
                                      'value',
                                      v.split(',').map(s => s.trim()).filter(Boolean)
                                    );
                                  } else {
                                    handleConditionChange(idx, 'value', v);
                                  }
                                }}
                                placeholder={
                                  ['in', 'not_in'].includes(cond.operator)
                                    ? 'val1, val2, ...'
                                    : 'value'
                                }
                                className="flex-1 px-2 py-1 rounded text-xs bg-gray-900/60 border border-gray-600/40 text-gray-200 placeholder:text-gray-500 focus:outline-none"
                              />
                            )}

                            {/* Remove condition */}
                            {formConditions.length > 1 && (
                              <button
                                onClick={() => handleRemoveCondition(idx)}
                                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={handleAddCondition}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          + Add condition
                        </button>
                      </div>

                      {/* Submit */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={handleCreateRule}
                          disabled={!formName.trim()}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 transition-colors disabled:opacity-40"
                        >
                          Create Rule
                        </button>
                        <button
                          onClick={() => setShowAddForm(false)}
                          className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Rules list */}
              {loading ? (
                <div className="text-xs text-gray-500 py-2">Loading rules...</div>
              ) : rules.length === 0 ? (
                <div className="text-xs text-gray-500 py-2">
                  No triage rules configured. Add rules to auto-accept, reject, or archive ideas matching your criteria.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {rules.map(rule => {
                    const conditions = parseConditions(rule.conditions);
                    const actionOpt = ACTION_OPTIONS.find(a => a.value === rule.action);
                    return (
                      <div
                        key={rule.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                          rule.enabled
                            ? 'bg-gray-800/40 border-gray-700/40'
                            : 'bg-gray-800/20 border-gray-700/20 opacity-50'
                        }`}
                      >
                        {/* Enable/disable toggle */}
                        <button
                          onClick={() => handleToggleEnabled(rule)}
                          className={`p-1 rounded transition-colors ${
                            rule.enabled
                              ? 'text-emerald-400 hover:text-emerald-300'
                              : 'text-gray-600 hover:text-gray-400'
                          }`}
                          title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                        >
                          <Power className="w-3 h-3" />
                        </button>

                        {/* Rule info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-gray-200 truncate">
                              {rule.name}
                            </span>
                            <span className={`text-[10px] font-mono ${actionOpt?.color ?? 'text-gray-400'}`}>
                              {rule.action}
                            </span>
                          </div>
                          <div className="text-[10px] text-gray-500 truncate">
                            {conditions.map(conditionSummary).join(' AND ')}
                          </div>
                        </div>

                        {/* Stats */}
                        {rule.times_fired > 0 && (
                          <span className="text-[10px] text-gray-500 font-mono tabular-nums flex-shrink-0">
                            {rule.times_fired}x
                          </span>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="p-1 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                          title="Delete rule"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
