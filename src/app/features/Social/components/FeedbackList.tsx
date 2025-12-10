'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import FeedbackChannelTabs from './FeedbackChannelTabs';
import FeedbackItem from './FeedbackItem';
import { getFeedbackByChannel, getChannelCounts } from '../lib/mockData';
import type { FeedbackChannel } from '../lib/types';

export default function FeedbackList() {
  const [activeChannel, setActiveChannel] = useState<FeedbackChannel>('all');

  const counts = useMemo(() => getChannelCounts(), []);
  const feedbackItems = useMemo(
    () => getFeedbackByChannel(activeChannel),
    [activeChannel]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header with tabs */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          Social Feedback
        </h2>
      </div>

      {/* Channel tabs */}
      <div className="mb-4">
        <FeedbackChannelTabs
          activeChannel={activeChannel}
          onChannelChange={setActiveChannel}
          counts={counts}
        />
      </div>

      {/* Feedback list */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {feedbackItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 text-gray-500"
            >
              <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No feedback in this channel</p>
            </motion.div>
          ) : (
            feedbackItems.map((feedback, index) => (
              <FeedbackItem
                key={feedback.id}
                feedback={feedback}
                index={index}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Summary footer */}
      <div className="mt-4 pt-3 border-t border-gray-700/50 text-xs text-gray-500">
        Showing {feedbackItems.length} feedback items
        {activeChannel !== 'all' && ` from ${activeChannel}`}
      </div>
    </div>
  );
}
