'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, MessageSquare, CheckCheck, RefreshCw, Trash2 } from 'lucide-react';
import { usePersonaStore } from '@/stores/personaStore';
import type { PersonaMessage } from '@/app/features/Personas/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const priorityConfig: Record<string, { color: string; bgColor: string; borderColor: string; label: string }> = {
  high: { color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', label: 'High' },
  normal: { color: 'text-foreground/60', bgColor: 'bg-secondary/30', borderColor: 'border-primary/15', label: 'Normal' },
  low: { color: 'text-muted-foreground/50', bgColor: 'bg-muted/20', borderColor: 'border-muted-foreground/20', label: 'Low' },
};

type FilterType = 'all' | 'unread' | 'high';

const filterOptions: Array<{ id: FilterType; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'high', label: 'High Priority' },
];

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);
  if (diffSeconds < 5) return 'just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MessageList() {
  const messages = usePersonaStore((s) => s.messages);
  const messagesTotal = usePersonaStore((s) => s.messagesTotal);
  const fetchMessages = usePersonaStore((s) => s.fetchMessages);
  const markMessageAsRead = usePersonaStore((s) => s.markMessageAsRead);
  const markAllMessagesAsRead = usePersonaStore((s) => s.markAllMessagesAsRead);
  const deleteMessage = usePersonaStore((s) => s.deleteMessage);

  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getApiFilter = () => {
    switch (filter) {
      case 'unread': return { is_read: 0 };
      case 'high': return { priority: 'high' };
      default: return undefined;
    }
  };

  useEffect(() => {
    fetchMessages(true, getApiFilter());
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling every 10 seconds
  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchMessages(true, getApiFilter());
    }, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = () => {
    fetchMessages(false, getApiFilter());
  };

  const remaining = messagesTotal - messages.length;

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 pt-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4">
        {filterOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setFilter(opt.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              filter === opt.id
                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                : 'bg-secondary/30 text-muted-foreground/60 border-primary/15 hover:text-muted-foreground hover:bg-secondary/50'
            }`}
          >
            {opt.label}
          </button>
        ))}

        <div className="flex-1" />

        <button
          onClick={() => fetchMessages(true, getApiFilter())}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground/60 hover:text-muted-foreground border border-primary/15 hover:bg-secondary/50 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>

        <button
          onClick={() => markAllMessagesAsRead()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-400/80 hover:text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/15 transition-all"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          Mark All Read
        </button>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-secondary/40 border border-primary/15 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground/50">No messages yet</p>
            <p className="text-xs text-muted-foreground/30 mt-1">Messages from persona executions will appear here</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <MessageRow
              key={message.id}
              message={message}
              isExpanded={expandedId === message.id}
              onToggle={() => {
                setExpandedId(expandedId === message.id ? null : message.id);
                if (!message.is_read) markMessageAsRead(message.id);
              }}
              onDelete={() => deleteMessage(message.id)}
            />
          ))}
        </AnimatePresence>

        {/* Load More */}
        {remaining > 0 && (
          <button
            onClick={handleLoadMore}
            className="w-full py-2.5 text-sm text-muted-foreground/60 hover:text-muted-foreground bg-secondary/20 hover:bg-secondary/40 rounded-xl border border-primary/15 transition-all mt-2"
          >
            Load More ({remaining} remaining)
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message Row
// ---------------------------------------------------------------------------

function MessageRow({
  message,
  isExpanded,
  onToggle,
  onDelete,
}: {
  message: PersonaMessage;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const priority = priorityConfig[message.priority] || priorityConfig.normal;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="rounded-xl border border-primary/15 bg-secondary/20 hover:bg-secondary/30 transition-colors overflow-hidden"
    >
      {/* Main row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
      >
        {/* Expand icon */}
        <div className="text-muted-foreground/40">
          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>

        {/* Unread dot */}
        {!message.is_read && (
          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
        )}

        {/* Persona icon + name */}
        <div className="flex items-center gap-2 min-w-[120px]">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-xs border border-primary/15"
            style={{ backgroundColor: (message.persona_color || '#6366f1') + '15' }}
          >
            {message.persona_icon || '🤖'}
          </div>
          <span className="text-xs text-muted-foreground/60 truncate max-w-[80px]">
            {message.persona_name || 'Unknown'}
          </span>
        </div>

        {/* Title */}
        <span className={`flex-1 text-sm truncate ${message.is_read ? 'text-foreground/60' : 'text-foreground/90 font-medium'}`}>
          {message.title || message.content.slice(0, 80)}
        </span>

        {/* Priority badge */}
        {message.priority !== 'normal' && (
          <div className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${priority.bgColor} ${priority.color} ${priority.borderColor}`}>
            {priority.label}
          </div>
        )}

        {/* Time */}
        <span className="text-xs text-muted-foreground/40 min-w-[70px] text-right">
          {formatRelativeTime(message.created_at)}
        </span>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-primary/15 space-y-3">
              {/* Content */}
              <div>
                <div className="text-[11px] font-mono text-muted-foreground/50 uppercase mb-1.5">Content</div>
                <div className={`text-sm leading-relaxed ${message.content_type === 'markdown' ? 'prose prose-sm prose-invert max-w-none' : 'text-foreground/70'}`}>
                  {message.content}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground/40">
                <span>ID: <span className="font-mono">{message.id}</span></span>
                {message.execution_id && (
                  <span>Execution: <span className="font-mono">{message.execution_id}</span></span>
                )}
                <span>Type: {message.content_type}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
