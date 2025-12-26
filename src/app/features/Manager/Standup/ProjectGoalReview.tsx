/**
 * ProjectGoalReview Component
 * Single project step in the standup wizard
 * Shows Open/In-Progress goals for review and allows adding new goals
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  Circle,
  ChevronDown,
  ChevronUp,
  Edit3,
  X,
  Play,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { Goal } from '@/types';
import GoalAddPanel from '@/app/features/Onboarding/sub_GoalDrawer/GoalAddPanel';

interface GoalItem {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'done' | 'rejected' | 'undecided';
  context_id: string | null;
  order_index: number;
}

interface ProjectGoalReviewProps {
  projectId: string;
  projectName: string;
  projectPath: string;
  projectType?: string;
  onConfirm: () => void;
  isLastStep: boolean;
}

export default function ProjectGoalReview({
  projectId,
  projectName,
  projectPath,
  projectType,
  onConfirm,
  isLastStep,
}: ProjectGoalReviewProps) {
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<GoalItem['status'] | null>(null);

  // Server preview state
  const [isStartingServer, setIsStartingServer] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);

  const isNextJsProject = projectType === 'nextjs' || projectType === 'react';

  // Fetch goals for this project
  const fetchGoals = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/goals?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        // Filter to show only open and in_progress goals
        const activeGoals = (data.goals || []).filter(
          (g: GoalItem) => g.status === 'open' || g.status === 'in_progress'
        );
        setGoals(activeGoals);
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Handle starting preview server
  const handleStartServer = useCallback(async () => {
    setIsStartingServer(true);
    setServerError(null);
    setServerUrl(null);

    try {
      const response = await fetch('/api/server/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        let errorMessage = data.error || 'Failed to start server';
        if (data.stage === 'kill') {
          errorMessage = `Failed to kill existing process: ${data.error}`;
        } else if (data.stage === 'start') {
          errorMessage = `Unable to start server: ${data.error}`;
        }
        setServerError(errorMessage);
        return;
      }

      setServerUrl(data.url);
      // Open in new window after a short delay
      setTimeout(() => {
        window.open(data.url, '_blank');
      }, 500);
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'Failed to start server'
      );
    } finally {
      setIsStartingServer(false);
    }
  }, [projectId]);

  const handleAddGoal = async (goalData: Omit<Goal, 'id' | 'order' | 'projectId'>) => {
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: goalData.title,
          description: goalData.description,
          status: goalData.status || 'open',
          contextId: goalData.contextId,
          // Explicitly enable goal analysis to create Claude Code requirement
          createAnalysis: true,
          // Pass the correct project path from frontend (not from DB lookup)
          projectPath,
        }),
      });

      if (response.ok) {
        await fetchGoals();
      }
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };

  const handleUpdateStatus = async (goalId: string, newStatus: GoalItem['status']) => {
    try {
      const response = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: goalId,
          status: newStatus,
        }),
      });

      if (response.ok) {
        setGoals(prev =>
          prev.map(g => (g.id === goalId ? { ...g, status: newStatus } : g))
        );
        setEditingGoalId(null);
        setEditingStatus(null);
      }
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const getStatusConfig = (status: GoalItem['status']) => {
    switch (status) {
      case 'open':
        return {
          icon: Circle,
          label: 'Open',
          color: 'text-gray-400',
          bg: 'bg-gray-500/10',
          border: 'border-gray-500/30',
        };
      case 'in_progress':
        return {
          icon: Clock,
          label: 'In Progress',
          color: 'text-amber-400',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
        };
      case 'done':
        return {
          icon: CheckCircle2,
          label: 'Done',
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
        };
      default:
        return {
          icon: Circle,
          label: status,
          color: 'text-gray-400',
          bg: 'bg-gray-500/10',
          border: 'border-gray-500/30',
        };
    }
  };

  const openGoals = goals.filter(g => g.status === 'open');
  const inProgressGoals = goals.filter(g => g.status === 'in_progress');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Project Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gray-800 rounded-xl border border-gray-700">
            <Target className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{projectName}</h2>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500">{projectPath}</p>
              {projectType && (
                <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">
                  {projectType}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Run Server Button - Only for Next.js projects */}
          {isNextJsProject && (
            <div className="flex flex-col items-end">
              {serverError && (
                <div className="flex items-center gap-1.5 mb-2 text-xs text-red-400 max-w-[250px]">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{serverError}</span>
                </div>
              )}
              <button
                onClick={handleStartServer}
                disabled={isStartingServer}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  serverError
                    ? 'bg-red-500/20 text-red-300 border-2 border-red-500/60 hover:bg-red-500/30'
                    : serverUrl
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isStartingServer ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting...
                  </>
                ) : serverUrl ? (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Open Preview
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Server
                  </>
                )}
              </button>
            </div>
          )}

          <button
            onClick={() => setShowAddPanel(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg border border-purple-500/40 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Goal
          </button>
        </div>
      </div>

      {/* Goals Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Circle className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">Open</span>
          </div>
          <div className="text-2xl font-bold text-white">{openGoals.length}</div>
        </div>
        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-gray-400">In Progress</span>
          </div>
          <div className="text-2xl font-bold text-white">{inProgressGoals.length}</div>
        </div>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-gray-700/50">
          <Target className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-400 mb-2">No Active Goals</h3>
          <p className="text-gray-500 mb-4">This project has no open or in-progress goals</p>
          <button
            onClick={() => setShowAddPanel(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg border border-purple-500/40 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* In Progress Section */}
          {inProgressGoals.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                In Progress ({inProgressGoals.length})
              </h3>
              <div className="space-y-2">
                {inProgressGoals.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    isExpanded={expandedGoalId === goal.id}
                    isEditing={editingGoalId === goal.id}
                    editingStatus={editingGoalId === goal.id ? editingStatus : null}
                    onToggleExpand={() =>
                      setExpandedGoalId(prev => (prev === goal.id ? null : goal.id))
                    }
                    onStartEdit={() => {
                      setEditingGoalId(goal.id);
                      setEditingStatus(goal.status);
                    }}
                    onCancelEdit={() => {
                      setEditingGoalId(null);
                      setEditingStatus(null);
                    }}
                    onStatusChange={status => setEditingStatus(status)}
                    onSaveStatus={() => {
                      if (editingStatus) {
                        handleUpdateStatus(goal.id, editingStatus);
                      }
                    }}
                    getStatusConfig={getStatusConfig}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Open Section */}
          {openGoals.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <Circle className="w-4 h-4 text-gray-400" />
                Open ({openGoals.length})
              </h3>
              <div className="space-y-2">
                {openGoals.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    isExpanded={expandedGoalId === goal.id}
                    isEditing={editingGoalId === goal.id}
                    editingStatus={editingGoalId === goal.id ? editingStatus : null}
                    onToggleExpand={() =>
                      setExpandedGoalId(prev => (prev === goal.id ? null : goal.id))
                    }
                    onStartEdit={() => {
                      setEditingGoalId(goal.id);
                      setEditingStatus(goal.status);
                    }}
                    onCancelEdit={() => {
                      setEditingGoalId(null);
                      setEditingStatus(null);
                    }}
                    onStatusChange={status => setEditingStatus(status)}
                    onSaveStatus={() => {
                      if (editingStatus) {
                        handleUpdateStatus(goal.id, editingStatus);
                      }
                    }}
                    getStatusConfig={getStatusConfig}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Goal Panel */}
      <AnimatePresence>
        {showAddPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddPanel(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-gray-900 rounded-2xl border border-gray-700/50 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <GoalAddPanel
                projectId={projectId}
                projectPath={projectPath}
                onSubmit={handleAddGoal}
                onClose={() => setShowAddPanel(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Goal Card Sub-component
interface GoalCardProps {
  goal: GoalItem;
  isExpanded: boolean;
  isEditing: boolean;
  editingStatus: GoalItem['status'] | null;
  onToggleExpand: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onStatusChange: (status: GoalItem['status']) => void;
  onSaveStatus: () => void;
  getStatusConfig: (status: GoalItem['status']) => {
    icon: any;
    label: string;
    color: string;
    bg: string;
    border: string;
  };
}

function GoalCard({
  goal,
  isExpanded,
  isEditing,
  editingStatus,
  onToggleExpand,
  onStartEdit,
  onCancelEdit,
  onStatusChange,
  onSaveStatus,
  getStatusConfig,
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
