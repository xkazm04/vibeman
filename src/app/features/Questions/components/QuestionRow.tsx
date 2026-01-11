'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Trash2, Check, Loader2, Goal } from 'lucide-react';
import { DbQuestion } from '@/app/db';

interface QuestionRowProps {
  question: DbQuestion;
  onSave: (questionId: string, answer: string) => Promise<void>;
  onDelete: (questionId: string) => Promise<void>;
}

export default function QuestionRow({ question, onSave, onDelete }: QuestionRowProps) {
  const [answer, setAnswer] = useState(question.answer || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAnswered = question.status === 'answered';
  const hasUnsavedChanges = answer !== (question.answer || '') && answer.trim().length > 0;

  const handleSave = async () => {
    if (!answer.trim()) return;

    setSaving(true);
    setError(null);
    try {
      await onSave(question.id, answer.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this question?')) return;

    setDeleting(true);
    setError(null);
    try {
      await onDelete(question.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`
        grid grid-cols-[1fr_1.5fr_auto] gap-4 items-start p-3 rounded-lg
        ${isAnswered ? 'bg-green-900/10 border border-green-800/30' : 'bg-gray-800/30'}
      `}
    >
      {/* Question Column */}
      <div className="text-sm">
        <p className="text-gray-200 leading-relaxed">{question.question}</p>
        {question.goal_id && (
          <div className="flex items-center gap-1 mt-2 text-xs text-green-400">
            <Goal className="w-3 h-3" />
            <span>Goal created</span>
          </div>
        )}
      </div>

      {/* Answer Input Column */}
      <div className="relative">
        {isAnswered ? (
          <div className="bg-gray-800/50 rounded-lg p-2 text-sm text-gray-300">
            <p className="leading-relaxed">{question.answer}</p>
            <div className="flex items-center gap-1 mt-2 text-xs text-green-400">
              <Check className="w-3 h-3" />
              <span>Answered</span>
            </div>
          </div>
        ) : (
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer... (Ctrl+Enter to save)"
            rows={2}
            className="
              w-full bg-gray-700/50 border border-gray-600/50 rounded-lg
              px-3 py-2 text-sm text-gray-200
              placeholder:text-gray-500
              focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
              resize-none
            "
          />
        )}
        {error && (
          <p className="absolute -bottom-5 left-0 text-xs text-red-400">{error}</p>
        )}
      </div>

      {/* Actions Column */}
      <div className="flex items-center gap-1">
        {!isAnswered && (
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsavedChanges}
            className={`
              p-2 rounded-lg transition-all
              ${hasUnsavedChanges
                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                : 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
              }
            `}
            title="Save answer (creates a Goal)"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
          </button>
        )}

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="
            p-2 rounded-lg transition-all
            bg-gray-700/30 text-gray-400
            hover:bg-red-500/20 hover:text-red-400
          "
          title="Delete question"
        >
          {deleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </motion.div>
  );
}
