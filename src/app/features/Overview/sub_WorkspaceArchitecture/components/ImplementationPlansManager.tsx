'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Trash2,
  Eye,
  Loader2,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  MoreVertical,
  XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from '@/lib/formatDate';

interface CrossTaskPlanSummary {
  id: string;
  workspace_id: string | null;
  project_ids: string[];
  requirement: string;
  requirement_summary: string | null;
  selected_plan: number | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface StatusCounts {
  pending: number;
  running: number;
  completed: number;
  failed: number;
}

interface ImplementationPlansManagerProps {
  workspaceId: string | null;
  onViewPlan: (planId: string) => void;
}

export default function ImplementationPlansManager({
  workspaceId,
  onViewPlan,
}: ImplementationPlansManagerProps) {
  const [plans, setPlans] = useState<CrossTaskPlanSummary[]>([]);
  const [counts, setCounts] = useState<StatusCounts>({ pending: 0, running: 0, completed: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (workspaceId) params.set('workspaceId', workspaceId);
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/cross-task?${params}`);
      const result = await response.json();

      if (response.ok) {
        setPlans(result.plans);
        setCounts(result.counts);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, searchQuery]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleToggleSelect = useCallback((planId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const selectablePlans = filteredPlans.filter((p) => p.status !== 'running');
    if (selectedIds.size === selectablePlans.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectablePlans.map((p) => p.id)));
    }
  }, [plans, selectedIds.size]);

  const handleDeleteSingle = useCallback(async (planId: string) => {
    try {
      setDeletingIds((prev) => new Set(prev).add(planId));

      const response = await fetch(`/api/cross-task/${planId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPlans((prev) => prev.filter((p) => p.id !== planId));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(planId);
          return next;
        });
      }
    } catch (err) {
      console.error('Error deleting plan:', err);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(planId);
        return next;
      });
    }
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;

    try {
      const idsToDelete = Array.from(selectedIds);
      setDeletingIds(new Set(idsToDelete));

      const response = await fetch('/api/cross-task/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planIds: idsToDelete }),
      });

      if (response.ok) {
        setPlans((prev) => prev.filter((p) => !selectedIds.has(p.id)));
        setSelectedIds(new Set());
      }
    } catch (err) {
      console.error('Error bulk deleting plans:', err);
    } finally {
      setDeletingIds(new Set());
    }
  }, [selectedIds]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'running':
        return <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />;
      case 'failed':
        return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-zinc-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'running':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  // Filter plans by status
  const filteredPlans = statusFilter
    ? plans.filter((p) => p.status === statusFilter)
    : plans;

  // Calculate selectable count (exclude running)
  const selectablePlans = filteredPlans.filter((p) => p.status !== 'running');

  return (
    <div className="flex flex-col h-full bg-zinc-900/80 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-emerald-500/10 bg-emerald-500/5">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-emerald-500/10">
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-sm font-medium text-zinc-200">Implementation Plans</span>
          <span className="px-1.5 py-0.5 text-[10px] bg-zinc-800 text-zinc-400 rounded">
            {plans.length}
          </span>
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500">
              {selectedIds.size} selected
            </span>
            <button
              onClick={handleBulkDelete}
              disabled={deletingIds.size > 0}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/10 rounded transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800/30">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search requirements..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-800/50 border border-zinc-700/50 rounded-lg focus:outline-none focus:border-emerald-500/50 text-zinc-200 placeholder:text-zinc-600"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setStatusFilter(null)}
            className={`px-2 py-1 text-[10px] rounded-full transition-colors ${
              !statusFilter
                ? 'bg-zinc-700 text-zinc-200'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All
          </button>
          {counts.completed > 0 && (
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-2 py-1 text-[10px] rounded-full transition-colors ${
                statusFilter === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Completed ({counts.completed})
            </button>
          )}
          {counts.running > 0 && (
            <button
              onClick={() => setStatusFilter('running')}
              className={`px-2 py-1 text-[10px] rounded-full transition-colors ${
                statusFilter === 'running'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Running ({counts.running})
            </button>
          )}
          {counts.failed > 0 && (
            <button
              onClick={() => setStatusFilter('failed')}
              className={`px-2 py-1 text-[10px] rounded-full transition-colors ${
                statusFilter === 'failed'
                  ? 'bg-red-500/20 text-red-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Failed ({counts.failed})
            </button>
          )}
        </div>
      </div>

      {/* Plans list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs">
            <FileText className="w-8 h-8 mb-2 opacity-50" />
            {searchQuery ? (
              <span>No plans matching "{searchQuery}"</span>
            ) : (
              <span>No implementation plans yet</span>
            )}
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/30">
            {/* Select all header */}
            {selectablePlans.length > 0 && (
              <div className="px-3 py-1.5 bg-zinc-800/30 text-[10px] text-zinc-500 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.size === selectablePlans.length && selectablePlans.length > 0}
                  onChange={handleSelectAll}
                  className="w-3 h-3 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                />
                <span>Select all</span>
              </div>
            )}

            {/* Plan rows */}
            {filteredPlans.map((plan) => {
              const isSelected = selectedIds.has(plan.id);
              const isDeleting = deletingIds.has(plan.id);
              const isRunning = plan.status === 'running';

              return (
                <div
                  key={plan.id}
                  className={`flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800/30 transition-colors ${
                    isDeleting ? 'opacity-50' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(plan.id)}
                    disabled={isRunning || isDeleting}
                    className="w-3.5 h-3.5 rounded border-zinc-600 bg-zinc-800 text-emerald-500 focus:ring-0 focus:ring-offset-0 disabled:opacity-40"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {/* Status badge */}
                      <span className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] rounded-full border ${getStatusColor(plan.status)}`}>
                        {getStatusIcon(plan.status)}
                        {plan.status}
                      </span>

                      {/* Selected plan indicator */}
                      {plan.selected_plan && (
                        <span className="px-1.5 py-0.5 text-[9px] bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                          Plan {plan.selected_plan}
                        </span>
                      )}

                      {/* Projects count */}
                      <span className="text-[9px] text-zinc-500">
                        {plan.project_ids.length} project{plan.project_ids.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Requirement summary */}
                    <p className="text-xs text-zinc-300 truncate">
                      {plan.requirement_summary || plan.requirement}
                    </p>

                    {/* Timestamp */}
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      {formatDistanceToNow(new Date(plan.created_at))}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onViewPlan(plan.id)}
                      disabled={plan.status !== 'completed'}
                      className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="View plans"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSingle(plan.id)}
                      disabled={isRunning || isDeleting}
                      className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Delete"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
