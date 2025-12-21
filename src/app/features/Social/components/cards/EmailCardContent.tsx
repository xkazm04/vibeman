'use client';

import React, { useState } from 'react';
import type { FeedbackItem } from '../../lib/types/feedbackTypes';

interface EmailCardContentProps {
  item: FeedbackItem;
}

export default function EmailCardContent({ item }: EmailCardContentProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2">
      {/* From */}
      <div className="text-xs text-gray-400">
        <span className="text-gray-500">From: </span>
        <span className="text-gray-200">{item.author.name}</span>
      </div>

      {/* Subject */}
      {item.content.subject && (
        <div className="text-sm font-medium text-gray-200">
          {item.content.subject}
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-gray-700/40" />

      {/* Body excerpt */}
      <div className="text-xs text-gray-400 leading-relaxed">
        {expanded ? (
          <span>&quot;{item.content.body}&quot;</span>
        ) : (
          <span>&quot;{item.content.excerpt || item.content.body.substring(0, 100)}...&quot;</span>
        )}
      </div>

      {/* Read more */}
      {item.content.body.length > 100 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="text-[11px] text-cyan-400 hover:underline"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
