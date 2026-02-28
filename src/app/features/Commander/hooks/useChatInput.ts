/**
 * useChatInput
 * Shared hook for chat input state, submit handler, and keyboard handling.
 * Used by both ChatPanel and MiniChatInput to eliminate duplicated logic.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useChatStore } from '@/stores/annette/chatStore';

export function useChatInput({ autoFocus = true }: { autoFocus?: boolean } = {}) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isLoading = useChatStore((s) => s.isLoading);
  const sendMessage = useChatStore((s) => s.sendMessage);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput('');
    try {
      await sendMessage(trimmed);
    } catch {
      // Send failed — restore the input so the user can retry
      setInput(trimmed);
    }
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return {
    input,
    setInput,
    inputRef,
    isLoading,
    handleSend,
    handleKeyDown,
    canSend: !!input.trim() && !isLoading,
  };
}
