'use client';

import React from 'react';
import type { FeedbackItem } from '../../lib/types/feedbackTypes';

interface XCardContentProps {
  item: FeedbackItem;
}

export default function XCardContent({ item }: XCardContentProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold">
          {item.author.name.charAt(0)}
        </div>
        <div>
          <div className="text-sm font-bold text-white">{item.author.name}</div>
          <div className="text-xs text-gray-500">{item.author.handle}</div>
        </div>
      </div>
      <div className="text-sm text-white/90 line-clamp-2">{item.content.body.substring(0, 100)}</div>
    </div>
  );
}
