'use client';

import React, { useMemo, useCallback, useState } from 'react';
import { HelpCircle, Compass } from 'lucide-react';
import { DbQuestion, DbDirection } from '@/app/db';
import { DataTable, TableColumn, TableStat } from '@/components/tables';
import { QuestionDirectionRow, UnifiedItem } from './QuestionDirectionRow';

type TypeFilter = 'all' | 'questions' | 'directions';
type StatusFilter = 'all' | 'pending' | 'accepted' | 'rejected' | 'answered';

interface StatusPill {
  id: StatusFilter;
  label: string;
  color: string;
  activeColor: string;
}

const QUESTION_STATUSES: StatusPill[] = [
  { id: 'all', label: 'All', color: 'text-zinc-400', activeColor: 'bg-zinc-700/60 text-zinc-200' },
  { id: 'pending', label: 'Pending', color: 'text-amber-400/70', activeColor: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30' },
  { id: 'answered', label: 'Answered', color: 'text-green-400/70', activeColor: 'bg-green-500/20 text-green-300 ring-1 ring-green-500/30' },
];

const DIRECTION_STATUSES: StatusPill[] = [
  { id: 'all', label: 'All', color: 'text-zinc-400', activeColor: 'bg-zinc-700/60 text-zinc-200' },
  { id: 'pending', label: 'Pending', color: 'text-amber-400/70', activeColor: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30' },
  { id: 'accepted', label: 'Accepted', color: 'text-green-400/70', activeColor: 'bg-green-500/20 text-green-300 ring-1 ring-green-500/30' },
  { id: 'rejected', label: 'Rejected', color: 'text-red-400/70', activeColor: 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30' },
];

const ALL_STATUSES: StatusPill[] = [
  { id: 'all', label: 'All', color: 'text-zinc-400', activeColor: 'bg-zinc-700/60 text-zinc-200' },
  { id: 'pending', label: 'Pending', color: 'text-amber-400/70', activeColor: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30' },
];

interface UnifiedTableProps {
  questions: DbQuestion[];
  directions: DbDirection[];
  onAnswerQuestion: (question: DbQuestion) => void;
  onAcceptDirection: (directionId: string) => Promise<void>;
  onRejectDirection: (directionId: string) => Promise<void>;
  onDeleteQuestion: (questionId: string) => Promise<void>;
  onDeleteDirection: (directionId: string) => Promise<void>;
  loading?: boolean;
}

// Column definitions for the unified table
const columns: TableColumn<UnifiedItem>[] = [
  { key: 'type', header: 'Type', width: 'w-28' },
  { key: 'content', header: 'Content' },
  { key: 'context', header: 'Context', width: 'w-48' },
  { key: 'actions', header: 'Actions', width: 'w-36', align: 'right' },
];

const TYPE_SEGMENTS: { id: TypeFilter; label: string; icon?: typeof HelpCircle }[] = [
  { id: 'all', label: 'All' },
  { id: 'questions', label: 'Questions', icon: HelpCircle },
  { id: 'directions', label: 'Directions', icon: Compass },
];

/**
 * UnifiedTable - Questions and Directions table component
 *
 * Features:
 * - Combined view of questions and directions
 * - Two-level filter: type segmented control + contextual status pills
 * - Parent handles optimistic updates
 * - Animated row transitions
 * - Stats bar with live counts
 */
export default function UnifiedTable({
  questions,
  directions,
  onAnswerQuestion,
  onAcceptDirection,
  onRejectDirection,
  onDeleteQuestion,
  onDeleteDirection,
  loading = false,
}: UnifiedTableProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Reset status when type changes (since statuses are type-dependent)
  const handleTypeChange = useCallback((type: TypeFilter) => {
    setTypeFilter(type);
    setStatusFilter('all');
  }, []);

  // All items (unfiltered) for count badges
  const allItems = useMemo<UnifiedItem[]>(() => {
    const questionItems: UnifiedItem[] = questions.map(q => ({ type: 'question', data: q }));
    const directionItems: UnifiedItem[] = directions.map(d => ({ type: 'direction', data: d }));

    return [...questionItems, ...directionItems].sort((a, b) => {
      const dateA = new Date(a.data.created_at).getTime();
      const dateB = new Date(b.data.created_at).getTime();
      return dateB - dateA;
    });
  }, [questions, directions]);

  // Status counts based on current type filter
  const statusCounts = useMemo(() => {
    const pendingQ = questions.filter(q => q.status === 'pending').length;
    const answeredQ = questions.filter(q => q.status === 'answered').length;
    const pendingD = directions.filter(d => d.status === 'pending').length;
    const acceptedD = directions.filter(d => d.status === 'accepted').length;
    const rejectedD = directions.filter(d => d.status === 'rejected').length;

    if (typeFilter === 'questions') {
      return { all: questions.length, pending: pendingQ, answered: answeredQ, accepted: 0, rejected: 0 };
    }
    if (typeFilter === 'directions') {
      return { all: directions.length, pending: pendingD, accepted: acceptedD, rejected: rejectedD, answered: 0 };
    }
    return { all: allItems.length, pending: pendingQ + pendingD, accepted: acceptedD, rejected: rejectedD, answered: answeredQ };
  }, [questions, directions, allItems.length, typeFilter]);

  // Get relevant status pills for current type
  const statusPills = useMemo(() => {
    if (typeFilter === 'questions') return QUESTION_STATUSES;
    if (typeFilter === 'directions') return DIRECTION_STATUSES;
    return ALL_STATUSES;
  }, [typeFilter]);

  // Filtered items based on type + status
  const items = useMemo<UnifiedItem[]>(() => {
    let filtered = allItems;

    // Type filter
    if (typeFilter === 'questions') {
      filtered = filtered.filter(i => i.type === 'question');
    } else if (typeFilter === 'directions') {
      filtered = filtered.filter(i => i.type === 'direction');
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(i => {
        if (i.type === 'question') return (i.data as DbQuestion).status === statusFilter;
        if (i.type === 'direction') return (i.data as DbDirection).status === statusFilter;
        return false;
      });
    }

    return filtered;
  }, [allItems, typeFilter, statusFilter]);

  // Stats for the header
  const stats = useMemo<TableStat[]>(() => {
    const pendingQuestions = questions.filter(q => q.status === 'pending').length;
    const answeredQuestions = questions.filter(q => q.status === 'answered').length;
    const pendingDirections = directions.filter(d => d.status === 'pending').length;

    return [
      { value: pendingQuestions, label: 'pending questions', colorScheme: 'purple' },
      { value: answeredQuestions, label: 'answered', colorScheme: 'green' },
      { value: pendingDirections, label: 'pending directions', colorScheme: 'cyan' },
    ];
  }, [questions, directions]);

  // Row renderer
  const renderRow = useCallback((item: UnifiedItem, index: number) => {
    const isQuestion = item.type === 'question';

    return (
      <QuestionDirectionRow
        key={item.data.id}
        item={item}
        index={index}
        onAnswer={isQuestion ? () => onAnswerQuestion(item.data as DbQuestion) : undefined}
        onAccept={!isQuestion ? () => onAcceptDirection(item.data.id) : undefined}
        onReject={!isQuestion ? () => onRejectDirection(item.data.id) : undefined}
        onDelete={isQuestion
          ? () => onDeleteQuestion(item.data.id)
          : () => onDeleteDirection(item.data.id)
        }
      />
    );
  }, [onAnswerQuestion, onAcceptDirection, onRejectDirection, onDeleteQuestion, onDeleteDirection]);

  // Build empty state description
  const emptyTitle = useMemo(() => {
    if (typeFilter === 'all' && statusFilter === 'all') return 'No items yet';
    const typeName = typeFilter === 'all' ? 'items' : typeFilter;
    if (statusFilter !== 'all') return `No ${statusFilter} ${typeName}`;
    return `No ${typeName}`;
  }, [typeFilter, statusFilter]);

  return (
    <div className="space-y-3">
      {/* Two-level filter */}
      {!loading && allItems.length > 0 && (
        <div className="flex flex-col gap-2">
          {/* Type segmented control */}
          <div className="flex items-center gap-1" role="group" aria-label="Filter by type">
            <div className="flex bg-zinc-900/60 border border-zinc-700/40 rounded-lg p-0.5">
              {TYPE_SEGMENTS.map((seg) => {
                const isActive = typeFilter === seg.id;
                const Icon = seg.icon;
                const count = seg.id === 'all' ? allItems.length
                  : seg.id === 'questions' ? questions.length
                  : directions.length;

                return (
                  <button
                    key={seg.id}
                    onClick={() => handleTypeChange(seg.id)}
                    aria-pressed={isActive}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? seg.id === 'questions'
                          ? 'bg-purple-500/20 text-purple-300 shadow-sm'
                          : seg.id === 'directions'
                          ? 'bg-cyan-500/20 text-cyan-300 shadow-sm'
                          : 'bg-zinc-700/60 text-zinc-200 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                    {seg.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                      isActive ? 'bg-white/10' : 'bg-zinc-800/80'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status pills (contextual based on type) */}
          <div className="flex items-center gap-1.5" role="group" aria-label="Filter by status">
            {statusPills.map((pill) => {
              const count = statusCounts[pill.id];
              const isActive = statusFilter === pill.id;
              if (count === 0 && pill.id !== 'all' && !isActive) return null;

              return (
                <button
                  key={pill.id}
                  onClick={() => setStatusFilter(pill.id)}
                  aria-pressed={isActive}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium transition-all ${
                    isActive
                      ? pill.activeColor
                      : `${pill.color} hover:bg-zinc-800/60`
                  }`}
                >
                  {pill.label}
                  <span className={`px-1 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                    isActive ? 'bg-white/10' : 'bg-zinc-800/80'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <DataTable
        items={items}
        columns={columns}
        keyExtractor={(item) => item.data.id}
        renderRow={renderRow}
        loading={loading}
        stats={stats}
        emptyState={{
          icons: [HelpCircle, Compass],
          title: emptyTitle,
          description: typeFilter === 'all' && statusFilter === 'all'
            ? 'Generate questions or directions to get started'
            : 'Try a different filter to see more items',
        }}
      />
    </div>
  );
}
