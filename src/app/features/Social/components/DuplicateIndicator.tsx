'use client';

import { useState } from 'react';
import { Copy, Link2, ExternalLink, AlertCircle } from 'lucide-react';
import type { DuplicateGroup } from '../lib/duplicateDetector';
import type { FeedbackItem } from '../lib/types/feedbackTypes';

interface Props {
  duplicateGroup?: DuplicateGroup;
  duplicateOf?: { item: FeedbackItem; similarity: number };
  compact?: boolean;
  onViewItem?: (item: FeedbackItem) => void;
}

/**
 * DuplicateIndicator
 * Shows a badge/indicator when a feedback item is a duplicate or has duplicates.
 * Can show in compact mode (just a badge) or expanded mode (with details).
 */
export default function DuplicateIndicator({
  duplicateGroup,
  duplicateOf,
  compact = false,
  onViewItem,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  // Compact mode: just show a badge
  if (compact) {
    if (duplicateGroup && duplicateGroup.duplicates.length > 0) {
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[10px] cursor-pointer hover:bg-amber-500/20"
          title={`${duplicateGroup.duplicates.length} duplicate${duplicateGroup.duplicates.length !== 1 ? 's' : ''} found`}
          onClick={() => setExpanded(!expanded)}
        >
          <Copy className="w-3 h-3" />
          {duplicateGroup.duplicates.length}
        </span>
      );
    }

    if (duplicateOf) {
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-500/10 text-zinc-400 rounded text-[10px] cursor-pointer hover:bg-zinc-500/20"
          title={`Duplicate of another item (${Math.round(duplicateOf.similarity * 100)}% similar)`}
          onClick={() => onViewItem?.(duplicateOf.item)}
        >
          <Link2 className="w-3 h-3" />
          dup
        </span>
      );
    }

    return null;
  }

  // Full mode: show details
  if (duplicateGroup && duplicateGroup.duplicates.length > 0) {
    return (
      <div className="border border-amber-500/20 bg-amber-500/5 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-amber-300">
            {duplicateGroup.duplicates.length} Duplicate{duplicateGroup.duplicates.length !== 1 ? 's' : ''} Found
          </span>
        </div>

        <div className="space-y-2">
          {duplicateGroup.duplicates.map((dup, idx) => (
            <div
              key={dup.id}
              className="flex items-start gap-2 px-2 py-1.5 bg-zinc-800/50 rounded cursor-pointer hover:bg-zinc-800/70 transition-colors"
              onClick={() => onViewItem?.(dup)}
            >
              <Copy className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-300 line-clamp-2">
                  {dup.content.subject || dup.content.body}
                </p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                  <span>{Math.round(duplicateGroup.scores[idx] * 100)}% match</span>
                  <span>{dup.channel}</span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
            </div>
          ))}
        </div>

        <p className="text-[10px] text-zinc-500 mt-2">
          These items appear to be duplicates based on content similarity.
        </p>
      </div>
    );
  }

  if (duplicateOf) {
    return (
      <div
        className="border border-zinc-700/50 bg-zinc-800/30 rounded-lg p-3 cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={() => onViewItem?.(duplicateOf.item)}
      >
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-zinc-400" />
          <div className="flex-1">
            <span className="text-sm text-zinc-300">Duplicate of existing item</span>
            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
              {duplicateOf.item.content.subject || duplicateOf.item.content.body}
            </p>
          </div>
          <span className="text-xs text-zinc-400">
            {Math.round(duplicateOf.similarity * 100)}% match
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
        </div>
      </div>
    );
  }

  return null;
}
