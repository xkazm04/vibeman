'use client';

import { useState } from 'react';
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Tag,
  MessageSquare,
} from 'lucide-react';
import type { FeedbackCluster } from '../lib/semanticClusterer';
import type { FeedbackItem } from '../lib/types/feedbackTypes';

interface Props {
  clusters: FeedbackCluster[];
  onItemClick?: (item: FeedbackItem) => void;
}

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return null;

  const colors: Record<string, string> = {
    angry: 'bg-red-500/10 text-red-400',
    frustrated: 'bg-orange-500/10 text-orange-400',
    disappointed: 'bg-amber-500/10 text-amber-400',
    neutral: 'bg-zinc-500/10 text-zinc-400',
    constructive: 'bg-blue-500/10 text-blue-400',
    helpful: 'bg-green-500/10 text-green-400',
    mocking: 'bg-purple-500/10 text-purple-400',
  };

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] ${colors[sentiment] || colors.neutral}`}>
      {sentiment}
    </span>
  );
}

function ClusterCard({
  cluster,
  onItemClick,
}: {
  cluster: FeedbackCluster;
  onItemClick?: (item: FeedbackItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const isUnclustered = cluster.label === 'Unclustered';

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        isUnclustered ? 'border-zinc-800/30 bg-zinc-900/20' : 'border-zinc-700/50 bg-zinc-800/30'
      }`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-zinc-800/50 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />
        )}

        <Layers className={`w-4 h-4 flex-shrink-0 ${isUnclustered ? 'text-zinc-600' : 'text-purple-400'}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isUnclustered ? 'text-zinc-500' : 'text-zinc-200'}`}>
              {cluster.label}
            </span>
            <span className="text-xs text-zinc-500">
              {cluster.size} item{cluster.size !== 1 ? 's' : ''}
            </span>
          </div>
          {cluster.centroidKeywords.length > 0 && !isUnclustered && (
            <div className="flex flex-wrap gap-1 mt-1">
              {cluster.centroidKeywords.slice(0, 4).map((kw) => (
                <span
                  key={kw}
                  className="px-1.5 py-0.5 bg-zinc-700/50 text-zinc-400 rounded text-[10px]"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>

        <SentimentBadge sentiment={cluster.averageSentiment} />
      </button>

      {/* Expanded items */}
      {expanded && (
        <div className="border-t border-zinc-800/50 divide-y divide-zinc-800/30">
          {cluster.items.map((item) => (
            <div
              key={item.id}
              onClick={() => onItemClick?.(item)}
              className="px-3 py-2 hover:bg-zinc-800/30 cursor-pointer transition-colors"
            >
              <div className="flex items-start gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-300 line-clamp-2">
                    {item.content.subject || item.content.body}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                    <span>{item.channel}</span>
                    <span>{item.priority}</span>
                    {item.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="flex items-center gap-0.5">
                        <Tag className="w-2.5 h-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClusterView({ clusters, onItemClick }: Props) {
  const sortedClusters = [...clusters].sort((a, b) => {
    // Put unclustered last
    if (a.label === 'Unclustered') return 1;
    if (b.label === 'Unclustered') return -1;
    return b.size - a.size;
  });

  const clusteredCount = clusters
    .filter((c) => c.label !== 'Unclustered')
    .reduce((sum, c) => sum + c.size, 0);
  const totalCount = clusters.reduce((sum, c) => sum + c.size, 0);

  return (
    <div className="space-y-3">
      {/* Header stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-zinc-200">Feedback Clusters</span>
        </div>
        <div className="text-xs text-zinc-500">
          {clusteredCount} of {totalCount} items clustered
        </div>
      </div>

      {/* Cluster list */}
      <div className="space-y-2">
        {sortedClusters.map((cluster) => (
          <ClusterCard key={cluster.id} cluster={cluster} onItemClick={onItemClick} />
        ))}
      </div>

      {clusters.length === 0 && (
        <div className="text-center py-8 text-zinc-500 text-sm">
          No clusters found. Add more feedback items to detect patterns.
        </div>
      )}
    </div>
  );
}
