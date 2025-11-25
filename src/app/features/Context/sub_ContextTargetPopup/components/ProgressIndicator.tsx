/**
 * Progress Indicator Component
 *
 * Shows position in queue when multiple contexts need analysis
 */

import React from 'react';

interface ProgressIndicatorProps {
  currentIndex: number;
  queueLength: number;
}

export default function ProgressIndicator({ currentIndex, queueLength }: ProgressIndicatorProps) {
  if (queueLength <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-2">
      <span>
        Context {currentIndex + 1} of {queueLength}
      </span>
      <div className="flex gap-1">
        {Array.from({ length: Math.min(queueLength, 5) }).map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === currentIndex
                ? 'w-6 bg-cyan-400'
                : i < currentIndex
                ? 'w-2 bg-cyan-800'
                : 'w-2 bg-gray-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
