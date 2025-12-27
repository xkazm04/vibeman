/**
 * GoalCard Component
 * Individual goal display with status editing
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import type { GoalItem, GoalStatus, StatusConfig } from '../types';
import { getStatusConfig } from '../utils';

interface GoalCardProps {
  goal: GoalItem;
  isExpanded: boolean;
  isEditing: boolean;
  editingStatus: GoalStatus | null;
  onToggleExpand: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onStatusChange: (status: GoalStatus) => void;
  onSaveStatus: () => void;
}

export function GoalCard({
  goal,
  isExpanded,
  isEditing,
  editingStatus,
  onToggleExpand,
  onStartEdit,
  onCancelEdit,
  onStatusChange,
  onSaveStatus,
}: GoalCardProps) {
  const statusConfig = getStatusConfig(goal.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={`p-4 bg-gray-800/50 rounded-xl border transition-all ${
        isEditing ? 'border-purple-500/50' : 'border-gray-700/50 hover:border-gray-600/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border`}
            >
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </span>
          </div>
          <h4 className="font-medium text-white truncate">{goal.title}</h4>
          {goal.description && (
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{goal.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={onCancelEdit}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={onSaveStatus}
                className="p-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onStartEdit}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
                title="Update status"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              {goal.description && (
                <button
                  onClick={onToggleExpand}
                  className="p-1.5 text-gray-400 hover:text-white transition-colors"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Status Editor */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-gray-700/50"
          >
            <p className="text-xs text-gray-500 mb-2">Update status:</p>
            <div className="flex gap-2">
              {(['open', 'in_progress', 'done'] as const).map(status => {
                const config = getStatusConfig(status);
                const Icon = config.icon;
                const isSelected = editingStatus === status;

                return (
                  <button
                    key={status}
                    onClick={() => onStatusChange(status)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      isSelected
                        ? `${config.bg} ${config.color} ${config.border} border`
                        : 'bg-gray-700/50 text-gray-400 border border-transparent hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Description */}
      <AnimatePresence>
        {isExpanded && goal.description && !isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-gray-700/50"
          >
            <p className="text-sm text-gray-300">{goal.description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
