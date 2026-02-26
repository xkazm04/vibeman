'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  HelpCircle,
  Compass,
  Check,
  X,
  Trash2,
  Eye,
  MessageSquare,
  Clock,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { DbQuestion, DbDirection } from '@/app/db';
import { useModal } from '@/contexts/ModalContext';
import MarkdownViewer from '@/components/markdown/MarkdownViewer';
import { type DecisionRecord, renderAdrMarkdown } from '@/lib/directions/adrGenerator';
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

/** Compact effort/impact badge shown inline on direction rows */
function EffortImpactBadge({ effort, impact }: { effort: number | null; impact: number | null }) {
  const effortColor = effort != null
    ? effort <= 3 ? 'text-emerald-400' : effort <= 6 ? 'text-yellow-400' : 'text-red-400'
    : 'text-zinc-500';
  const impactColor = impact != null
    ? impact <= 3 ? 'text-red-400' : impact <= 6 ? 'text-yellow-400' : 'text-emerald-400'
    : 'text-zinc-500';

  return (
    <div className="flex items-center gap-2.5 mt-1.5">
      {effort != null && (
        <span className={`inline-flex items-center gap-1 text-[10px] font-mono ${effortColor}`} title={`Effort: ${effort}/10`}>
          <Clock className="w-3 h-3" />
          E:{effort}
        </span>
      )}
      {impact != null && (
        <span className={`inline-flex items-center gap-1 text-[10px] font-mono ${impactColor}`} title={`Impact: ${impact}/10`}>
          <TrendingUp className="w-3 h-3" />
          I:{impact}
        </span>
      )}
      {effort != null && impact != null && (
        <span className="text-[10px] text-zinc-500 font-mono" title="Impact/Effort ratio">
          ({(impact / effort).toFixed(1)}x)
        </span>
      )}
    </div>
  );
}

function AnswerPreview({ answer }: { answer: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = answer.length > 200;

  return (
    <motion.div
      className="mt-2 rounded-md bg-green-500/5 border border-green-500/10 pl-3 border-l-2 border-l-green-500/30 pr-3 py-2"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ delay: 0.1 }}
    >
      <p className={`text-sm text-gray-300 leading-relaxed ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
        {answer}
      </p>
      {isLong && (
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="text-xs text-green-400 hover:text-green-300 mt-1 transition-colors"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </motion.div>
  );
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

  // Status badge config
  const status = item.data.status;
  const statusMap: Record<string, { label: string; colorScheme: 'amber' | 'green' | 'red' | 'cyan'; icon: typeof Clock }> = {
    pending: { label: 'Pending', colorScheme: 'amber', icon: Clock },
    processing: { label: 'Processing', colorScheme: 'cyan', icon: Clock },
    answered: { label: 'Answered', colorScheme: 'green', icon: Check },
    accepted: { label: 'Accepted', colorScheme: 'green', icon: Check },
    rejected: { label: 'Rejected', colorScheme: 'red', icon: X },
  };
  const statusConfig = statusMap[status] ?? { label: status, colorScheme: 'amber' as const, icon: Clock };

  // Parse ADR from decision_record JSON if present
  const parsedAdr: DecisionRecord | null = (() => {
    if (!directionData?.decision_record) return null;
    try { return JSON.parse(directionData.decision_record) as DecisionRecord; }
    catch { return null; }
  })();

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

  const handleViewAdr = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!parsedAdr) return;
    const adrMarkdown = renderAdrMarkdown(parsedAdr);
    showModal(
      {
        title: `ADR: ${parsedAdr.title}`,
        subtitle: `${parsedAdr.status.toUpperCase()} \u2022 ${parsedAdr.date}`,
        icon: FileText,
        iconBgColor: 'from-emerald-500/20 via-green-500/10 to-teal-500/20',
        iconColor: 'text-emerald-400',
        maxWidth: 'max-w-4xl',
        maxHeight: 'max-h-[85vh]',
        showBackdrop: true,
        backdropBlur: true,
      },
      <MarkdownViewer content={adrMarkdown} />
    );
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
      {/* Type & Status Badges */}
      <td className="py-3 px-4 w-28 align-top">
        <div className="flex flex-col gap-1.5">
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
          <TableBadge
            icon={statusConfig.icon}
            label={statusConfig.label}
            colorScheme={statusConfig.colorScheme}
          />
        </div>
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
        {/* Effort/Impact badge for directions */}
        {isDirection && directionData && (directionData.effort != null || directionData.impact != null) && (
          <EffortImpactBadge effort={directionData.effort} impact={directionData.impact} />
        )}
        {isAnswered && questionData?.answer && (
          <AnswerPreview answer={questionData.answer} />
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

          {/* Direction: View ADR (for accepted directions) */}
          {isDirection && parsedAdr && (
            <TableActionButton
              icon={FileText}
              label="View ADR"
              colorScheme="green"
              onClick={handleViewAdr}
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
