/**
 * IntentRefinementModal — Answer all codebase-aware clarifying questions
 *
 * Opened from the center toolbar button when the pipeline pauses at
 * the intent phase. All questions must be answered before submitting.
 */

'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';
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

  // Reinitialize answers when questions change
  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const q of questions) {
      initial[q.id] = '';
    }
    setAnswers(initial);
  }, [questions]);

  // Clear answers when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAnswers({});
      setSubmitting(false);
    }
  }, [isOpen]);

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
      maxWidth="max-w-2xl"
      footerActions={footerActions}
    >
      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={q.id} className="space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-xs text-purple-400 font-mono font-bold mt-0.5">
                Q{i + 1}
              </span>
              <div>
                <div className="text-sm text-gray-200">{q.question}</div>
                {q.context && (
                  <div className="text-[11px] text-gray-500 mt-0.5">{q.context}</div>
                )}
              </div>
            </div>
            <textarea
              value={answers[q.id] || ''}
              onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              placeholder="Your answer..."
              rows={2}
              className="w-full px-3 py-2 text-sm bg-gray-800/50 border border-gray-700 rounded-lg
                text-gray-200 placeholder-gray-600 resize-none
                focus:outline-none focus:border-purple-600 transition-colors"
            />
          </div>
        ))}
      </div>
    </UniversalModal>
  );
}
