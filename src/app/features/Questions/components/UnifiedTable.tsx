'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Compass,
  Check,
  X,
  Trash2,
  Loader2,
  Eye,
  FileCode2,
  MessageSquare
} from 'lucide-react';
import { DbQuestion, DbDirection } from '@/app/db';
import { useModal } from '@/contexts/ModalContext';
import MarkdownViewer from '@/components/markdown/MarkdownViewer';

type UnifiedItem =
  | { type: 'question'; data: DbQuestion }
  | { type: 'direction'; data: DbDirection };

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

interface UnifiedRowProps {
  item: UnifiedItem;
  onAnswer?: () => void;
  onAccept?: () => Promise<void>;
  onReject?: () => Promise<void>;
  onDelete: () => Promise<void>;
}

function UnifiedRow({ item, onAnswer, onAccept, onReject, onDelete }: UnifiedRowProps) {
  const { showModal } = useModal();
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isQuestion = item.type === 'question';
  const isDirection = item.type === 'direction';

  // Question-specific
  const questionData = isQuestion ? item.data : null;
  const isAnswered = questionData?.status === 'answered';

  // Direction-specific
  const directionData = isDirection ? item.data : null;
  const isPending = directionData?.status === 'pending';

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onAccept) return;
    setAccepting(true);
    try {
      await onAccept();
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onReject) return;
    setRejecting(true);
    try {
      await onReject();
    } finally {
      setRejecting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  const handleRowClick = () => {
    if (isDirection && directionData) {
      showModal(
        {
          title: directionData.summary,
          subtitle: directionData.context_map_title,
          icon: Compass,
          iconBgColor: 'from-cyan-500/20 via-teal-500/10 to-emerald-500/20',
          iconColor: 'text-cyan-400',
          maxWidth: 'max-w-4xl',
          maxHeight: 'max-h-[85vh]',
          showBackdrop: true,
          backdropBlur: true,
        },
        <MarkdownViewer content={directionData.direction} />
      );
    } else if (isQuestion && questionData && !isAnswered && onAnswer) {
      onAnswer();
    }
  };

  const content = isQuestion ? questionData!.question : directionData!.summary;
  const contextTitle = isQuestion ? questionData!.context_map_title : directionData!.context_map_title;

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`
        border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer
        ${isAnswered ? 'bg-green-900/10' : ''}
      `}
      onClick={handleRowClick}
    >
      {/* Type Badge */}
      <td className="py-2.5 px-3 w-28 align-top">
        {isQuestion ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <HelpCircle className="w-3 h-3" />
            Question
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Compass className="w-3 h-3" />
            Direction
          </span>
        )}
      </td>

      {/* Content */}
      <td className="py-2.5 px-3">
        <div className="flex items-start gap-2">
          <span className="text-sm text-gray-200">{content}</span>
          {isAnswered && (
            <span title="Answered" className="flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-green-400" />
            </span>
          )}
        </div>
        {isAnswered && questionData?.answer && (
          <p className="text-xs text-gray-500 mt-1">
            {questionData.answer}
          </p>
        )}
      </td>

      {/* Context */}
      <td className="py-2.5 px-3 w-48 align-top">
        <span className="text-xs text-gray-400">{contextTitle}</span>
      </td>

      {/* Actions */}
      <td className="py-2.5 px-3 w-32 align-top">
        <div className="flex items-center justify-end gap-1">
          {/* Question actions */}
          {isQuestion && !isAnswered && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAnswer?.();
              }}
              className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded transition-colors"
              title="Answer question"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Direction actions */}
          {isDirection && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRowClick();
                }}
                className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-colors"
                title="View details"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>

              {isPending && (
                <>
                  <button
                    onClick={handleAccept}
                    disabled={accepting || rejecting || deleting}
                    className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded disabled:opacity-50 transition-colors"
                    title="Accept"
                  >
                    {accepting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={accepting || rejecting || deleting}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded disabled:opacity-50 transition-colors"
                    title="Reject"
                  >
                    {rejecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  </button>
                </>
              )}
            </>
          )}

          {/* Delete - available for all */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-500/10 rounded disabled:opacity-50 transition-colors"
            title="Delete"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </td>
    </motion.tr>
  );
}

export default function UnifiedTable({
  questions,
  directions,
  onAnswerQuestion,
  onAcceptDirection,
  onRejectDirection,
  onDeleteQuestion,
  onDeleteDirection,
  loading = false
}: UnifiedTableProps) {
  // Combine and filter items
  // - Show all questions (pending + answered)
  // - Show only pending directions (hide accepted/rejected)
  const items = useMemo<UnifiedItem[]>(() => {
    const questionItems: UnifiedItem[] = questions.map(q => ({ type: 'question', data: q }));
    const directionItems: UnifiedItem[] = directions
      .filter(d => d.status === 'pending')
      .map(d => ({ type: 'direction', data: d }));

    // Sort by created_at descending
    return [...questionItems, ...directionItems].sort((a, b) => {
      const dateA = new Date(a.data.created_at).getTime();
      const dateB = new Date(b.data.created_at).getTime();
      return dateB - dateA;
    });
  }, [questions, directions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <div className="w-6 h-6 border-2 border-gray-500 border-t-transparent rounded-full animate-spin mr-3" />
        Loading...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <div className="flex items-center gap-2 mb-4 opacity-50">
          <HelpCircle className="w-10 h-10" />
          <Compass className="w-10 h-10" />
        </div>
        <p className="text-lg font-medium">No items yet</p>
        <p className="text-sm text-gray-500 mt-1">
          Generate questions or directions to get started
        </p>
      </div>
    );
  }

  // Count stats
  const pendingQuestions = questions.filter(q => q.status === 'pending').length;
  const answeredQuestions = questions.filter(q => q.status === 'answered').length;
  const pendingDirections = directions.filter(d => d.status === 'pending').length;

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span>
          <span className="text-purple-400 font-medium">{pendingQuestions}</span> pending questions
        </span>
        <span>
          <span className="text-green-400 font-medium">{answeredQuestions}</span> answered
        </span>
        <span>
          <span className="text-cyan-400 font-medium">{pendingDirections}</span> pending directions
        </span>
      </div>

      {/* Table */}
      <div className="bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/40 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700/50 bg-gray-900/30">
              <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-28">
                Type
              </th>
              <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Content
              </th>
              <th className="py-2 px-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-48">
                Context
              </th>
              <th className="py-2 px-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider w-32">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <UnifiedRow
                  key={item.data.id}
                  item={item}
                  onAnswer={item.type === 'question' ? () => onAnswerQuestion(item.data as DbQuestion) : undefined}
                  onAccept={item.type === 'direction' ? () => onAcceptDirection(item.data.id) : undefined}
                  onReject={item.type === 'direction' ? () => onRejectDirection(item.data.id) : undefined}
                  onDelete={item.type === 'question'
                    ? () => onDeleteQuestion(item.data.id)
                    : () => onDeleteDirection(item.data.id)
                  }
                />
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
