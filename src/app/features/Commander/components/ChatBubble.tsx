/**
 * ChatBubble
 * Unified message bubble component used by both ChatPanel (full) and MiniChatPanel (compact).
 * Accepts a `size` prop to switch between full and compact rendering.
 */

'use client';

import { motion } from 'framer-motion';
import { Bot, User, Check, X, Clock, Bell } from 'lucide-react';
import type { ChatMessage, DecisionEvent } from '@/stores/annetteStore';
import ToolCallDisplay from './ToolCallDisplay';
import ToolExecutionInline from './ToolExecutionInline';

export type BubbleSize = 'full' | 'compact';

// ── Size-specific config ─────────────────────────────────────────────────────

const SIZE = {
  full: {
    gap: 'gap-2.5',
    avatarBox: 'w-7 h-7',
    avatarIcon: 'w-4 h-4',
    maxWidth: 'max-w-[80%]',
    bubble: 'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
    userCorner: 'rounded-br-md',
    assistantCorner: 'rounded-bl-md',
    tokenText: 'text-[10px]',
  },
  compact: {
    gap: 'gap-2',
    avatarBox: 'w-5 h-5',
    avatarIcon: 'w-3 h-3',
    maxWidth: 'max-w-[85%]',
    bubble: 'px-2.5 py-1.5 rounded-xl text-xs leading-relaxed',
    userCorner: 'rounded-br-sm',
    assistantCorner: 'rounded-bl-sm',
    tokenText: 'text-[9px]',
  },
} as const;

// ── MessageBubble ────────────────────────────────────────────────────────────

export function ChatBubble({ message, size = 'full' }: { message: ChatMessage; size?: BubbleSize }) {
  const isUser = message.role === 'user';
  const s = SIZE[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: size === 'full' ? 8 : 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${s.gap} ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className={`${s.avatarBox} rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <Bot className={`${s.avatarIcon} text-cyan-400`} />
        </div>
      )}

      <div className={`${s.maxWidth} ${isUser ? 'order-first' : ''}`}>
        <div
          className={`${s.bubble} ${
            isUser
              ? `bg-cyan-600/20 border border-cyan-500/20 text-slate-200 ${s.userCorner}`
              : `bg-slate-800/60 border border-slate-700/30 text-slate-300 ${s.assistantCorner}`
          }`}
        >
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        </div>

        {/* Tool calls: full shows ToolCallDisplay, compact shows count */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          size === 'full' ? (
            <ToolCallDisplay toolCalls={message.toolCalls} />
          ) : (
            <p className="text-[9px] text-slate-600 mt-0.5 ml-1">
              [used {message.toolCalls.length} tool{message.toolCalls.length > 1 ? 's' : ''}]
            </p>
          )
        )}

        {/* Inline CLI executions */}
        {!isUser && message.cliExecutions && message.cliExecutions.length > 0 && (
          <ToolExecutionInline
            executions={message.cliExecutions}
            messageId={message.id}
          />
        )}

        {/* Token count (full only) */}
        {size === 'full' && !isUser && message.tokensUsed && (
          <p className={`${s.tokenText} text-slate-600 mt-1 ml-1`}>
            {message.tokensUsed.total.toLocaleString()} tokens
          </p>
        )}
      </div>

      {isUser && (
        <div className={`${s.avatarBox} rounded-full bg-slate-700/50 border border-slate-600/30 flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <User className={`${s.avatarIcon} text-slate-400`} />
        </div>
      )}
    </motion.div>
  );
}

// ── DecisionEventMarker ──────────────────────────────────────────────────────

const DECISION_ICON = { accepted: Check, dismissed: X, snoozed: Clock, arrived: Bell };

const DECISION_STYLE = {
  full: {
    accepted: 'border-green-500/20 bg-green-500/5 text-green-400',
    dismissed: 'border-slate-600/20 bg-slate-700/10 text-slate-500',
    snoozed: 'border-amber-500/20 bg-amber-500/5 text-amber-400',
    arrived: 'border-cyan-500/20 bg-cyan-500/5 text-cyan-400',
  },
  compact: {
    accepted: 'text-green-400/70',
    dismissed: 'text-slate-500/70',
    snoozed: 'text-amber-400/70',
    arrived: 'text-cyan-400/70',
  },
} as const;

export function DecisionEventMarker({
  event,
  content,
  size = 'full',
}: {
  event: DecisionEvent;
  content: string;
  size?: BubbleSize;
}) {
  const Icon = DECISION_ICON[event.action];

  if (size === 'compact') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center">
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] ${DECISION_STYLE.compact[event.action]}`}>
          <Icon className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="truncate max-w-[200px]">{content}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center">
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${DECISION_STYLE.full[event.action]}`}>
        <Icon className="w-3 h-3 flex-shrink-0" />
        <span className="truncate max-w-[400px]">{content}</span>
      </div>
    </motion.div>
  );
}
