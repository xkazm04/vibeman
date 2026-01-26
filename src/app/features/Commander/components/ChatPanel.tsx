/**
 * Chat Panel
 * Message display with input field and tool call visualization
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Bot, User, AlertCircle } from 'lucide-react';
import { useAnnetteStore, ChatMessage, QuickOption } from '@/stores/annetteStore';
import ToolCallDisplay from './ToolCallDisplay';
import ToolExecutionInline from './ToolExecutionInline';
import VoiceButton from './VoiceButton';

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-4 h-4 text-cyan-400" />
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-cyan-600/20 border border-cyan-500/20 text-slate-200 rounded-br-md'
              : 'bg-slate-800/60 border border-slate-700/30 text-slate-300 rounded-bl-md'
          }`}
        >
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        </div>

        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <ToolCallDisplay toolCalls={message.toolCalls} />
        )}

        {/* Inline CLI executions */}
        {!isUser && message.cliExecutions && message.cliExecutions.length > 0 && (
          <ToolExecutionInline
            executions={message.cliExecutions}
            messageId={message.id}
          />
        )}

        {!isUser && message.tokensUsed && (
          <p className="text-[10px] text-slate-600 mt-1 ml-1">
            {message.tokensUsed.total.toLocaleString()} tokens
          </p>
        )}
      </div>

      {isUser && (
        <div className="w-7 h-7 rounded-full bg-slate-700/50 border border-slate-600/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-4 h-4 text-slate-400" />
        </div>
      )}
    </motion.div>
  );
}

export default function ChatPanel() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = useAnnetteStore((s) => s.messages);
  const isLoading = useAnnetteStore((s) => s.isLoading);
  const error = useAnnetteStore((s) => s.error);
  const sendMessage = useAnnetteStore((s) => s.sendMessage);
  const setError = useAnnetteStore((s) => s.setError);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput('');
    await sendMessage(trimmed);
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
              <Bot className="w-7 h-7 text-cyan-400/60" />
            </div>
            <p className="text-slate-400 text-sm">Ask me about your project, goals, or what to work on next.</p>
            <p className="text-slate-600 text-xs mt-1">I have access to your Brain context, directions, ideas, and more.</p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>

        {/* Quick options from last assistant message */}
        {!isLoading && messages.length > 0 && (() => {
          const last = messages[messages.length - 1];
          if (last.role === 'assistant' && last.quickOptions && last.quickOptions.length > 0) {
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
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-colors"
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
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-xs">
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
