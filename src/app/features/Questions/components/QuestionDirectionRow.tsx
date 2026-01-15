'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  HelpCircle,
  Compass,
  Check,
  X,
  Trash2,
  Eye,
  MessageSquare
} from 'lucide-react';
import { DbQuestion, DbDirection } from '@/app/db';
import { useModal } from '@/contexts/ModalContext';
import MarkdownViewer from '@/components/markdown/MarkdownViewer';
import {
  TableRow,
  TableBadge,
  TableActionButton
} from '@/components/tables';

export type UnifiedItem =
  | { type: 'question'; data: DbQuestion }
  | { type: 'direction'; data: DbDirection };

interface QuestionDirectionRowProps {
  item: UnifiedItem;
  index: number;
  onAnswer?: () => void;
  onAccept?: () => Promise<void>;
  onReject?: () => Promise<void>;
  onDelete: () => Promise<void>;
}

/**
 * Unified row component for Questions and Directions.
 * Displays type badge, content, context, and appropriate actions.
 */
export function QuestionDirectionRow({
  item,
  index,
  onAnswer,
  onAccept,
  onReject,
  onDelete,
}: QuestionDirectionRowProps) {
  const { showModal } = useModal();

  const isQuestion = item.type === 'question';
  const isDirection = item.type === 'direction';

  // Type-specific data
  const questionData = isQuestion ? item.data as DbQuestion : null;
  const directionData = isDirection ? item.data as DbDirection : null;

  // Status checks
  const isAnswered = questionData?.status === 'answered';
  const isPending = directionData?.status === 'pending';

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
    } else if (isQuestion && !isAnswered && onAnswer) {
      onAnswer();
    }
  };

  const content = isQuestion ? questionData!.question : directionData!.summary;
  const contextTitle = isQuestion
    ? questionData!.context_map_title
    : directionData!.context_map_title;

  return (
    <TableRow
      index={index}
      onClick={handleRowClick}
      highlighted={isAnswered}
      highlightColor="green"
    >
      {/* Type Badge */}
      <td className="py-3 px-4 w-28 align-top">
        {isQuestion ? (
          <TableBadge
            icon={HelpCircle}
            label="Question"
            colorScheme="purple"
          />
        ) : (
          <TableBadge
            icon={Compass}
            label="Direction"
            colorScheme="cyan"
          />
        )}
      </td>

      {/* Content */}
      <td className="py-3 px-4">
        <div className="flex items-start gap-2">
          <span className="text-sm text-gray-200 leading-relaxed">
            {content}
          </span>
          {isAnswered && (
            <motion.span
              title="Answered"
              className="flex-shrink-0 mt-0.5"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <Check className="w-4 h-4 text-green-400" />
            </motion.span>
          )}
        </div>
        {isAnswered && questionData?.answer && (
          <motion.p
            className="text-xs text-gray-500 mt-2 pl-0 border-l-2 border-green-500/30 pl-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ delay: 0.1 }}
          >
            {questionData.answer}
          </motion.p>
        )}
      </td>

      {/* Context */}
      <td className="py-3 px-4 w-48 align-top">
        <span className="text-xs text-gray-400 font-medium">
          {contextTitle}
        </span>
      </td>

      {/* Actions */}
      <td className="py-3 px-4 w-36 align-top">
        <div className="flex items-center justify-end gap-1.5">
          {/* Question: Answer action */}
          {isQuestion && !isAnswered && (
            <TableActionButton
              icon={MessageSquare}
              label="Answer question"
              colorScheme="purple"
              onClick={(e) => {
                e.stopPropagation();
                onAnswer?.();
              }}
            />
          )}

          {/* Direction: View details */}
          {isDirection && (
            <TableActionButton
              icon={Eye}
              label="View details"
              colorScheme="cyan"
              onClick={(e) => {
                e.stopPropagation();
                handleRowClick();
              }}
            />
          )}

          {/* Direction: Accept/Reject */}
          {isDirection && isPending && onAccept && onReject && (
            <>
              <TableActionButton
                icon={Check}
                label="Accept"
                colorScheme="green"
                onClick={onAccept}
              />
              <TableActionButton
                icon={X}
                label="Reject"
                colorScheme="red"
                onClick={onReject}
              />
            </>
          )}

          {/* Delete action */}
          <TableActionButton
            icon={Trash2}
            label="Delete"
            colorScheme="gray"
            onClick={onDelete}
          />
        </div>
      </td>
    </TableRow>
  );
}

export default QuestionDirectionRow;
