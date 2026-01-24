'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, ChevronDown, ChevronUp, Check, X, Target } from 'lucide-react';
import { Context } from '@/lib/queries/contextQueries';

interface ContextTargetsListProps {
  projectId: string;
  /** Compact mode for inline display within goal cards */
  compact?: boolean;
  /** Start collapsed by default */
  defaultCollapsed?: boolean;
  /** Maximum items to show before scrolling (default: unlimited) */
  maxItems?: number;
  /** Filter by specific goal ID (for future use) */
  goalId?: string;
}

interface EditingState {
  contextId: string;
  field: 'name' | 'target';
  value: string;
}

const RATING_COLORS = [
  { bg: 'bg-red-500', border: 'border-red-400', label: 'Critical' },
  { bg: 'bg-orange-500', border: 'border-orange-400', label: 'Needs Work' },
  { bg: 'bg-yellow-500', border: 'border-yellow-400', label: 'Fair' },
  { bg: 'bg-lime-500', border: 'border-lime-400', label: 'Good' },
  { bg: 'bg-green-500', border: 'border-green-400', label: 'Excellent' },
];

function RatingDots({
  rating,
  contextId,
  onRatingChange,
  compact = false,
}: {
  rating: number | null | undefined;
  contextId: string;
  onRatingChange: (contextId: string, rating: number) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex gap-0.5 items-center" data-testid={`rating-dots-${contextId}`}>
      {[1, 2, 3, 4, 5].map((value) => {
        const isActive = rating !== null && rating !== undefined && value <= rating;
        const color = RATING_COLORS[value - 1];
        const size = compact ? 'w-2 h-2' : 'w-2.5 h-2.5';
        return (
          <button
            key={value}
            onClick={(e) => {
              e.stopPropagation();
              onRatingChange(contextId, value);
            }}
            className={`${size} rounded-full transition-all ${
              isActive
                ? `${color.bg} ${color.border} border`
                : 'bg-gray-600/50 hover:bg-gray-500/50 border border-gray-600'
            }`}
            title={`${value} - ${color.label}`}
            data-testid={`rating-dot-${contextId}-${value}`}
          />
        );
      })}
    </div>
  );
}

