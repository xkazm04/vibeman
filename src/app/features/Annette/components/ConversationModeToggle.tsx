/**
 * ConversationModeToggle
 *
 * Switches between API (fast, Haiku) and CLI (deep, Claude Agent SDK) modes.
 */

'use client';

import { useChatStore } from '@/stores/annette/chatStore';

export function ConversationModeToggle() {
  const mode = useChatStore((s) => s.conversationMode);
  const setMode = useChatStore((s) => s.setConversationMode);

  return (
    <div className="flex items-center gap-2 text-xs">
      <button
        onClick={() => setMode('api')}
        className={`px-2 py-1 rounded transition-colors ${
          mode === 'api'
            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
            : 'text-gray-500 hover:text-gray-400'
        }`}
      >
        Fast
      </button>
      <button
        onClick={() => setMode('cli')}
        className={`px-2 py-1 rounded transition-colors ${
          mode === 'cli'
            ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
            : 'text-gray-500 hover:text-gray-400'
        }`}
      >
        Deep
      </button>
    </div>
  );
}
