'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, Loader2, Save, Pencil } from 'lucide-react';
import { DbQuestion } from '@/app/db';

interface AnswerQuestionModalProps {
  question: DbQuestion | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (questionId: string, answer: string) => Promise<void>;
}

export default function AnswerQuestionModal({
  question,
  isOpen,
  onClose,
  onSave
}: AnswerQuestionModalProps) {
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }, []);

  // Reset state when modal opens with new question
  useEffect(() => {
    if (isOpen && question) {
      setAnswer(question.answer || '');
      setError(null);
      // Focus textarea and auto-resize after modal animation
      setTimeout(() => {
        textareaRef.current?.focus();
        autoResize();
      }, 100);
    }
  }, [isOpen, question?.id, autoResize]);

  const handleSave = async () => {
    if (!question || !answer.trim()) return;

    setSaving(true);
    setError(null);

    try {
      await onSave(question.id, answer.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save answer');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    // Escape to close
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const isEditing = Boolean(question?.answer);
  const previousAnswer = question?.answer || '';

  if (!question) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start gap-4 p-6 border-b border-gray-800">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 via-blue-500/10 to-cyan-500/20 border border-purple-500/30 flex-shrink-0">
                  <HelpCircle className="w-6 h-6 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-white leading-tight">
                      {isEditing ? 'Edit Answer' : 'Answer Question'}
                    </h2>
                    {isEditing && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <Pencil className="w-3 h-3" />
                        Editing
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {question.context_map_title}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Question */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Question
                  </label>
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4">
                    <p className="text-white">{question.question}</p>
                  </div>
                </div>

                {/* Previous answer preview (edit mode only) */}
                {isEditing && previousAnswer && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      Previous Answer
                    </label>
                    <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-3 text-sm text-gray-500 leading-relaxed line-clamp-4">
                      {previousAnswer}
                    </div>
                  </div>
                )}

                {/* Answer */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {isEditing ? 'Updated Answer' : 'Your Answer'}
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={answer}
                    onChange={(e) => { setAnswer(e.target.value); autoResize(); }}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter your answer..."
                    rows={3}
                    className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none overflow-y-auto"
                    style={{ maxHeight: '60vh' }}
                    disabled={saving}
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs text-gray-500">
                      Press Ctrl+Enter to save
                    </p>
                    <p className={`text-xs ${answer.length > 2000 ? 'text-amber-400' : 'text-gray-500'}`}>
                      {answer.length.toLocaleString()}{answer.length > 2000 ? ' / 2,000+ chars' : ' chars'}
                    </p>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-800">
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !answer.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isEditing ? 'Update Answer' : 'Save Answer'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
