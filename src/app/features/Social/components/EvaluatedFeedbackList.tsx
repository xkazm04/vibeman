'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bug, Lightbulb, MessageCircle, CheckCircle2, Layers } from 'lucide-react';
import EvaluatedFeedbackItem from './EvaluatedFeedbackItem';
import type { EvaluatedFeedback, EvaluationCategory } from '../lib/types';

interface EvaluatedFeedbackListProps {
  feedback: EvaluatedFeedback[];
  onCreateTicket: (feedbackId: string) => void;
  onSendReply: (feedbackId: string) => void;
  creatingTicketFor?: string;
  sendingReplyFor?: string;
}

type FilterCategory = 'all' | EvaluationCategory;

const categoryTabs = [
  { category: 'all' as const, label: 'All', icon: Layers, color: 'gray' },
  { category: 'bug' as const, label: 'Bugs', icon: Bug, color: 'red' },
  { category: 'proposal' as const, label: 'Proposals', icon: Lightbulb, color: 'amber' },
  { category: 'feedback' as const, label: 'Feedback', icon: MessageCircle, color: 'emerald' },
];

export default function EvaluatedFeedbackList({
  feedback,
  onCreateTicket,
  onSendReply,
  creatingTicketFor,
  sendingReplyFor,
}: EvaluatedFeedbackListProps) {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');

  const filteredFeedback = useMemo(() => {
    if (activeCategory === 'all') return feedback;
    return feedback.filter(fb => fb.category === activeCategory);
  }, [feedback, activeCategory]);

  const categoryCounts = useMemo(() => ({
    all: feedback.length,
    bug: feedback.filter(fb => fb.category === 'bug').length,
    proposal: feedback.filter(fb => fb.category === 'proposal').length,
    feedback: feedback.filter(fb => fb.category === 'feedback').length,
  }), [feedback]);

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors: Record<string, { active: string; inactive: string; badge: string }> = {
      gray: {
        active: 'bg-gray-500/20 text-gray-300 border-gray-500/50',
        inactive: 'text-gray-400 hover:text-gray-300 hover:bg-gray-500/10',
        badge: 'bg-gray-500/30 text-gray-300',
      },
      red: {
        active: 'bg-red-500/20 text-red-300 border-red-500/50',
        inactive: 'text-gray-400 hover:text-red-300 hover:bg-red-500/10',
        badge: 'bg-red-500/30 text-red-300',
      },
      amber: {
        active: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
        inactive: 'text-gray-400 hover:text-amber-300 hover:bg-amber-500/10',
        badge: 'bg-amber-500/30 text-amber-300',
      },
      emerald: {
        active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
        inactive: 'text-gray-400 hover:text-emerald-300 hover:bg-emerald-500/10',
        badge: 'bg-emerald-500/30 text-emerald-300',
      },
    };
    return isActive ? colors[color].active : colors[color].inactive;
  };

  const getBadgeColor = (color: string) => {
    const colors: Record<string, string> = {
      gray: 'bg-gray-500/30 text-gray-300',
      red: 'bg-red-500/30 text-red-300',
      amber: 'bg-amber-500/30 text-amber-300',
      emerald: 'bg-emerald-500/30 text-emerald-300',
    };
    return colors[color];
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="w-5 h-5 text-purple-400" />
        <h2 className="text-lg font-semibold text-gray-200">Processed Items</h2>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-2 p-1 mb-4 bg-gray-800/40 rounded-lg border border-gray-700/40 overflow-x-auto">
        {categoryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.category;
          const count = categoryCounts[tab.category];

          return (
            <button
              key={tab.category}
              onClick={() => setActiveCategory(tab.category)}
              className={`
                relative flex items-center gap-2 px-3 py-2 rounded-md whitespace-nowrap
                text-sm font-medium transition-all duration-200
                border border-transparent
                ${getColorClasses(tab.color, isActive)}
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {count > 0 && (
                <span className={`
                  min-w-[20px] h-5 px-1.5 rounded-full text-xs font-medium
                  flex items-center justify-center
                  ${getBadgeColor(tab.color)}
                `}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Feedback list */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {filteredFeedback.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 text-gray-500"
            >
              <CheckCircle2 className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No processed items yet</p>
              <p className="text-xs text-gray-600 mt-1">
                Use AI Process to evaluate feedback
              </p>
            </motion.div>
          ) : (
            filteredFeedback.map((fb, index) => (
              <EvaluatedFeedbackItem
                key={fb.id}
                feedback={fb}
                index={index}
                onCreateTicket={onCreateTicket}
                onSendReply={onSendReply}
                isCreatingTicket={creatingTicketFor === fb.originalFeedbackId}
                isSendingReply={sendingReplyFor === fb.originalFeedbackId}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
