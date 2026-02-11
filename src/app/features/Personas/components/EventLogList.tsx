'use client';

import { useEffect, useState } from 'react';
import { usePersonaStore } from '@/stores/personaStore';
import { Zap, ChevronDown, ChevronUp, RefreshCw, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type EventFilter = 'all' | 'pending' | 'completed' | 'failed';

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  processing: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  failed: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  skipped: { bg: 'bg-secondary/50', text: 'text-muted-foreground/50', border: 'border-primary/10' },
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  webhook_received: 'text-blue-400',
  execution_completed: 'text-emerald-400',
  persona_action: 'text-purple-400',
  credential_event: 'text-amber-400',
  task_created: 'text-cyan-400',
  custom: 'text-primary',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function EventLogList() {
  const recentEvents = usePersonaStore((s) => s.recentEvents);
  const pendingEventCount = usePersonaStore((s) => s.pendingEventCount);
  const fetchRecentEvents = usePersonaStore((s) => s.fetchRecentEvents);
  const personas = usePersonaStore((s) => s.personas);

  const [filter, setFilter] = useState<EventFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentEvents(100);
    const interval = setInterval(() => fetchRecentEvents(100), 5000);
    return () => clearInterval(interval);
  }, [fetchRecentEvents]);

  const filteredEvents = filter === 'all'
    ? recentEvents
    : recentEvents.filter((e: any) => e.status === filter);

  const getPersonaName = (id: string | null) => {
    if (!id) return null;
    const p = personas.find((p: any) => p.id === id);
    return p?.name || id.slice(0, 12) + '...';
  };

  return (
    <div className="flex flex-col h-full p-6 pt-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {(['all', 'pending', 'completed', 'failed'] as EventFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filter === f
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-secondary/40 text-muted-foreground/50 hover:text-muted-foreground/70 border border-transparent'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'pending' && pendingEventCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-400">
                    {pendingEventCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => fetchRecentEvents(100)}
          className="p-2 hover:bg-secondary/60 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-muted-foreground/50" />
        </button>
      </div>

      {/* Event List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/30">
            <Zap className="w-10 h-10 mb-3" />
            <p className="text-sm">No events yet</p>
            <p className="text-xs mt-1">Events from webhooks, executions, and persona actions will appear here</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredEvents.map((event: any) => {
              const isExpanded = expandedId === event.id;
              const statusStyle = STATUS_COLORS[event.status] || STATUS_COLORS.pending;
              const typeColor = EVENT_TYPE_COLORS[event.event_type] || 'text-muted-foreground';

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-secondary/30 backdrop-blur-sm border border-primary/10 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : event.id)}
                    className="w-full p-3 flex items-center gap-3 text-left hover:bg-secondary/40 transition-colors"
                  >
                    {/* Status icon */}
                    {event.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : event.status === 'failed' ? (
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    ) : event.status === 'processing' ? (
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    )}

                    {/* Event type */}
                    <span className={`text-xs font-medium ${typeColor} flex-shrink-0`}>
                      {event.event_type}
                    </span>

                    {/* Source -> Target */}
                    <span className="text-xs text-muted-foreground/40 truncate flex-1">
                      {event.source_type}
                      {event.target_persona_id ? ` -> ${getPersonaName(event.target_persona_id)}` : ''}
                    </span>

                    {/* Status badge */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border} flex-shrink-0`}>
                      {event.status}
                    </span>

                    {/* Time */}
                    <span className="text-[11px] text-muted-foreground/30 flex-shrink-0 w-16 text-right">
                      {timeAgo(event.created_at)}
                    </span>

                    {/* Chevron */}
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0" />
                    )}
                  </button>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-primary/10"
                      >
                        <div className="p-3 space-y-2 text-xs">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-muted-foreground/40">Event ID:</span>
                              <span className="ml-2 text-foreground/60 font-mono">{event.id}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground/40">Project:</span>
                              <span className="ml-2 text-foreground/60">{event.project_id}</span>
                            </div>
                            {event.source_id && (
                              <div>
                                <span className="text-muted-foreground/40">Source ID:</span>
                                <span className="ml-2 text-foreground/60 font-mono">{event.source_id}</span>
                              </div>
                            )}
                            {event.processed_at && (
                              <div>
                                <span className="text-muted-foreground/40">Processed:</span>
                                <span className="ml-2 text-foreground/60">{new Date(event.processed_at).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                          {event.payload && (
                            <div>
                              <span className="text-muted-foreground/40 block mb-1">Payload:</span>
                              <pre className="bg-background/40 p-2 rounded-lg text-foreground/50 overflow-x-auto max-h-40 text-[11px]">
                                {typeof event.payload === 'string'
                                  ? JSON.stringify(JSON.parse(event.payload), null, 2)
                                  : JSON.stringify(event.payload, null, 2)}
                              </pre>
                            </div>
                          )}
                          {event.error_message && (
                            <div>
                              <span className="text-red-400/70 block mb-1">Error:</span>
                              <pre className="bg-red-500/5 p-2 rounded-lg text-red-400/70 text-[11px]">
                                {event.error_message}
                              </pre>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
