'use client';

import React from 'react';
import type { FeedbackItem } from '../../lib/types/feedbackTypes';

interface ChatCardContentProps {
  item: FeedbackItem;
}

export default function ChatCardContent({ item }: ChatCardContentProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-green-400">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span>Live Chat</span>
      </div>
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg rounded-bl-none p-2 text-sm text-gray-200 shadow-sm border border-green-900/40">
        {item.content.body.substring(0, 60)}...
      </div>
    </div>
  );
}
