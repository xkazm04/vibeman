/**
 * Chat Panel
 * Message display with input field and tool call visualization
 */

'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Bot, AlertCircle, Sparkles, GitBranch, RotateCcw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAnnetteStore, QuickOption, type ConversationBranch } from '@/stores/annetteStore';
import { ChatBubble, DecisionEventMarker } from './ChatBubble';
import CapabilityCatalog from './CapabilityCatalog';
import ContextIndicatorBar from './ContextIndicatorBar';
import VoiceButton from './VoiceButton';
import { useChatInput } from '../hooks/useChatInput';

export default function ChatPanel() {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [expandedBranchId, setExpandedBranchId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = useAnnetteStore((s) => s.messages);
  const branches = useAnnetteStore((s) => s.branches);
  const restoreBranch = useAnnetteStore((s) => s.restoreBranch);
  const deleteBranch = useAnnetteStore((s) => s.deleteBranch);
  const projectId = useAnnetteStore((s) => s.projectId);
  const error = useAnnetteStore((s) => s.error);
  const setError = useAnnetteStore((s) => s.setError);
  const sendMessage = useAnnetteStore((s) => s.sendMessage);

  const { input, setInput, inputRef, isLoading, handleSend, handleKeyDown, canSend } = useChatInput();

  // Track loading transitions for aria-live announcements
  const prevLoadingRef = useRef(false);
  const liveText = useMemo(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = isLoading;
    if (isLoading) return 'Annette is thinking';
    if (wasLoading && !isLoading) return 'Annette responded';
    return '';
  }, [isLoading]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" role="log" aria-live="polite" aria-relevant="additions" aria-label="Chat messages">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
              <Bot className="w-7 h-7 text-cyan-400/60" />
            </div>
            <p className="text-slate-400 text-sm">Ask me about your project, goals, or what to work on next.</p>
            <p className="text-slate-600 text-xs mt-1">I have access to your Brain context, directions, ideas, and more.</p>
            <button
              onClick={() => setCatalogOpen(true)}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors mx-auto focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 outline-none"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Browse Capabilities
            </button>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((msg, idx) => {
            // Check if any branch was created from this position
            const branchesAtIndex = branches.filter(b => b.editedAtIndex === idx);
            return (
              <div key={msg.id}>
                {/* Branch indicator - show when branches exist at this user message position */}
                {msg.role === 'user' && branchesAtIndex.length > 0 && (
                  <BranchIndicator
                    branches={branchesAtIndex}
                    expandedId={expandedBranchId}
                    onToggle={(id) => setExpandedBranchId(prev => prev === id ? null : id)}
                    onRestore={restoreBranch}
                    onDelete={deleteBranch}
                  />
                )}
                {msg.role === 'system' && msg.decisionEvent ? (
                  <DecisionEventMarker event={msg.decisionEvent} content={msg.content} size="full" />
                ) : msg.role !== 'system' ? (
                  <ChatBubble message={msg} size="full" />
                ) : null}
              </div>
            );
          })}
        </AnimatePresence>

        {/* Quick options from last assistant message */}
        {!isLoading && messages.length > 0 && (() => {
          const last = [...messages].reverse().find(m => m.role !== 'system');
          if (last && last.role === 'assistant' && last.quickOptions && last.quickOptions.length > 0) {
            return (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-2 pl-9"
              >
                {last.quickOptions.map((opt: QuickOption, i: number) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(opt.message)}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 outline-none"
                  >
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            );
          }
          return null;
        })()}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            role="status"
            aria-label="Annette is thinking"
            className="flex items-center gap-2 text-slate-500 text-sm pl-9"
          >
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Thinking...</span>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

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

      {/* Screen reader announcement for loading/response states */}
      <span className="sr-only" role="status" aria-live="polite">
        {liveText}
      </span>
    </div>
  );
}

// ── Branch Indicator ──────────────────────────────────────────────────────────

function BranchIndicator({
  branches,
  expandedId,
  onToggle,
  onRestore,
  onDelete,
}: {
  branches: ConversationBranch[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="mb-2">
      {branches.map((branch) => {
        const isExpanded = expandedId === branch.id;
        const userMsg = branch.messages.find(m => m.role === 'user');
        const preview = userMsg?.content || branch.originalText;

        return (
          <motion.div
            key={branch.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-1"
          >
            <button
              onClick={() => onToggle(branch.id)}
              className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/15 hover:border-amber-500/30 text-amber-400/70 hover:text-amber-400 text-xs transition-colors"
            >
              <GitBranch className="w-3 h-3 flex-shrink-0" />
              <span className="truncate flex-1 text-left">
                Previous: &ldquo;{preview.length > 50 ? preview.slice(0, 50) + '...' : preview}&rdquo;
              </span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-1 ml-4 pl-3 border-l-2 border-amber-500/20 space-y-2 py-2"
                >
                  {branch.messages.filter(m => m.role !== 'system').map((msg) => (
                    <div
                      key={msg.id}
                      className={`px-3 py-2 rounded-lg text-xs ${
                        msg.role === 'user'
                          ? 'bg-cyan-600/10 border border-cyan-500/10 text-slate-300'
                          : 'bg-slate-800/40 border border-slate-700/20 text-slate-400'
                      }`}
                    >
                      <span className="text-2xs uppercase tracking-wider text-slate-500 block mb-0.5">
                        {msg.role === 'user' ? 'You' : 'Annette'}
                      </span>
                      <div className="whitespace-pre-wrap break-words line-clamp-4">{msg.content}</div>
                    </div>
                  ))}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onRestore(branch.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restore
                    </button>
                    <button
                      onClick={() => onDelete(branch.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-700/30 border border-slate-600/20 text-slate-400 hover:text-red-400 hover:border-red-500/20 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Discard
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
