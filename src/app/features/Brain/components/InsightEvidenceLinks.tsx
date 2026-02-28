'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink,
  Loader2,
  ChevronDown,
  Radio,
  RotateCcw,
} from 'lucide-react';
import type { EvidenceRef } from '@/app/db/models/brain.types';

export interface ResolvedEvidence {
  refType: EvidenceRef['type'];
  id: string;
  summary: string;
  status?: string;
  contextName?: string | null;
  contextMapTitle?: string;
  createdAt: string;
}

interface Props {
  evidence: EvidenceRef[];
}

const TYPE_COLORS: Record<string, { border: string; dot: string }> = {
  direction: {
    border: 'border-l-blue-500',
    dot: 'bg-blue-500',
  },
  signal: {
    border: 'border-l-amber-500',
    dot: 'bg-amber-500',
  },
  reflection: {
    border: 'border-l-purple-500',
    dot: 'bg-purple-500',
  },
};

const STATUS_BORDER: Record<string, string> = {
  accepted: 'border-l-green-500',
  rejected: 'border-l-red-500',
};

const STATUS_DOT: Record<string, string> = {
  accepted: 'bg-green-500',
  rejected: 'bg-red-500',
};

const TYPE_ICON: Record<string, typeof ExternalLink> = {
  direction: ExternalLink,
  signal: Radio,
  reflection: RotateCcw,
};

/**
 * Format a date string as relative time (e.g. "2d ago", "3h ago", "just now")
 */
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (isNaN(diffMs) || diffMs < 0) return '';

  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/**
 * Truncate text to maxLen characters with ellipsis.
 */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '…';
}

/**
 * Placeholder skeleton shown while evidence cards are off-screen.
 */
function EvidencePlaceholder({ count }: { count: number }) {
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-zinc-600 italic">
        {count} evidence link{count !== 1 ? 's' : ''} — scroll to load
      </div>
      {Array.from({ length: Math.min(count, 3) }, (_, i) => (
        <div key={i} className="h-6 bg-zinc-800/20 rounded animate-pulse" />
      ))}
    </div>
  );
}

/**
 * Renders typed evidence refs as a compact stacked list.
 * Uses IntersectionObserver to defer fetching until scrolled into view,
 * and releases data when scrolled out to reduce memory pressure.
 * Click any row to expand full details.
 */
export default function InsightEvidenceLinks({ evidence }: Props) {
  const [resolved, setResolved] = useState<Record<string, ResolvedEvidence | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver: track visibility
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin: '100px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fetch when visible, release when not visible
  const fetchEvidence = useCallback(async () => {
    if (evidence.length === 0) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/brain/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceRefs: evidence }),
      });
      const data = await res.json();
      if (data.success) {
        setResolved(data.evidence);
      }
    } catch {
      // Silent failure — evidence links are non-critical
    } finally {
      setIsLoading(false);
      setHasFetchedOnce(true);
    }
  }, [evidence]);

  useEffect(() => {
    if (!isVisible) {
      if (hasFetchedOnce && Object.keys(resolved).length > 0) {
        setResolved({});
      }
      return;
    }

    if (Object.keys(resolved).length === 0 && !isLoading) {
      fetchEvidence();
    }
  }, [isVisible, hasFetchedOnce, resolved, isLoading, fetchEvidence]);

  if (evidence.length === 0) {
    return <span className="text-xs text-zinc-600 italic">No evidence linked</span>;
  }

  return (
    <div ref={containerRef}>
      {!isVisible && !hasFetchedOnce ? (
        <EvidencePlaceholder count={evidence.length} />
      ) : isLoading ? (
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Loading evidence...</span>
        </div>
      ) : (
        <div>
          <div className="text-[10px] text-zinc-500 mb-1">
            Evidence ({evidence.length})
          </div>
          <div className="space-y-px">
            {evidence.map((ref) => {
              const item = resolved[ref.id];
              const isExpanded = expandedId === ref.id;
              const Icon = TYPE_ICON[ref.type] || ExternalLink;

              if (item === null) {
                return (
                  <div
                    key={ref.id}
                    className="flex items-center gap-1.5 px-2 py-1 border-l-2 border-l-zinc-700 bg-zinc-800/10 text-[11px] text-zinc-600 italic"
                  >
                    <Icon className="w-2.5 h-2.5 flex-shrink-0" />
                    <span>Deleted ({ref.id.slice(0, 8)})</span>
                  </div>
                );
              }

              if (item === undefined) {
                return (
                  <div
                    key={ref.id}
                    className="flex items-center gap-1.5 px-2 py-1 border-l-2 border-l-zinc-700 bg-zinc-800/10 text-[11px] text-zinc-500 font-mono"
                  >
                    <Icon className="w-2.5 h-2.5 flex-shrink-0 opacity-50" />
                    <span className="text-[9px] uppercase text-zinc-600">{ref.type}</span>
                    <span>{ref.id.slice(0, 12)}…</span>
                  </div>
                );
              }

              // For directions with status, use status colors; otherwise use type colors
              const colors = item.status && STATUS_BORDER[item.status]
                ? { border: STATUS_BORDER[item.status], dot: STATUS_DOT[item.status] || 'bg-zinc-500' }
                : TYPE_COLORS[ref.type] || TYPE_COLORS.direction;

              return (
                <div key={ref.id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : ref.id)}
                    className={`w-full flex items-center gap-1.5 px-2 py-1 border-l-2 ${colors.border} bg-zinc-800/20 hover:bg-zinc-800/40 transition-colors text-left cursor-pointer`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                    <span className="flex-1 min-w-0 text-[11px] text-zinc-300 truncate">
                      {truncate(item.summary, 40)}
                    </span>
                    <span className="text-[9px] uppercase text-zinc-600 flex-shrink-0">{ref.type}</span>
                    <span className="text-[10px] text-zinc-600 flex-shrink-0">
                      {relativeTime(item.createdAt)}
                    </span>
                    <ChevronDown
                      className={`w-2.5 h-2.5 text-zinc-600 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className={`px-3 py-2 border-l-2 ${colors.border} bg-zinc-800/30 space-y-1`}>
                          <p className="text-xs text-zinc-300 leading-relaxed">
                            {item.summary}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                            {item.contextName && <span>{item.contextName}</span>}
                            {item.contextMapTitle && !item.contextName && <span>{item.contextMapTitle}</span>}
                            {item.status && (
                              <>
                                <span>·</span>
                                <span className={item.status === 'accepted' ? 'text-green-400' : item.status === 'rejected' ? 'text-red-400' : 'text-zinc-400'}>
                                  {item.status}
                                </span>
                              </>
                            )}
                            <span>·</span>
                            <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