function InlineEdit({
  value,
  onSave,
  onCancel,
  placeholder,
}: {
  value: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
}) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave(editValue);
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="flex items-center gap-1 flex-1">
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 bg-gray-700/50 border border-primary/50 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-primary"
        data-testid="inline-edit-input"
      />
      <button
        onClick={() => onSave(editValue)}
        className="p-0.5 text-green-400 hover:text-green-300"
        data-testid="inline-edit-save"
      >
        <Check className="w-3 h-3" />
      </button>
      <button
        onClick={onCancel}
        className="p-0.5 text-red-400 hover:text-red-300"
        data-testid="inline-edit-cancel"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function ContextTargetsList({
  projectId,
  compact = false,
  defaultCollapsed = false,
  maxItems,
  goalId,
}: ContextTargetsListProps) {
  const [contexts, setContexts] = useState<Context[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!defaultCollapsed);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [creatingGoal, setCreatingGoal] = useState<string | null>(null);
  const [goalCreated, setGoalCreated] = useState<string | null>(null);

  const fetchContexts = useCallback(async () => {
    try {
      const response = await fetch(`/api/contexts?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        const contextList = data.data?.contexts || [];
        // Sort by name ascending
        contextList.sort((a: Context, b: Context) => a.name.localeCompare(b.name));
        setContexts(contextList);
      }
    } catch (error) {
      // Silent error handling
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchContexts();
  }, [fetchContexts]);

  const updateContext = async (
    contextId: string,
    updates: { name?: string; target?: string | null; target_rating?: number | null }
  ) => {
    setUpdating(contextId);
    try {
      const response = await fetch('/api/contexts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextId, updates }),
      });

      if (response.ok) {
        // Update local state
        setContexts((prev) =>
          prev.map((ctx) =>
            ctx.id === contextId
              ? {
                  ...ctx,
                  name: updates.name ?? ctx.name,
                  target: updates.target !== undefined ? updates.target : ctx.target,
                  target_rating:
                    updates.target_rating !== undefined ? updates.target_rating : ctx.target_rating,
                }
              : ctx
          )
        );
      }
    } catch (error) {
      // Silent error handling
    } finally {
      setUpdating(null);
      setEditing(null);
    }
  };

  const handleRatingChange = (contextId: string, rating: number) => {
    const context = contexts.find((c) => c.id === contextId);
    // Toggle off if clicking the same rating
    const newRating = context?.target_rating === rating ? null : rating;
    updateContext(contextId, { target_rating: newRating });
  };

  const handleEdit = (contextId: string, field: 'name' | 'target', currentValue: string) => {
    if (compact) return; // Disable editing in compact mode
    setEditing({ contextId, field, value: currentValue });
  };

  const handleSave = (contextId: string, field: 'name' | 'target', value: string) => {
    if (field === 'name') {
      updateContext(contextId, { name: value });
    } else {
      updateContext(contextId, { target: value || null });
    }
  };

  const handleCreateGoal = async (context: Context) => {
    if (creatingGoal || compact) return;

    setCreatingGoal(context.id);
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: context.name,
          description: context.target || '',
          context_id: context.id,
          status: 'open',
        }),
      });

      if (response.ok) {
        setGoalCreated(context.id);
        // Clear success indicator after 2 seconds
        setTimeout(() => setGoalCreated(null), 2000);
      }
    } catch (error) {
      // Silent error handling
    } finally {
      setCreatingGoal(null);
    }
  };

  if (loading) {
    return (
      <div className={compact ? 'py-2' : 'mt-4'} data-testid="context-targets-loading">
        {!compact && (
          <div className="h-px bg-gradient-to-r from-transparent via-gray-600/30 to-transparent mb-4" />
        )}
        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <div className="w-4 h-4 border-2 border-gray-600/30 border-t-gray-500 rounded-full animate-spin" />
          Loading contexts...
        </div>
      </div>
    );
  }

  if (contexts.length === 0) {
    return null;
  }

  // Apply maxItems limit if specified
  const displayContexts = maxItems ? contexts.slice(0, maxItems) : contexts;
  const hasMore = maxItems && contexts.length > maxItems;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: compact ? 0.2 : 0.8 }}
      className={compact ? '' : 'mt-4'}
      data-testid="context-targets-list"
    >
      {/* Separator - only in non-compact mode */}
      {!compact && (
        <div className="h-px bg-gradient-to-r from-transparent via-gray-600/30 to-transparent mb-3" />
      )}

      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between text-xs transition-colors mb-2 ${
          compact
            ? 'text-primary/70 hover:text-primary'
            : 'text-gray-400 hover:text-gray-300'
        }`}
        data-testid="context-targets-toggle"
      >
        <div className="flex items-center gap-1.5">
          <Crosshair className={`w-3 h-3 ${compact ? 'text-primary/70' : 'text-amber-500/70'}`} />
          <span className="font-medium">Context Targets</span>
          <span className={compact ? 'text-primary/50' : 'text-gray-500'}>({contexts.length})</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>

      {/* List */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className={`space-y-0.5 overflow-y-auto pr-1 custom-scrollbar ${
                compact ? 'max-h-[200px]' : 'max-h-[480px]'
              }`}
            >
              {displayContexts.map((context, index) => (
                <motion.div
                  key={context.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`group flex items-center gap-2 py-1.5 px-2 rounded transition-colors ${
                    updating === context.id ? 'opacity-50' : ''
                  } ${compact ? 'hover:bg-primary/5' : 'hover:bg-gray-800/40'}`}
                  data-testid={`context-target-item-${context.id}`}
                >
                  {/* Name */}
                  <div className={compact ? 'w-[80px] flex-shrink-0' : 'w-[100px] flex-shrink-0'}>
                    {editing?.contextId === context.id && editing.field === 'name' ? (
                      <InlineEdit
                        value={editing.value}
                        onSave={(value) => handleSave(context.id, 'name', value)}
                        onCancel={() => setEditing(null)}
                        placeholder="Context name"
                      />
                    ) : (
                      <span
                        onClick={() => handleEdit(context.id, 'name', context.name)}
                        className={`text-xs truncate block ${
                          compact
                            ? 'text-gray-400'
                            : 'text-gray-300 cursor-pointer hover:text-primary transition-colors'
                        }`}
                        title={context.name}
                      >
                        {context.name}
                      </span>
                    )}
                  </div>

                  {/* Target - hide in compact mode */}
                  {!compact && (
                    <div className="flex-1 min-w-0">
                      {editing?.contextId === context.id && editing.field === 'target' ? (
                        <InlineEdit
                          value={editing.value}
                          onSave={(value) => handleSave(context.id, 'target', value)}
                          onCancel={() => setEditing(null)}
                          placeholder="Set target..."
                        />
                      ) : (
                        <span
                          onClick={() => handleEdit(context.id, 'target', context.target || '')}
                          className={`text-xs truncate block cursor-pointer transition-colors ${
                            context.target
                              ? 'text-gray-400 hover:text-primary'
                              : 'text-gray-600 italic hover:text-gray-400'
                          }`}
                          title={context.target || 'Click to set target'}
                        >
                          {context.target || 'No target'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Set as Goal Button - hide in compact mode */}
                  {!compact && (
                    <div className="flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateGoal(context);
                        }}
                        disabled={creatingGoal === context.id}
                        className={`p-1 rounded transition-all ${
                          goalCreated === context.id
                            ? 'text-emerald-400'
                            : 'text-gray-500 opacity-0 group-hover:opacity-100 hover:text-cyan-400 hover:bg-cyan-500/10'
                        }`}
                        title="Set as Goal"
                        data-testid={`set-goal-${context.id}`}
                      >
                        {goalCreated === context.id ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : creatingGoal === context.id ? (
                          <div className="w-3.5 h-3.5 border border-gray-500 border-t-cyan-400 rounded-full animate-spin" />
                        ) : (
                          <Target className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Rating */}
                  <div className="flex-shrink-0">
                    <RatingDots
                      rating={context.target_rating}
                      contextId={context.id}
                      onRatingChange={handleRatingChange}
                      compact={compact}
                    />
                  </div>
                </motion.div>
              ))}

              {/* Show more indicator */}
              {hasMore && (
                <div className="text-xs text-gray-500 text-center py-1">
                  +{contexts.length - maxItems!} more...
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
