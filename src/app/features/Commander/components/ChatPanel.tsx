/**
 * Chat Panel
 * Message display with input field and tool call visualization
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, AlertCircle } from 'lucide-react';
import { useChatStore } from '@/stores/annette/chatStore';
import { useEditingStore } from '@/stores/annette/editingStore';
import CapabilityCatalog from './CapabilityCatalog';
import ContextIndicatorBar from './ContextIndicatorBar';
import VoiceButton from './VoiceButton';
import MessageList from './MessageList';
import { useChatInput } from '../hooks/useChatInput';

export default function ChatPanel() {
  const [catalogOpen, setCatalogOpen] = useState(false);

  const messages = useChatStore((s) => s.messages);
  const branches = useEditingStore((s) => s.branches);
  const restoreBranch = useEditingStore((s) => s.restoreBranch);
  const deleteBranch = useEditingStore((s) => s.deleteBranch);
  const projectId = useChatStore((s) => s.projectId);
  const error = useChatStore((s) => s.error);
  const setError = useChatStore((s) => s.setError);

  const { input, setInput, inputRef, isLoading, handleSend, handleKeyDown, canSend } = useChatInput();

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <MessageList
        messages={messages}
        isLoading={isLoading}
        mode="full"
        showBranches={true}
        branches={branches}
        onRestoreBranch={restoreBranch}
        onDeleteBranch={deleteBranch}
        onBrowseCapabilities={() => setCatalogOpen(true)}
      />

      {/* Error display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-300 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-xs focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 outline-none rounded" aria-label="Dismiss error">
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context indicator */}
      <ContextIndicatorBar projectId={projectId} />

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-800/50">
        <div className="flex items-center gap-2 bg-slate-800/40 border border-slate-700/30 rounded-xl px-3 py-2 focus-within:border-cyan-500/30 transition-colors">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Annette..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none disabled:opacity-50"
          />

          <VoiceButton />

          <button
            onClick={handleSend}
            disabled={!canSend}
            className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 outline-none"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <CapabilityCatalog
        isOpen={catalogOpen}
        onClose={() => setCatalogOpen(false)}
      />
    </div>
  );
}
