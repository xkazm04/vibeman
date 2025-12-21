'use client';

import React from 'react';
import { Star } from 'lucide-react';
import type { FeedbackItem } from '../../lib/types/feedbackTypes';

interface ReviewCardContentProps {
  item: FeedbackItem;
  variant?: 'trustpilot' | 'app_store';
}

export default function ReviewCardContent({ item, variant = 'trustpilot' }: ReviewCardContentProps) {
  const starColor = variant === 'trustpilot' ? 'fill-[#00b67a] text-[#00b67a]' : 'fill-orange-400 text-orange-400';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${i < (item.rating || 3) ? starColor : 'text-gray-600'}`}
            />
          ))}
        </div>
        {variant === 'app_store' && item.appVersion && (
          <span className="text-[10px] text-gray-500">{item.appVersion}</span>
        )}
      </div>
      <div className="text-sm text-gray-300 line-clamp-2">
        {item.content.body.substring(0, 80)}
      </div>
    </div>
  );
}
