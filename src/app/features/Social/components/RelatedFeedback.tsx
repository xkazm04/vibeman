'use client';

import { Link2, ExternalLink, MessageSquare } from 'lucide-react';
import type { FeedbackItem } from '../lib/types/feedbackTypes';

interface RelatedItem {
  item: FeedbackItem;
  similarity: number;
}

interface Props {
  relatedItems: RelatedItem[];
  onItemClick?: (item: FeedbackItem) => void;
  maxItems?: number;
}

function SimilarityBar({ similarity }: { similarity: number }) {
  const percent = Math.round(similarity * 100);
  const color = percent >= 70 ? 'bg-green-500' : percent >= 40 ? 'bg-yellow-500' : 'bg-zinc-500';

  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[10px] text-zinc-400">{percent}%</span>
    </div>
  );
}

/**
 * RelatedFeedback
 * Shows a list of related feedback items with similarity scores.
 * Used in card detail modals to show auto-linked related items.
 */
export default function RelatedFeedback({ relatedItems, onItemClick, maxItems = 5 }: Props) {
  const displayed = relatedItems.slice(0, maxItems);

  if (displayed.length === 0) {
    return (
      <div className="text-sm text-zinc-500 py-4 text-center">
        No related feedback found.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
        <Link2 className="w-3.5 h-3.5" />
        <span>{displayed.length} Related Item{displayed.length !== 1 ? 's' : ''}</span>
      </div>

      {displayed.map(({ item, similarity }) => (
        <div
          key={item.id}
          onClick={() => onItemClick?.(item)}
          className="flex items-start gap-2 px-3 py-2 bg-zinc-800/30 border border-zinc-700/30 rounded-lg cursor-pointer hover:bg-zinc-800/50 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mt-0.5" />

          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-300 line-clamp-2">
              {item.content.subject || item.content.body}
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <SimilarityBar similarity={similarity} />
              <span className="text-[10px] text-zinc-500">{item.channel}</span>
              <span className="text-[10px] text-zinc-500">{item.priority}</span>
            </div>
          </div>

          <ExternalLink className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
        </div>
      ))}

      {relatedItems.length > maxItems && (
        <div className="text-[10px] text-zinc-500 text-center pt-1">
          +{relatedItems.length - maxItems} more related items
        </div>
      )}
    </div>
  );
}
