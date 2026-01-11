'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, CheckCircle2 } from 'lucide-react';
import { DbQuestion } from '@/app/db';
import QuestionRow from './QuestionRow';

interface GroupedQuestions {
  contextMapId: string;
  contextMapTitle: string;
  questions: DbQuestion[];
}

interface QuestionsListProps {
  grouped: GroupedQuestions[];
  onSaveAnswer: (questionId: string, answer: string) => Promise<void>;
  onDeleteQuestion: (questionId: string) => Promise<void>;
  loading?: boolean;
}

export default function QuestionsList({
  grouped,
  onSaveAnswer,
  onDeleteQuestion,
  loading = false
}: QuestionsListProps) {
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(
    new Set(grouped.map(g => g.contextMapId))
  );

  const toggleGroup = (contextMapId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(contextMapId)) {
        next.delete(contextMapId);
      } else {
        next.add(contextMapId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <div className="w-6 h-6 border-2 border-gray-500 border-t-transparent rounded-full animate-spin mr-3" />
        Loading questions...
      </div>
    );
  }

  if (grouped.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <HelpCircle className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No questions yet</p>
        <p className="text-sm text-gray-500 mt-1">
          Select contexts and generate questions to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map((group) => {
        const isExpanded = expandedGroups.has(group.contextMapId);
        const answeredCount = group.questions.filter(q => q.status === 'answered').length;
        const totalCount = group.questions.length;

        return (
          <motion.div
            key={group.contextMapId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/40 backdrop-blur-sm rounded-xl border border-gray-700/40 overflow-hidden"
          >
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.contextMapId)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-700/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <h3 className="text-lg font-semibold text-white">
                  {group.contextMapTitle}
                </h3>
                <span className="text-sm text-gray-400">
                  ({totalCount} question{totalCount !== 1 ? 's' : ''})
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Progress indicator */}
                {answeredCount > 0 && (
                  <div className="flex items-center gap-1 text-sm text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{answeredCount}/{totalCount}</span>
                  </div>
                )}

                {/* Expand/collapse icon */}
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </motion.div>
              </div>
            </button>

            {/* Questions */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {/* Column Headers */}
                  <div className="grid grid-cols-[1fr_1.5fr_auto] gap-4 px-4 py-2 bg-gray-700/20 text-xs text-gray-400 uppercase tracking-wider">
                    <div>Question</div>
                    <div>Answer</div>
                    <div className="w-[72px]">Actions</div>
                  </div>

                  {/* Question Rows */}
                  <div className="p-2 space-y-2">
                    <AnimatePresence mode="popLayout">
                      {group.questions.map((question) => (
                        <QuestionRow
                          key={question.id}
                          question={question}
                          onSave={onSaveAnswer}
                          onDelete={onDeleteQuestion}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
