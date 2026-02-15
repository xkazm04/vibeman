'use client';

import React, { useMemo, useCallback, useState } from 'react';
import { HelpCircle, Compass } from 'lucide-react';
import { DbQuestion, DbDirection } from '@/app/db';
import { DataTable, TableColumn, TableStat } from '@/components/tables';
import { QuestionDirectionRow, UnifiedItem } from './QuestionDirectionRow';

type FilterTab = 'all' | 'questions' | 'directions' | 'pending' | 'accepted' | 'rejected' | 'answered';

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

const FILTER_TABS: { id: FilterTab; label: string; color: string; activeColor: string }[] = [
  { id: 'all', label: 'All', color: 'text-zinc-400', activeColor: 'bg-zinc-700/60 text-zinc-200' },
  { id: 'questions', label: 'Questions', color: 'text-purple-400/70', activeColor: 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30' },
  { id: 'directions', label: 'Directions', color: 'text-cyan-400/70', activeColor: 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/30' },
  { id: 'pending', label: 'Pending', color: 'text-amber-400/70', activeColor: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30' },
  { id: 'accepted', label: 'Accepted', color: 'text-green-400/70', activeColor: 'bg-green-500/20 text-green-300 ring-1 ring-green-500/30' },
  { id: 'rejected', label: 'Rejected', color: 'text-red-400/70', activeColor: 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30' },
  { id: 'answered', label: 'Answered', color: 'text-green-400/70', activeColor: 'bg-green-500/20 text-green-300 ring-1 ring-green-500/30' },
];

/**
 * UnifiedTable - Questions and Directions table component
 *
 * Features:
 * - Combined view of questions and directions
 * - Filter tabs for type and status filtering
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
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

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

  // Filter counts for badges
  const filterCounts = useMemo(() => {
    const pendingQ = questions.filter(q => q.status === 'pending').length;
    const answeredQ = questions.filter(q => q.status === 'answered').length;
    const pendingD = directions.filter(d => d.status === 'pending').length;
    const acceptedD = directions.filter(d => d.status === 'accepted').length;
    const rejectedD = directions.filter(d => d.status === 'rejected').length;

    return {
      all: allItems.length,
      questions: questions.length,
      directions: directions.length,
      pending: pendingQ + pendingD,
      accepted: acceptedD,
      rejected: rejectedD,
      answered: answeredQ,
    };
  }, [questions, directions, allItems.length]);

  // Filtered items based on active tab
  const items = useMemo<UnifiedItem[]>(() => {
    switch (activeFilter) {
      case 'questions':
        return allItems.filter(i => i.type === 'question');
      case 'directions':
        return allItems.filter(i => i.type === 'direction');
      case 'pending':
        return allItems.filter(i =>
          (i.type === 'question' && (i.data as DbQuestion).status === 'pending') ||
          (i.type === 'direction' && (i.data as DbDirection).status === 'pending')
        );
      case 'accepted':
        return allItems.filter(i => i.type === 'direction' && (i.data as DbDirection).status === 'accepted');
      case 'rejected':
        return allItems.filter(i => i.type === 'direction' && (i.data as DbDirection).status === 'rejected');
      case 'answered':
        return allItems.filter(i => i.type === 'question' && (i.data as DbQuestion).status === 'answered');
      default:
        return allItems;
    }
  }, [allItems, activeFilter]);

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

  // Row renderer - uses callbacks directly from parent (optimistic updates handled there)
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

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      {!loading && allItems.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {FILTER_TABS.map((tab) => {
            const count = filterCounts[tab.id];
            const isActive = activeFilter === tab.id;
            // Hide tabs with 0 items (except 'all' and currently active)
            if (count === 0 && tab.id !== 'all' && !isActive) return null;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? tab.activeColor
                    : `${tab.color} hover:bg-zinc-800/60`
                }`}
              >
                {tab.label}
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                    isActive ? 'bg-white/10' : 'bg-zinc-800/80'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
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
          title: activeFilter === 'all' ? 'No items yet' : `No ${activeFilter} items`,
          description: activeFilter === 'all'
            ? 'Generate questions or directions to get started'
            : 'Try a different filter to see more items',
        }}
      />
    </div>
  );
}
