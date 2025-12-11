/**
 * Conditional Branch Editor
 * Allows creation of conditional execution trees based on event conditions
 */

'use client';

import React from 'react';
import { GitBranch, Plus, Trash2, Check, X } from 'lucide-react';
import { ConditionalBranch, ConditionCheckType } from '../types/chainTypes';
import { BlueprintComposition } from '../types';

interface ConditionalBranchEditorProps {
  branches: ConditionalBranch[];
  availableBlueprints: BlueprintComposition[];
  onAddBranch: () => void;
  onRemoveBranch: (branchId: string) => void;
  onUpdateBranch: (branchId: string, updates: Partial<ConditionalBranch>) => void;
}

export default function ConditionalBranchEditor({
  branches,
  availableBlueprints,
  onAddBranch,
  onRemoveBranch,
  onUpdateBranch,
}: ConditionalBranchEditorProps) {
  const checkTypes: { value: ConditionCheckType; label: string; description: string }[] = [
    { value: 'exists', label: 'Exists', description: 'Check if event exists' },
    { value: 'count_greater_than', label: 'Count >', description: 'Event count exceeds threshold' },
    { value: 'latest_within_hours', label: 'Recent', description: 'Latest event within hours' },
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">
            Conditional Branches
          </label>
          <p className="text-[10px] text-gray-600 mt-0.5">
            Execute different blueprints based on conditions
          </p>
        </div>
        <button
          onClick={onAddBranch}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-violet-500/20 text-violet-400 border border-violet-500/30 hover:bg-violet-500/30 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Branch
        </button>
      </div>

      {/* Branches List */}
      {branches.length > 0 ? (
        <div className="space-y-3">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg space-y-3"
            >
              {/* Branch Header */}
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-violet-400" />
                <input
                  type="text"
                  value={branch.name}
                  onChange={(e) => onUpdateBranch(branch.id, { name: e.target.value })}
                  placeholder="Branch name..."
                  className="flex-1 px-2 py-1 bg-gray-900/50 border border-gray-700/30 rounded text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/50"
                />
                <button
                  onClick={() => onRemoveBranch(branch.id)}
                  className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Condition Configuration */}
              <div className="space-y-2">
                <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  Condition
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-1">Event Type</label>
                    <input
                      type="text"
                      value={branch.condition.eventType}
                      onChange={(e) =>
                        onUpdateBranch(branch.id, {
                          condition: { ...branch.condition, eventType: e.target.value },
                        })
                      }
                      placeholder="e.g., context_created"
                      className="w-full px-2 py-1.5 bg-gray-900/50 border border-gray-700/30 rounded text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-gray-600 mb-1">Check Type</label>
                    <select
                      value={branch.condition.checkType}
                      onChange={(e) =>
                        onUpdateBranch(branch.id, {
                          condition: {
                            ...branch.condition,
                            checkType: e.target.value as ConditionCheckType,
                          },
                        })
                      }
                      className="w-full px-2 py-1.5 bg-gray-900/50 border border-gray-700/30 rounded text-xs text-white focus:outline-none focus:border-violet-500/50"
                    >
                      {checkTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Threshold (for count_greater_than and latest_within_hours) */}
                {(branch.condition.checkType === 'count_greater_than' ||
                  branch.condition.checkType === 'latest_within_hours') && (
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-1">
                      {branch.condition.checkType === 'count_greater_than'
                        ? 'Minimum Count'
                        : 'Hours'}
                    </label>
                    <input
                      type="number"
                      value={branch.condition.threshold || 0}
                      onChange={(e) =>
                        onUpdateBranch(branch.id, {
                          condition: {
                            ...branch.condition,
                            threshold: parseInt(e.target.value, 10),
                          },
                        })
                      }
                      min="0"
                      className="w-full px-2 py-1.5 bg-gray-900/50 border border-gray-700/30 rounded text-xs text-white focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                )}
              </div>

              {/* True/False Paths */}
              <div className="grid grid-cols-2 gap-2">
                {/* True Path */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                    </div>
                    <span className="text-[10px] font-medium text-emerald-400">True Path</span>
                  </div>
                  <select
                    multiple
                    value={branch.trueChain}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                      onUpdateBranch(branch.id, { trueChain: selected });
                    }}
                    className="w-full px-2 py-1.5 bg-gray-900/50 border border-emerald-500/30 rounded text-xs text-white focus:outline-none focus:border-emerald-500/50 min-h-[60px]"
                  >
                    {availableBlueprints.map((bp) => (
                      <option key={bp.id} value={bp.id!}>
                        {bp.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-600">
                    {branch.trueChain.length} blueprint{branch.trueChain.length !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* False Path */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center">
                      <X className="w-2.5 h-2.5 text-red-400" />
                    </div>
                    <span className="text-[10px] font-medium text-red-400">False Path</span>
                  </div>
                  <select
                    multiple
                    value={branch.falseChain}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                      onUpdateBranch(branch.id, { falseChain: selected });
                    }}
                    className="w-full px-2 py-1.5 bg-gray-900/50 border border-red-500/30 rounded text-xs text-white focus:outline-none focus:border-red-500/50 min-h-[60px]"
                  >
                    {availableBlueprints.map((bp) => (
                      <option key={bp.id} value={bp.id!}>
                        {bp.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-600">
                    {branch.falseChain.length} blueprint{branch.falseChain.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 border border-dashed border-gray-700/50 rounded-lg">
          <GitBranch className="w-8 h-8 text-gray-700 mx-auto mb-2" />
          <p className="text-xs text-gray-600">No conditional branches</p>
          <p className="text-[10px] text-gray-700 mt-1">
            Add branches to create conditional execution paths
          </p>
        </div>
      )}
    </div>
  );
}
