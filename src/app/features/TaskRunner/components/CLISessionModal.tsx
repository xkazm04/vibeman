'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Terminal,
  User,
  Bot,
  Wrench,
  AlertCircle,
  Send,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Minimize2,
  DollarSign,
} from 'lucide-react';
import BaseModal from '@/components/ui/BaseModal';
import { useManualSessionStore } from '../store/manualSessionStore';
import { ToolApprovalCard } from './ToolApprovalCard';
import type { ManualSessionEvent, ManualSessionStatus } from '../lib/manualSession.types';

// ============================================================================
// Event renderer
// ============================================================================

/** Format a USD amount with adaptive precision (e.g. $0.0042, $1.23). */
export function formatCost(usd: number): string {
  if (usd <= 0) return '$0.00';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

/** Compact token count (e.g. 850, 12.4k, 1.2M). */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) return `${tokens}`;
  if (tokens < 1_000_000) return `${(tokens / 1000).toFixed(1)}k`;
  return `${(tokens / 1_000_000).toFixed(1)}M`;
}

const EVENT_ICONS: Record<string, { icon: typeof User; colorClass: string }> = {
  user: { icon: User, colorClass: 'text-blue-400' },
  assistant: { icon: Bot, colorClass: 'text-purple-400' },
  system: { icon: Terminal, colorClass: 'text-cyan-400' },
  result: { icon: Terminal, colorClass: 'text-gray-400' },
  error: { icon: AlertCircle, colorClass: 'text-red-400' },
  input_needed: { icon: MessageCircle, colorClass: 'text-amber-400' },
  auto_approved: { icon: ShieldCheck, colorClass: 'text-green-400' },
  raw: { icon: Terminal, colorClass: 'text-gray-500' },
};

function extractText(event: ManualSessionEvent): string {
  const data = event.data as Record<string, unknown>;
  if (!data) return '';

  // User messages from store
  if (event.type === 'user' && typeof data.text === 'string') {
    return data.text;
  }

  // Assistant messages (stream-json format)
  if (event.type === 'assistant' && data.message) {
    const msg = data.message as Record<string, unknown>;
    const content = msg.content as Array<Record<string, unknown>> | undefined;
    if (content) {
      return content
        .filter((b) => b.type === 'text')
        .map((b) => b.text as string)
        .join('\n');
    }
  }

  // Tool use
  if (event.type === 'assistant' && data.message) {
    const msg = data.message as Record<string, unknown>;
    const content = msg.content as Array<Record<string, unknown>> | undefined;
    if (content) {
      const tools = content.filter((b) => b.type === 'tool_use');
      if (tools.length > 0) {
        return tools.map((t) => `Tool: ${t.name}`).join(', ');
      }
    }
  }

  // System events
  if (event.type === 'system') {
    const subtype = data.subtype as string;
    if (subtype === 'init') return `Session initialized (model: ${data.model || 'unknown'})`;
    return `System: ${subtype || 'event'}`;
  }

  // Result events
  if (event.type === 'result') {
    const cost = data.cost_usd as number | undefined;
    const duration = data.duration_ms as number | undefined;
    const parts: string[] = ['Turn complete'];
    if (cost) parts.push(`$${cost.toFixed(4)}`);
    if (duration) parts.push(`${(duration / 1000).toFixed(1)}s`);
    return parts.join(' · ');
  }

  // Error
  if (event.type === 'error') {
    return (data.error as string) || (data.message as string) || 'Unknown error';
  }

  // Input needed
  if (event.type === 'input_needed') {
    return 'Claude is waiting for your input';
  }

  // Auto-approved safe tools
  if (event.type === 'auto_approved') {
    const tools = (data.tools as string[]) || [];
    return `Auto-approved: ${tools.join(', ')}`;
  }

  // Raw
  if (data.raw) return String(data.raw);

  return JSON.stringify(data).slice(0, 200);
}

