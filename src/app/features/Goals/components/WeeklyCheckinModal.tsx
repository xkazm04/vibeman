'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, MessageSquare } from 'lucide-react';
import { Goal } from '@/types';
import GoalModalShell from '../sub_GoalModal/components/GoalModalShell';
import { duration, easing } from '@/lib/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface CheckinEntry {
  goalId: string;
  confidence: number;
  note: string;
}

interface WeeklyCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: Goal[];
  projectId: string;
  onSubmit: (checkins: CheckinEntry[]) => Promise<void>;
}

const CONFIDENCE_LABELS = ['', 'At Risk', 'Struggling', 'On Track', 'Strong', 'Confident'];
const CONFIDENCE_COLORS = [
  '',
  'bg-red-500/80 border-red-400',
  'bg-orange-500/80 border-orange-400',
  'bg-yellow-500/80 border-yellow-400',
  'bg-blue-500/80 border-blue-400',
  'bg-green-500/80 border-green-400',
];
const CONFIDENCE_TEXT_COLORS = ['', 'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-blue-400', 'text-green-400'];

export default function WeeklyCheckinModal({ isOpen, onClose, goals, projectId, onSubmit }: WeeklyCheckinModalProps) {
  const prefersReduced = useReducedMotion();
  const activeGoals = goals.filter(g => g.status === 'open' || g.status === 'in_progress');

  const [entries, setEntries] = useState<Record<string, CheckinEntry>>(() => {
    const initial: Record<string, CheckinEntry> = {};
    for (const g of activeGoals) {
      initial[g.id] = { goalId: g.id, confidence: 3, note: '' };
    }
    return initial;
  });
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setConfidence = useCallback((goalId: string, confidence: number) => {
    setEntries(prev => ({
      ...prev,
      [goalId]: { ...prev[goalId], confidence },
    }));
  }, []);

  const setNote = useCallback((goalId: string, note: string) => {
    setEntries(prev => ({
      ...prev,
      [goalId]: { ...prev[goalId], note },
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      await onSubmit(Object.values(entries));
      onClose();
    } finally {
      setSubmitting(false);
    }
  }, [entries, onSubmit, onClose]);

  if (activeGoals.length === 0) return null;

  return (
    <GoalModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Weekly Confidence Check-in"
      subtitle={`Rate your confidence for ${activeGoals.length} active goal${activeGoals.length !== 1 ? 's' : ''}`}
      icon={ClipboardCheck}
      iconBgColor="from-emerald-800/60 to-cyan-900/60"
      iconColor="text-emerald-300"
      maxWidth="max-w-lg"
    >
      <div className="space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar px-1">
        {activeGoals.map((goal, idx) => {
          const entry = entries[goal.id];
          if (!entry) return null;
          const isExpanded = expandedNote === goal.id;

          return (
            <motion.div
              key={goal.id}
              initial={prefersReduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: duration.normal, ease: easing.entrance }}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3"
            >
              {/* Goal title */}
              <p className="text-sm font-medium text-foreground/90 truncate">{goal.title}</p>

              {/* Confidence rating buttons */}
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(level => (
                  <button
                    key={level}
                    onClick={() => setConfidence(goal.id, level)}
                    className={
                      'flex-1 h-9 rounded-lg border text-xs font-semibold transition-all ' +
                      (entry.confidence === level
                        ? CONFIDENCE_COLORS[level] + ' text-white shadow-sm scale-105'
                        : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:border-white/20')
                    }
                    aria-label={`Confidence ${level}: ${CONFIDENCE_LABELS[level]}`}
                  >
                    {level}
                  </button>
                ))}
              </div>

              {/* Confidence label */}
              <div className="flex items-center justify-between">
                <span className={'text-xs font-medium ' + CONFIDENCE_TEXT_COLORS[entry.confidence]}>
                  {CONFIDENCE_LABELS[entry.confidence]}
                </span>
                <button
                  onClick={() => setExpandedNote(isExpanded ? null : goal.id)}
                  className="flex items-center gap-1 text-2xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  <MessageSquare className="w-3 h-3" />
                  {entry.note ? 'Edit note' : 'Add note'}
                </button>
              </div>

              {/* Note textarea */}
              {isExpanded && (
                <motion.div
                  initial={prefersReduced ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  transition={{ duration: duration.normal }}
                >
                  <textarea
                    value={entry.note}
                    onChange={(e) => setNote(goal.id, e.target.value)}
                    placeholder="What's affecting your confidence?"
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                    rows={2}
                  />
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Submit */}
      <div className="mt-4 flex justify-end gap-3 px-1">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Submit Check-in'}
        </button>
      </div>
    </GoalModalShell>
  );
}
