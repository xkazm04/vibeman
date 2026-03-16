/**
 * IntentRefinementModal — Pre-pipeline modal for goal clarification (G5)
 *
 * Calls the refine-intent API to get LLM-generated clarifying questions,
 * displays them for the user to answer, then returns the Q&A pairs as
 * a refinedIntent string for the pipeline.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Loader2, Sparkles } from 'lucide-react';
import { UniversalModal } from '@/components/UniversalModal';

interface Question {
  id: string;
  question: string;
  context: string;
}

interface IntentRefinementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (refinedIntent: string) => void;
  goalTitle: string;
  goalDescription: string;
}

export default function IntentRefinementModal({
  isOpen,
  onClose,
  onSubmit,
  goalTitle,
  goalDescription,
}: IntentRefinementModalProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/conductor/refine-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalTitle, goalDescription }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }));
        setError(data.error || 'Failed to generate questions');
        return;
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.questions)) {
        setQuestions(data.questions);
        // Initialize empty answers
        const initial: Record<string, string> = {};
        for (const q of data.questions) {
          initial[q.id] = '';
        }
        setAnswers(initial);
      } else {
        setError('No questions generated');
      }
    } catch {
      setError('Failed to connect to refinement API');
    } finally {
      setLoading(false);
    }
  }, [goalTitle, goalDescription]);

  useEffect(() => {
    if (isOpen && questions.length === 0 && !loading) {
      fetchQuestions();
    }
  }, [isOpen, questions.length, loading, fetchQuestions]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuestions([]);
      setAnswers({});
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    // Build refined intent from Q&A pairs
    const pairs = questions
      .map((q) => {
        const answer = answers[q.id]?.trim();
        if (!answer) return null;
        return `Q: ${q.question}\nA: ${answer}`;
      })
      .filter(Boolean);

    const refinedIntent = pairs.length > 0
      ? pairs.join('\n\n')
      : '';

    onSubmit(refinedIntent);
  };

  const handleSkip = () => {
    onSubmit('');
  };

  const answeredCount = Object.values(answers).filter(a => a.trim().length > 0).length;

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Refine Intent"
      subtitle="Answer clarifying questions to improve pipeline results"
      icon={MessageSquare}
      iconBgColor="from-purple-900/60 to-cyan-900/60"
      iconColor="text-purple-400"
      maxWidth="max-w-2xl"
      footerActions={[
        {
          icon: MessageSquare,
          label: 'Skip',
          onClick: handleSkip,
          variant: 'secondary',
          testId: 'skip-refinement-btn',
        },
        {
          icon: Sparkles,
          label: `Start Pipeline${answeredCount > 0 ? ` (${answeredCount} answers)` : ''}`,
          onClick: handleSubmit,
          variant: 'primary',
          testId: 'start-with-refinement-btn',
        },
      ]}
    >
      <div className="space-y-4">
        {/* Goal summary */}
        <div className="p-3 rounded-lg bg-gray-800/30 border border-gray-800/50">
          <div className="text-xs text-gray-500 mb-1">Goal</div>
          <div className="text-sm text-gray-300 font-medium">{goalTitle}</div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin mr-2" />
            <span className="text-sm text-gray-400">Analyzing goal for ambiguities...</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="p-3 rounded-lg bg-red-900/20 border border-red-800/30">
            <span className="text-sm text-red-400">{error}</span>
            <button
              onClick={fetchQuestions}
              className="ml-2 text-xs text-red-300 underline hover:text-red-200"
            >
              Retry
            </button>
          </div>
        )}

        {/* Questions */}
        {!loading && questions.length > 0 && (
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
                  placeholder="Your answer (optional)..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-gray-800/50 border border-gray-700 rounded-lg
                    text-gray-200 placeholder-gray-600 resize-none
                    focus:outline-none focus:border-purple-600 transition-colors"
                />
              </div>
            ))}
          </div>
        )}

        {/* Empty questions (no ambiguity found) */}
        {!loading && !error && questions.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400">No ambiguities detected in this goal.</p>
            <p className="text-xs text-gray-600 mt-1">Click "Start Pipeline" to proceed.</p>
          </div>
        )}
      </div>
    </UniversalModal>
  );
}