function EventRow({ event }: { event: ManualSessionEvent }) {
  const cfg = EVENT_ICONS[event.type] || EVENT_ICONS.raw;
  const Icon = cfg.icon;
  const text = extractText(event);

  if (event.type === 'auto_approved') {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 bg-green-500/5 border-l-2 border-green-500/30">
        <ShieldCheck className="w-3.5 h-3.5 text-green-400 shrink-0" />
        <span className="text-2xs text-green-400">{text}</span>
        <span className="text-2xs text-gray-600">
          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    );
  }

  if (event.type === 'input_needed') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/5 border-l-2 border-amber-500/30">
        <MessageCircle className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
        <span className="text-xs text-amber-300">{text}</span>
      </div>
    );
  }

  // Split text that contains both text and tool_use content blocks
  const isAssistant = event.type === 'assistant';
  const data = event.data as Record<string, unknown>;
  let toolUses: Array<{ name: string; id: string }> = [];
  let textContent = text;

  if (isAssistant && data?.message) {
    const msg = data.message as Record<string, unknown>;
    const content = msg.content as Array<Record<string, unknown>> | undefined;
    if (content) {
      toolUses = content
        .filter((b) => b.type === 'tool_use')
        .map((b) => ({ name: b.name as string, id: b.id as string }));
      textContent = content
        .filter((b) => b.type === 'text')
        .map((b) => b.text as string)
        .join('\n');
    }
  }

  return (
    <div className="px-4 py-2 hover:bg-gray-800/30 transition-colors">
      <div className="flex items-start gap-2">
        <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${cfg.colorClass}`} />
        <div className="flex-1 min-w-0">
          {textContent && (
            <p className="text-xs text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
              {textContent}
            </p>
          )}
          {toolUses.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {toolUses.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 text-2xs px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                >
                  <Wrench className="w-2.5 h-2.5" />
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className="text-2xs text-gray-600 shrink-0 tabular-nums">
          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Status bar
// ============================================================================

const STATUS_COLORS: Record<ManualSessionStatus, string> = {
  idle: 'text-gray-400',
  starting: 'text-blue-400',
  running: 'text-green-400',
  waiting_input: 'text-amber-400',
  waiting_approval: 'text-orange-400',
  completed: 'text-gray-500',
  failed: 'text-red-400',
};

// ============================================================================
// Main modal
// ============================================================================

interface CLISessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CLISessionModal({ isOpen, onClose }: CLISessionModalProps) {
  const activeSessionId = useManualSessionStore((s) => s.activeSessionId);
  const sessions = useManualSessionStore((s) => s.sessions);
  const sendMessage = useManualSessionStore((s) => s.sendMessage);
  const approveToolUse = useManualSessionStore((s) => s.approveToolUse);
  const denyToolUse = useManualSessionStore((s) => s.denyToolUse);

  const session = activeSessionId ? sessions[activeSessionId] : null;

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.events.length]);

  // Focus input when waiting for input
  useEffect(() => {
    if (session?.status === 'waiting_input' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [session?.status]);

  const handleSend = useCallback(async () => {
    if (!activeSessionId || !input.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(activeSessionId, input.trim());
      setInput('');
    } finally {
      setIsSending(false);
    }
  }, [activeSessionId, input, isSending, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  if (!session) return null;

  const canSendInput = session.status === 'waiting_input' && !isSending;
  const isWaitingApproval = session.status === 'waiting_approval' && session.pendingApprovals.length > 0;
  const statusColor = STATUS_COLORS[session.status] || 'text-gray-400';

  // Filter out raw/empty events for cleaner display
  const displayEvents = session.events.filter(
    (e) => e.type !== 'raw' || extractText(e).length > 0,
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-3xl"
      maxHeight="max-h-[80vh]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gray-800/80">
        <div className="flex items-center gap-3 min-w-0">
          <Terminal className="w-4 h-4 text-purple-400 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-gray-200 truncate">
              {session.label}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-2xs font-medium ${statusColor}`}>
                {session.status === 'waiting_input' ? 'Waiting for input' : session.status}
              </span>
              <span className="text-2xs text-gray-600">·</span>
              <span className="text-2xs text-gray-500">{session.projectName}</span>
              {session.turnCount > 0 && (
                <>
                  <span className="text-2xs text-gray-600">·</span>
                  <span
                    className="inline-flex items-center gap-0.5 text-2xs text-emerald-400 tabular-nums"
                    title={`${session.turnCount} turn${session.turnCount !== 1 ? 's' : ''} · ${formatTokens(session.totalTokens)} tokens · ${(session.totalDurationMs / 1000).toFixed(1)}s`}
                  >
                    <DollarSign className="w-2.5 h-2.5" />
                    {formatCost(session.totalCostUsd).replace('$', '')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-gray-700 transition-colors"
            title="Minimize (session keeps running)"
          >
            <Minimize2 className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Event stream */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto divide-y divide-gray-800/30"
      >
        {displayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bot className="w-10 h-10 text-gray-700 mb-3" />
            <p className="text-sm text-gray-500">Session started</p>
            <p className="text-xs text-gray-600 mt-1">
              Type your first message below to start chatting with Claude
            </p>
          </div>
        ) : (
          displayEvents.map((event, i) => <EventRow key={i} event={event} />)
        )}

        {/* Running indicator */}
        {session.status === 'running' && (
          <div className="flex items-center gap-2 px-4 py-2">
            <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
            <span className="text-xs text-gray-500">Claude is thinking...</span>
          </div>
        )}
      </div>

      {/* Tool approval card — shown when Claude proposes tool_use */}
      {isWaitingApproval && activeSessionId && (
        <ToolApprovalCard
          tools={session.pendingApprovals}
          onApprove={() => approveToolUse(activeSessionId)}
          onDeny={() => denyToolUse(activeSessionId)}
        />
      )}

      {/* Input area */}
      <div className="border-t border-gray-700/50 bg-gray-800/50 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isWaitingApproval
                ? 'Approve or deny the tool use above'
                : canSendInput
                  ? 'Type your message... (Enter to send, Shift+Enter for newline)'
                  : session.status === 'running'
                    ? 'Claude is processing...'
                    : session.status === 'completed'
                      ? 'Session completed'
                      : 'Waiting...'
            }
            disabled={!canSendInput}
            rows={1}
            className="flex-1 bg-gray-900/50 border border-gray-700/50 rounded-lg px-3 py-2
              text-xs text-gray-200 placeholder-gray-500
              focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20
              disabled:opacity-50 disabled:cursor-not-allowed
              resize-none min-h-[36px] max-h-[120px]"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={!canSendInput || !input.trim()}
            className="shrink-0 p-2 rounded-lg transition-colors
              bg-purple-500/20 text-purple-300 border border-purple-500/30
              hover:bg-purple-500/30 hover:text-purple-200
              disabled:opacity-30 disabled:cursor-not-allowed"
            title="Send message"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
