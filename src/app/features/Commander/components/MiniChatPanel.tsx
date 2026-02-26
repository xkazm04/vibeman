/**
 * Mini Chat Panel
 * Compact scrollable message list for the TopBar dropdown widget
 */

'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, GitBranch } from 'lucide-react';
import { useAnnetteStore, QuickOption } from '@/stores/annetteStore';
import { ChatBubble, DecisionEventMarker } from './ChatBubble';

function QuickOptionsBar({ options }: { options: QuickOption[] }) {
  const sendMessage = useAnnetteStore((s) => s.sendMessage);

  const handleClick = useCallback((opt: QuickOption) => {
    sendMessage(opt.message);
  }, [sendMessage]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-1.5 pl-7 mt-1"
    >
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={() => handleClick(opt)}
          className="px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors whitespace-nowrap"
        >
          {opt.label}
        </button>
      ))}
    </motion.div>
  );
}

export default function MiniChatPanel() {
  const messages = useAnnetteStore((s) => s.messages);
  const branches = useAnnetteStore((s) => s.branches);
  const isLoading = useAnnetteStore((s) => s.isLoading);
  const endRef = useRef<HTMLDivElement>(null);

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
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const displayMessages = messages.slice(-20);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5" role="log" aria-live="polite" aria-relevant="additions" aria-label="Chat messages">
      {displayMessages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center py-8">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 flex items-center justify-center mb-3">
            <Bot className="w-5 h-5 text-cyan-400/60" />
          </div>
          <p className="text-slate-500 text-xs">Ask Annette anything...</p>
        </div>
      )}

      {/* Branch count indicator */}
      {branches.length > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 text-2xs text-amber-400/60">
          <GitBranch className="w-2.5 h-2.5" />
          <span>{branches.length} previous {branches.length === 1 ? 'attempt' : 'attempts'} saved</span>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {displayMessages.map((msg) =>
          msg.role === 'system' && msg.decisionEvent ? (
            <DecisionEventMarker key={msg.id} event={msg.decisionEvent} content={msg.content} size="compact" />
          ) : msg.role !== 'system' ? (
            <ChatBubble key={msg.id} message={msg} size="compact" />
          ) : null
        )}
      </AnimatePresence>

      {/* Quick options from last assistant message */}
      {!isLoading && displayMessages.length > 0 && (() => {
        const last = [...displayMessages].reverse().find(m => m.role !== 'system');
        if (last && last.role === 'assistant' && last.quickOptions && last.quickOptions.length > 0) {
          return <QuickOptionsBar options={last.quickOptions} />;
        }
        return null;
      })()}

      {isLoading && (
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
      )}

      <div ref={endRef} />

      {/* Screen reader announcement for loading/response states */}
      <span className="sr-only" role="status" aria-live="polite">
        {liveText}
      </span>
    </div>
  );
}
