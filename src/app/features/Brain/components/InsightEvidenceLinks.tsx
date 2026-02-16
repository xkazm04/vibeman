'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink,
  Loader2,
  ChevronDown,
} from 'lucide-react';

export interface DirectionSummary {
  id: string;
  summary: string;
  status: string;
  contextName: string | null;
  contextMapTitle: string;
  createdAt: string;
}

interface Props {
  evidenceIds: string[];
}

const statusBorder: Record<string, string> = {
  accepted: 'border-l-green-500',
  rejected: 'border-l-red-500',
  pending: 'border-l-zinc-500',
};

const statusDot: Record<string, string> = {
  accepted: 'bg-green-500',
  rejected: 'bg-red-500',
  pending: 'bg-zinc-500',
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
 * Renders evidence direction IDs as a compact stacked list.
 * Uses IntersectionObserver to defer fetching until scrolled into view,
 * and releases data when scrolled out to reduce memory pressure.
 * Click any row to expand full details.
 */
export default function InsightEvidenceLinks({ evidenceIds }: Props) {
  const [directions, setDirections] = useState<Record<string, DirectionSummary | null>>({});
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
  const fetchDirections = useCallback(async () => {
    if (evidenceIds.length === 0) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/brain/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceIds }),
      });
      const data = await res.json();
      if (data.success) {
        setDirections(data.directions);
      }
    } catch {
      // Silent failure — evidence links are non-critical
    } finally {
      setIsLoading(false);
      setHasFetchedOnce(true);
    }
  }, [evidenceIds]);

  useEffect(() => {
    if (!isVisible) {
      if (hasFetchedOnce && Object.keys(directions).length > 0) {
        setDirections({});
      }
      return;
    }

    if (Object.keys(directions).length === 0 && !isLoading) {
      fetchDirections();
    }
  }, [isVisible, hasFetchedOnce, directions, isLoading, fetchDirections]);

  if (evidenceIds.length === 0) {
    return <span className="text-xs text-zinc-600 italic">No evidence linked</span>;
  }

  return (
    <div ref={containerRef}>
      {!isVisible && !hasFetchedOnce ? (
        <EvidencePlaceholder count={evidenceIds.length} />
      ) : isLoading ? (
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Loading evidence...</span>
        </div>
      ) : (
        <div>
          <div className="text-[10px] text-zinc-500 mb-1">
            Evidence ({evidenceIds.length})
          </div>
          <div className="space-y-px">
            {evidenceIds.map((id) => {
              const direction = directions[id];
              const isExpanded = expandedId === id;

              if (direction === null) {
                return (
                  <div
                    key={id}
                    className="flex items-center gap-1.5 px-2 py-1 border-l-2 border-l-zinc-700 bg-zinc-800/10 text-[11px] text-zinc-600 italic"
                  >
                    <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                    <span>Deleted ({id.slice(0, 8)})</span>
                  </div>
                );
              }

              if (direction === undefined) {
                return (
                  <div
                    key={id}
                    className="px-2 py-1 border-l-2 border-l-zinc-700 bg-zinc-800/10 text-[11px] text-zinc-500 font-mono"
                  >
                    {id.slice(0, 12)}…
                  </div>
                );
              }

              const border = statusBorder[direction.status] || statusBorder.pending;
              const dot = statusDot[direction.status] || statusDot.pending;

              return (
                <div key={id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : id)}
                    className={`w-full flex items-center gap-1.5 px-2 py-1 border-l-2 ${border} bg-zinc-800/20 hover:bg-zinc-800/40 transition-colors text-left cursor-pointer`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                    <span className="flex-1 min-w-0 text-[11px] text-zinc-300 truncate">
                      {truncate(direction.summary, 40)}
                    </span>
                    <span className="text-[10px] text-zinc-600 flex-shrink-0">
                      {relativeTime(direction.createdAt)}
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
                        <div className={`px-3 py-2 border-l-2 ${border} bg-zinc-800/30 space-y-1`}>
                          <p className="text-xs text-zinc-300 leading-relaxed">
                            {direction.summary}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                            <span>{direction.contextName || direction.contextMapTitle}</span>
                            <span>·</span>
                            <span className={direction.status === 'accepted' ? 'text-green-400' : direction.status === 'rejected' ? 'text-red-400' : 'text-zinc-400'}>
                              {direction.status}
                            </span>
                            <span>·</span>
                            <span>{new Date(direction.createdAt).toLocaleDateString()}</span>
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
