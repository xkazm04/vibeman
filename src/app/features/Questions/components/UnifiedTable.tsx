'use client';

import React, { useMemo, useCallback } from 'react';
import { HelpCircle, Compass } from 'lucide-react';
import { DbQuestion, DbDirection } from '@/app/db';
import { DataTable, TableColumn, TableStat } from '@/components/tables';
import { QuestionDirectionRow, UnifiedItem } from './QuestionDirectionRow';

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

/**
 * UnifiedTable - Questions and Directions table component
 *
 * Features:
 * - Combined view of questions and directions
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
  // Combine and sort items
  const items = useMemo<UnifiedItem[]>(() => {
    const questionItems: UnifiedItem[] = questions.map(q => ({ type: 'question', data: q }));

    // Only show pending directions
    const directionItems: UnifiedItem[] = directions
      .filter(d => d.status === 'pending')
      .map(d => ({ type: 'direction', data: d }));

    // Sort by created_at descending (newest first)
    return [...questionItems, ...directionItems].sort((a, b) => {
      const dateA = new Date(a.data.created_at).getTime();
      const dateB = new Date(b.data.created_at).getTime();
      return dateB - dateA;
    });
  }, [questions, directions]);

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
    <DataTable
      items={items}
      columns={columns}
      keyExtractor={(item) => item.data.id}
      renderRow={renderRow}
      loading={loading}
      stats={stats}
      emptyState={{
        icons: [HelpCircle, Compass],
        title: 'No items yet',
        description: 'Generate questions or directions to get started',
      }}
    />
  );
}
