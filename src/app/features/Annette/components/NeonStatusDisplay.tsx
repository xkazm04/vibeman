'use client';

import React, { useMemo } from 'react';
import StatusChip, { StatusChipState, StatusChipTheme } from '@/app/components/ui/StatusChip';
import { AnnetteTheme } from './AnnettePanel';

export type BotMoodState = 'idle' | 'listening' | 'speaking' | 'error';

interface NeonStatusDisplayProps {
  message: string;
  theme: AnnetteTheme;
  isSpeaking: boolean;
  isListening?: boolean;
  isError?: boolean;
  volume?: number; // 0-1 scale for audio volume
}

/**
 * @deprecated This component is a wrapper around StatusChip for backward compatibility.
 * Use StatusChip directly from @/app/components/ui/StatusChip instead.
 */
export default function NeonStatusDisplay({
  message,
  theme,
  isSpeaking,
  isListening = false,
  isError = false,
  volume = 0.5,
}: NeonStatusDisplayProps) {
  // Map BotMoodState to StatusChipState
  const status: StatusChipState = useMemo(() => {
    if (isError) return 'error';
    if (isSpeaking) return 'processing';
    if (isListening) return 'active';
    return 'idle';
  }, [isError, isSpeaking, isListening]);

  // Map AnnetteTheme to StatusChipTheme (they're already compatible)
  const chipTheme: StatusChipTheme = theme;

  return (
    <div className="relative h-8 flex items-center overflow-hidden w-full">
      <StatusChip
        status={status}
        label={message}
        theme={chipTheme}
        animated={true}
        size="md"
        intensity={volume}
        className="w-full border-0 bg-transparent"
      />
    </div>
  );
}
