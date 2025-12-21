'use client';

import React from 'react';
import type { FeedbackItem } from '../../lib/types/feedbackTypes';

interface InstagramCardContentProps {
  item: FeedbackItem;
}

export default function InstagramCardContent({ item }: InstagramCardContentProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold p-0.5">
          <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-purple-500 to-pink-500">
              {item.author.name.charAt(0)}
            </span>
          </div>
        </div>
        <div className="text-sm font-semibold text-gray-200">{item.author.handle || item.author.name}</div>
      </div>
      <div className="text-sm text-gray-300 line-clamp-2">
        {item.content.body.substring(0, 80)}
      </div>
    </div>
  );
}
