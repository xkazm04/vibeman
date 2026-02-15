'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
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

const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  accepted: { icon: <CheckCircle className="w-3 h-3" />, color: 'text-green-400' },
  rejected: { icon: <XCircle className="w-3 h-3" />, color: 'text-red-400' },
  pending: { icon: <Clock className="w-3 h-3" />, color: 'text-zinc-400' },
};

/**
 * Placeholder skeleton shown while evidence cards are off-screen.
 */
function EvidencePlaceholder({ count }: { count: number }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-zinc-600 italic">
        {count} evidence card{count !== 1 ? 's' : ''} — scroll to load
      </div>
      {Array.from({ length: Math.min(count, 3) }, (_, i) => (
        <div key={i} className="h-8 bg-zinc-800/20 rounded animate-pulse" />
      ))}
    </div>
  );
}

/**
 * Renders evidence direction IDs as clickable, resolved cards.
 * Uses IntersectionObserver to defer fetching until scrolled into view,
 * and releases data when scrolled out to reduce memory pressure.
 */
export default function InsightEvidenceLinks({ evidenceIds }: Props) {
  const [directions, setDirections] = useState<Record<string, DirectionSummary | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver: track visibility
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin: '100px' } // preload 100px before entering viewport
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
      // Unload data when scrolled out of view (only if we loaded before)
      if (hasFetchedOnce && Object.keys(directions).length > 0) {
        setDirections({});
      }
      return;
    }

    // Visible — fetch if we don't have data yet
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
        <div className="space-y-1.5">
          <div className="text-xs text-zinc-500 mb-1">
            Evidence ({evidenceIds.length} direction{evidenceIds.length !== 1 ? 's' : ''}):
          </div>
          {evidenceIds.map((id) => {
            const direction = directions[id];

            if (direction === null) {
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 px-2 py-1.5 bg-zinc-800/20 rounded text-xs text-zinc-600 italic"
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">Deleted direction ({id.slice(0, 8)}...)</span>
                </div>
              );
            }

            if (direction === undefined) {
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 px-2 py-1.5 bg-zinc-800/20 rounded text-xs text-zinc-500"
                >
                  <span className="font-mono truncate">{id.slice(0, 12)}...</span>
                </div>
              );
            }

            const config = statusConfig[direction.status] || statusConfig.pending;

            return (
              <div
                key={id}
                className="flex items-start gap-2 px-2 py-1.5 bg-zinc-800/30 rounded border border-zinc-800/50 hover:border-zinc-700/50 transition-colors"
              >
                <span className={`flex-shrink-0 mt-0.5 ${config.color}`}>
                  {config.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-zinc-300 truncate" title={direction.summary}>
                    {direction.summary}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-zinc-500">
                      {direction.contextName || direction.contextMapTitle}
                    </span>
                    <span className={`text-[10px] ${config.color}`}>
                      {direction.status}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
