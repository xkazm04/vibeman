'use client';

import React from 'react';
import type { FeedbackItem } from '../../lib/types/feedbackTypes';

interface FacebookCardContentProps {
  item: FeedbackItem;
}

export default function FacebookCardContent({ item }: FacebookCardContentProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-[#1877f2] flex items-center justify-center text-white text-xs font-bold">
          {item.author.name.charAt(0)}
        </div>
        <div className="text-sm font-semibold text-gray-200">{item.author.name}</div>
      </div>
      <div className="text-sm text-gray-300 line-clamp-2 bg-gray-800/60 backdrop-blur-sm p-2 rounded-lg">
        {item.content.body.substring(0, 80)}
      </div>
    </div>
  );
}
