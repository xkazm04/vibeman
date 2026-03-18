/**
 * IntentRefinementModal — Answer all codebase-aware clarifying questions
 *
 * Opened from the center toolbar button when the pipeline pauses at
 * the intent phase. All questions must be answered before submitting.
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { MessageSquare, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import { UniversalModal } from '@/components/UniversalModal';

export interface Question {
  id: string;
  question: string;
  context: string;
}

interface IntentRefinementModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  runId: string;
}

export default function IntentRefinementModal({
  isOpen,
  onClose,
  questions,
  runId,
}: IntentRefinementModalProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [expandedContext, setExpandedContext] = useState<Record<string, boolean>>({});

  // Stable question IDs string — only reinitialize answers when actual questions change
  const questionIds = useMemo(() => questions.map(q => q.id).join(','), [questions]);

  useEffect(() => {
    setAnswers(prev => {
      const next: Record<string, string> = {};
      for (const q of questions) {
        next[q.id] = prev[q.id] || '';
      }
      return next;
    });
  }, [questionIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const allAnswered = questions.length > 0 &&
    questions.every((q) => (answers[q.id] || '').trim().length > 0);

  const handleSubmit = async () => {
    if (!allAnswered || submitting) return;

    setSubmitting(true);
    try {
      const payload = questions.map((q) => ({
        questionId: q.id,
        answer: (answers[q.id] || '').trim(),
      }));

      const res = await fetch('/api/conductor/refine-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, answers: payload }),
      });

      if (res.ok) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = Object.values(answers).filter(a => a.trim().length > 0).length;

  const footerActions = [
    {
      icon: Sparkles,
      label: submitting
        ? 'Submitting...'
        : `Submit answers (${answeredCount}/${questions.length})`,
      onClick: handleSubmit,
      variant: 'primary' as const,
      disabled: !allAnswered || submitting,
      testId: 'submit-intent-answers-btn',
    },
  ];

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Clarifying Questions"
      subtitle="Answer all questions to refine the pipeline intent"
      icon={MessageSquare}
      iconBgColor="from-purple-900/60 to-cyan-900/60"
      iconColor="text-purple-400"
      maxWidth="max-w-3xl"
      footerActions={footerActions}
    >
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1">
          {questions.map((q) => (
            <div
              key={q.id}
              className={`w-2 h-2 rounded-full transition-colors ${
                (answers[q.id] || '').trim().length > 0
                  ? 'bg-purple-400'
                  : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
        <span className="text-[11px] text-gray-500">
          {answeredCount}/{questions.length} answered
        </span>
      </div>

      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={q.id} className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
            <div className="flex items-start gap-2 mb-2">
              <span className="text-xs text-purple-400 font-mono font-bold mt-0.5 shrink-0">
                Q{i + 1}
              </span>
              <div className="text-sm text-gray-200">{q.question}</div>
            </div>
            {q.context && (
              <button
                onClick={() => setExpandedContext(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-400 transition-colors mb-2 ml-5"
              >
                {expandedContext[q.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Codebase context
              </button>
            )}
            {q.context && expandedContext[q.id] && (
              <div className="ml-5 mb-2 px-3 py-2 bg-gray-900/60 border border-gray-700/30 rounded-lg text-[11px] text-gray-400 font-mono whitespace-pre-wrap">
                {q.context}
              </div>
            )}
            <textarea
              value={answers[q.id] || ''}
              onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              placeholder="Your answer..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-gray-800/50 border border-gray-700 rounded-lg
                text-gray-200 placeholder-gray-600 resize-y min-h-[72px]
                focus:outline-none focus:border-purple-600 transition-colors"
            />
          </div>
        ))}
      </div>
    </UniversalModal>
  );
}
