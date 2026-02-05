/**
 * Mini Chat Panel
 * Compact scrollable message list for the TopBar dropdown widget
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Loader2, Terminal } from 'lucide-react';
import { useAnnetteStore, ChatMessage, QuickOption } from '@/stores/annetteStore';
import ToolExecutionInline from './ToolExecutionInline';

function MiniBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-3 h-3 text-cyan-400" />
        </div>
      )}

      <div className={`max-w-[85%] ${isUser ? 'order-first' : ''}`}>
        <div
          className={`px-2.5 py-1.5 rounded-xl text-xs leading-relaxed ${
            isUser
              ? 'bg-cyan-600/20 border border-cyan-500/20 text-slate-200 rounded-br-sm'
              : 'bg-slate-800/60 border border-slate-700/30 text-slate-300 rounded-bl-sm'
          }`}
        >
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        </div>

        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <p className="text-[9px] text-slate-600 mt-0.5 ml-1">
            [used {message.toolCalls.length} tool{message.toolCalls.length > 1 ? 's' : ''}]
          </p>
        )}

        {/* Inline CLI executions - compact view */}
        {!isUser && message.cliExecutions && message.cliExecutions.length > 0 && (
          <ToolExecutionInline
            executions={message.cliExecutions}
            messageId={message.id}
          />
        )}
      </div>

      {isUser && (
        <div className="w-5 h-5 rounded-full bg-slate-700/50 border border-slate-600/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-3 h-3 text-slate-400" />
        </div>
      )}
    </motion.div>
  );
}

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
          className="px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-medium hover:bg-cyan-500/20 transition-colors whitespace-nowrap"
        >
          {opt.label}
        </button>
      ))}
    </motion.div>
  );
}

export default function MiniChatPanel() {
  const messages = useAnnetteStore((s) => s.messages);
  const isLoading = useAnnetteStore((s) => s.isLoading);
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const displayMessages = messages.slice(-20);

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
      {displayMessages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center py-8">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 flex items-center justify-center mb-3">
            <Bot className="w-5 h-5 text-cyan-400/60" />
          </div>
          <p className="text-slate-500 text-xs">Ask Annette anything...</p>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {displayMessages.map((msg) => (
          <MiniBubble key={msg.id} message={msg} />
        ))}
      </AnimatePresence>

      {/* Quick options from last assistant message */}
      {!isLoading && displayMessages.length > 0 && (() => {
        const last = displayMessages[displayMessages.length - 1];
        if (last.role === 'assistant' && last.quickOptions && last.quickOptions.length > 0) {
          return <QuickOptionsBar options={last.quickOptions} />;
        }
        return null;
      })()}

      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
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
    </div>
  );
}
