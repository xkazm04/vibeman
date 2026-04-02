/**
 * ProcessingIndicator
 *
 * Shows elapsed time during chat processing, especially useful for
 * CLI mode where responses can take 30-60 seconds.
 */

'use client';

import { useState, useEffect } from 'react';
import { useChatStore } from '@/stores/annette/chatStore';

export function ProcessingIndicator() {
  const processingStartedAt = useChatStore((s) => s.processingStartedAt);
  const isLoading = useChatStore((s) => s.isLoading);
  const mode = useChatStore((s) => s.conversationMode);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!processingStartedAt || !isLoading) {
      setElapsed(0);
      return;
    }
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - processingStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [processingStartedAt, isLoading]);

  if (!isLoading) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400">
      <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
      <span>
        {mode === 'cli' ? 'Deep processing' : 'Thinking'}
        {elapsed > 0 && ` \u00b7 ${elapsed}s`}
      </span>
    </div>
  );
}
