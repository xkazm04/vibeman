/**
 * Mini Chat Input
 * Compact text input for the TopBar dropdown widget
 */

'use client';

import { Send } from 'lucide-react';
import { useChatInput } from '../hooks/useChatInput';

export default function MiniChatInput() {
  const { input, setInput, inputRef, isLoading, handleSend, handleKeyDown, canSend } = useChatInput();

  return (
    <div className="px-3 pb-3 pt-2 border-t border-slate-800/50">
      <div className="flex items-center gap-1.5 bg-slate-800/40 border border-slate-700/30 rounded-lg px-2.5 py-1.5 focus-within:border-cyan-500/30 transition-colors">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          disabled={isLoading}
          className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-600 outline-none disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="p-1.5 rounded-md bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
