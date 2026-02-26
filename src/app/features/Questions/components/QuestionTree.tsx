/**
 * Question Tree
 * Visual decision tree showing cascading strategic question chains.
 * Displays: Question → Answer → Follow-up Questions → ... → Direction/Brief
 */

'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronDown, HelpCircle, MessageSquare, Loader2,
  GitBranch, FileText, Zap, Compass, Sparkles, Check, Clock, Trash2,
} from 'lucide-react';
import { DbQuestion } from '@/app/db';
import type { QuestionTreeNode } from '@/app/db/repositories/question.repository';

// ─── Types ───

interface QuestionTreeProps {
  trees: QuestionTreeNode[];
  onAnswerQuestion: (question: DbQuestion) => void;
  onGenerateFollowUp: (parentId: string) => Promise<void>;
  onGenerateBrief: (questionId: string) => Promise<void>;
  onDeleteQuestion: (questionId: string) => void;
  onGenerateDirection: (questionId: string) => void;
  generatingFollowUp: string | null;
  generatingBrief: string | null;
}

// ─── Depth Colors ───

const DEPTH_COLORS = [
  { border: 'border-purple-500/30', bg: 'bg-purple-500/5', text: 'text-purple-400', line: 'bg-purple-500/20' },
  { border: 'border-cyan-500/30', bg: 'bg-cyan-500/5', text: 'text-cyan-400', line: 'bg-cyan-500/20' },
  { border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400', line: 'bg-amber-500/20' },
  { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', text: 'text-emerald-400', line: 'bg-emerald-500/20' },
  { border: 'border-rose-500/30', bg: 'bg-rose-500/5', text: 'text-rose-400', line: 'bg-rose-500/20' },
];

function getDepthColor(depth: number) {
  return DEPTH_COLORS[depth % DEPTH_COLORS.length];
}

// ─── Tree Node Component ───

function TreeNode({
  node,
  onAnswerQuestion,
  onGenerateFollowUp,
  onGenerateBrief,
  onDeleteQuestion,
  onGenerateDirection,
  generatingFollowUp,
  generatingBrief,
}: {
  node: QuestionTreeNode;
} & Omit<QuestionTreeProps, 'trees'>) {
  const [expanded, setExpanded] = useState(true);
  const depth = node.tree_depth ?? 0;
  const color = getDepthColor(depth);
  const hasChildren = node.children.length > 0;
  const isAnswered = node.status === 'answered' && !!node.answer;
  const canGenerateFollowUp = isAnswered && !hasChildren;
  const isGeneratingFollowUp = generatingFollowUp === node.id;
  const isGeneratingBrief = generatingBrief === node.id;

  // Can generate brief if this is at depth 2+ (meaning chain is 3+ levels)
  const chainDepth = depth + 1;
  const canGenerateBrief = isAnswered && chainDepth >= 3;

  return (
    <div className="relative">
      {/* Vertical connector line from parent */}
      {depth > 0 && (
        <div
          className={`absolute -top-3 left-4 w-px h-3 ${color.line}`}
        />
      )}

      {/* Node card */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className={`rounded-xl border ${color.border} ${color.bg} p-3 transition-all`}
      >
        {/* Header row */}
        <div className="flex items-start gap-2">
          {/* Expand toggle (if has children) */}
          {hasChildren ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-0.5 p-0.5 rounded hover:bg-white/5 transition-colors flex-shrink-0"
            >
              {expanded ? (
                <ChevronDown className={`w-3.5 h-3.5 ${color.text}`} />
              ) : (
                <ChevronRight className={`w-3.5 h-3.5 ${color.text}`} />
              )}
            </button>
          ) : (
            <div className="w-4.5 flex-shrink-0" />
          )}

          {/* Question icon + depth badge */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <HelpCircle className={`w-4 h-4 ${color.text}`} />
            <span className={`text-[10px] font-mono ${color.text} opacity-60`}>
              L{depth}
            </span>
          </div>

          {/* Question text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-200 leading-relaxed">{node.question}</p>

            {/* Context badge */}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-gray-500 bg-gray-800/50 px-1.5 py-0.5 rounded">
                {node.context_map_title}
              </span>
              {isAnswered && (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Check className="w-2.5 h-2.5" />
                  Answered
                </span>
              )}
              {!isAnswered && (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  Pending
                </span>
              )}
              {hasChildren && (
                <span className="text-[10px] text-gray-500">
                  {node.children.length} follow-up{node.children.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {!isAnswered && (
              <button
                onClick={() => onAnswerQuestion(node)}
                className="px-2 py-1 text-xs rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white transition-colors"
              >
                Answer
              </button>
            )}
            <button
              onClick={() => onDeleteQuestion(node.id)}
              className="p-1 text-gray-600 hover:text-red-400 transition-colors rounded"
              title="Delete question"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Answer block */}
        {isAnswered && node.answer && (
          <div className="mt-2 ml-6 pl-3 border-l-2 border-emerald-500/20">
            <div className="flex items-start gap-1.5">
              <MessageSquare className="w-3 h-3 text-emerald-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-400 leading-relaxed">{node.answer}</p>
            </div>
          </div>
        )}

        {/* Action buttons for answered questions */}
        {isAnswered && (
          <div className="mt-2 ml-6 flex items-center gap-2 flex-wrap">
            {canGenerateFollowUp && (
              <button
                onClick={() => onGenerateFollowUp(node.id)}
                disabled={!!generatingFollowUp}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-40 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/20"
              >
                {isGeneratingFollowUp ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <GitBranch className="w-3 h-3" />
                )}
                {isGeneratingFollowUp ? 'Generating...' : 'Drill Deeper'}
              </button>
            )}

            {canGenerateBrief && (
              <button
                onClick={() => onGenerateBrief(node.id)}
                disabled={!!generatingBrief}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all disabled:opacity-40 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/20"
              >
                {isGeneratingBrief ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <FileText className="w-3 h-3" />
                )}
                {isGeneratingBrief ? 'Generating...' : 'Strategic Brief'}
              </button>
            )}

            {canGenerateFollowUp && (
              <button
                onClick={() => onGenerateDirection(node.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/20"
              >
                <Compass className="w-3 h-3" />
                Generate Direction
              </button>
            )}
          </div>
        )}

        {/* Strategic Brief Display */}
        {node.strategic_brief && (
          <StrategicBriefDisplay brief={node.strategic_brief} />
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="ml-6 mt-1 space-y-1 relative"
          >
            {/* Vertical branch line */}
            <div className={`absolute left-4 top-0 bottom-3 w-px ${color.line}`} />

            {node.children.map((child) => (
              <div key={child.id} className="relative pl-4 pt-2">
                {/* Horizontal branch connector */}
                <div className={`absolute left-0 top-[22px] w-4 h-px ${color.line}`} />
                <TreeNode
                  node={child}
                  onAnswerQuestion={onAnswerQuestion}
                  onGenerateFollowUp={onGenerateFollowUp}
                  onGenerateBrief={onGenerateBrief}
                  onDeleteQuestion={onDeleteQuestion}
                  onGenerateDirection={onGenerateDirection}
                  generatingFollowUp={generatingFollowUp}
                  generatingBrief={generatingBrief}
                />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Strategic Brief Display ───

function StrategicBriefDisplay({ brief }: { brief: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3 ml-6 rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <span className="text-xs font-medium text-amber-300">Strategic Brief</span>
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-amber-400 ml-auto" />
        ) : (
          <ChevronRight className="w-3 h-3 text-amber-400 ml-auto" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden"
          >
            <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap prose prose-invert prose-xs max-w-none">
              {brief}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ───

export default function QuestionTree(props: QuestionTreeProps) {
  const { trees } = props;

  if (trees.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No question trees yet</p>
        <p className="text-xs mt-1 text-gray-600">
          Answer a question and click &quot;Drill Deeper&quot; to start building a strategic decision tree
        </p>
      </div>
    );
  }

  // Separate trees (questions with children or depth > 0) from standalone questions
  const treesWithBranches = trees.filter(
    t => t.children.length > 0 || t.strategic_brief
  );
  const standaloneRoots = trees.filter(
    t => t.children.length === 0 && !t.strategic_brief
  );

  return (
    <div className="space-y-4">
      {/* Trees with branches */}
      {treesWithBranches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-medium text-gray-300">
              Decision Trees ({treesWithBranches.length})
            </h3>
          </div>
          {treesWithBranches.map((tree) => (
            <TreeNode key={tree.id} node={tree} {...props} />
          ))}
        </div>
      )}

      {/* Standalone questions (no tree yet) */}
      {standaloneRoots.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-400">
              Standalone Questions ({standaloneRoots.length})
            </h3>
          </div>
          {standaloneRoots.map((node) => (
            <TreeNode key={node.id} node={node} {...props} />
          ))}
        </div>
      )}
    </div>
  );
}
