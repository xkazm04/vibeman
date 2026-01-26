'use client';

import { useEffect, useState } from 'react';
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
 * Renders evidence direction IDs as clickable, resolved cards.
 * Fetches direction summaries on mount and displays them inline.
 */
export default function InsightEvidenceLinks({ evidenceIds }: Props) {
  const [directions, setDirections] = useState<Record<string, DirectionSummary | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (fetched || evidenceIds.length === 0) return;

    const fetchDirections = async () => {
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
        setFetched(true);
      }
    };

    fetchDirections();
  }, [evidenceIds, fetched]);

  if (evidenceIds.length === 0) {
    return <span className="text-xs text-zinc-600 italic">No evidence linked</span>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Loading evidence...</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="text-xs text-zinc-500 mb-1">
        Evidence ({evidenceIds.length} direction{evidenceIds.length !== 1 ? 's' : ''}):
      </div>
      {evidenceIds.map((id) => {
        const direction = directions[id];

        if (direction === null) {
          // Direction was deleted
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
          // Not yet resolved (shouldn't happen after loading)
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
  );
}
