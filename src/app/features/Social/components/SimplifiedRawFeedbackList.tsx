'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inbox } from 'lucide-react';
import RawFeedbackItem from './RawFeedbackItem';
import type { RawFeedback } from '../lib/types';

interface SimplifiedRawFeedbackListProps {
  feedback: RawFeedback[];
  isProcessing: boolean;
}

export default function SimplifiedRawFeedbackList({
  feedback,
  isProcessing,
}: SimplifiedRawFeedbackListProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Inbox className="w-5 h-5 text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-200">Raw Feedback</h2>
        <span className="text-sm text-gray-500">({feedback.length})</span>
      </div>

      {/* Feedback list */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {feedback.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 text-gray-500"
            >
              <Inbox className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No pending feedback</p>
              <p className="text-xs text-gray-600 mt-1">All items have been processed</p>
            </motion.div>
          ) : (
            feedback.map((fb, index) => (
              <RawFeedbackItem
                key={fb.id}
                feedback={fb}
                index={index}
                isExiting={isProcessing}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
