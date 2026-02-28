/**
 * Message List
 * Shared component for rendering chat messages in full or compact mode.
 * Used by ChatPanel and MiniChatPanel.
 */

'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, Loader2, GitBranch, ChevronUp, ChevronDown, RotateCcw, Trash2 } from 'lucide-react';
import type { ChatMessage, QuickOption, ConversationBranch } from '@/stores/annette/types';
import { useChatStore } from '@/stores/annette/chatStore';
import { ChatBubble, DecisionEventMarker } from './ChatBubble';

export type MessageListMode = 'full' | 'compact';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  mode: MessageListMode;
  showBranches?: boolean;
  branches?: ConversationBranch[];
  onRestoreBranch?: (id: string) => void;
  onDeleteBranch?: (id: string) => void;
  onBrowseCapabilities?: () => void;
  className?: string;
}

export default function MessageList({
  messages,
  isLoading,
  mode,
  showBranches = false,
  branches = [],
  onRestoreBranch,
  onDeleteBranch,
  onBrowseCapabilities,
  className = '',
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const [expandedBranchId, setExpandedBranchId] = useState<string | null>(null);

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
  }, [messages, isLoading]);

  const isFull = mode === 'full';

  return (
    <div 
      className={`flex-1 overflow-y-auto space-y-4 ${isFull ? 'px-4 py-4' : 'px-3 py-3 space-y-2.5'} ${className}`}
      role="log" 
      aria-live="polite" 
      aria-relevant="additions" 
      aria-label="Chat messages"
    >
      {messages.length === 0 && (
        <EmptyState mode={mode} onBrowse={onBrowseCapabilities} />
      )}

      {/* Branch count indicator for compact mode */}
      {!isFull && showBranches && branches.length > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 text-2xs text-amber-400/60">
          <GitBranch className="w-2.5 h-2.5" />
          <span>{branches.length} previous {branches.length === 1 ? 'attempt' : 'attempts'} saved</span>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {messages.map((msg, idx) => {
          // In full mode, show inline branch indicators
          if (isFull && showBranches && msg.role === 'user') {
            const branchesAtIndex = branches.filter(b => b.editedAtIndex === idx);
            if (branchesAtIndex.length > 0) {
              return (
                <div key={`branch-wrap-${msg.id}`}>
                  <BranchIndicator
                    branches={branchesAtIndex}
                    expandedId={expandedBranchId}
                    onToggle={(id) => setExpandedBranchId(prev => prev === id ? null : id)}
                    onRestore={onRestoreBranch || (() => {})}
                    onDelete={onDeleteBranch || (() => {})}
                  />
                  <ChatBubble message={msg} size={mode} />
                </div>
              );
            }
          }

          if (msg.role === 'system' && msg.decisionEvent) {
            return (
              <DecisionEventMarker 
                key={msg.id} 
                event={msg.decisionEvent} 
                content={msg.content} 
                size={mode} 
              />
            );
          } else if (msg.role !== 'system') {
            return <ChatBubble key={msg.id} message={msg} size={mode} />;
          }
          return null;
        })}
      </AnimatePresence>

      {/* Quick options from last assistant message */}
      {!isLoading && messages.length > 0 && (() => {
        const last = [...messages].reverse().find(m => m.role !== 'system');
        if (last && last.role === 'assistant' && last.quickOptions && last.quickOptions.length > 0) {
          return (
            <motion.div
              initial={{ opacity: 0, y: isFull ? 6 : 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-wrap gap-2 ${isFull ? 'pl-9' : 'pl-7 mt-1 gap-1.5'}`}
            >
              {last.quickOptions.map((opt: QuickOption, i: number) => (
                <button
                  key={i}
                  onClick={() => sendMessage(opt.message).catch(() => {})}
                  className={`
                    rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-medium hover:bg-cyan-500/20 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 outline-none
                    ${isFull ? 'px-3 py-1.5 text-xs' : 'px-2 py-1 text-xs whitespace-nowrap rounded-md'}
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          );
        }
        return null;
      })()}

      {isLoading && <LoadingIndicator mode={mode} />}

      <div ref={messagesEndRef} />

      {/* Screen reader announcement for loading/response states */}
      <span className="sr-only" role="status" aria-live="polite">
        {liveText}
      </span>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyState({ mode, onBrowse }: { mode: MessageListMode; onBrowse?: () => void }) {
  if (mode === 'compact') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-8">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 flex items-center justify-center mb-3">
          <Bot className="w-5 h-5 text-cyan-400/60" />
        </div>
        <p className="text-slate-500 text-xs">Ask Annette anything...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12">
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
        <Bot className="w-7 h-7 text-cyan-400/60" />
      </div>
      <p className="text-slate-400 text-sm">Ask me about your project, goals, or what to work on next.</p>
      <p className="text-slate-600 text-xs mt-1">I have access to your Brain context, directions, ideas, and more.</p>
      {onBrowse && (
        <button
          onClick={onBrowse}
          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors mx-auto focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900 outline-none"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Browse Capabilities
        </button>
      )}
    </div>
  );
}

function LoadingIndicator({ mode }: { mode: MessageListMode }) {
  if (mode === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        role="status"
        aria-label="Annette is thinking"
        className="flex items-center gap-2 pl-7 mt-1"
      >
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
          <Bot className="w-3 h-3 text-cyan-400" />
        </div>
        <div className="px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/30 rounded-bl-sm flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-cyan-400"
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
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
  );
}

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
