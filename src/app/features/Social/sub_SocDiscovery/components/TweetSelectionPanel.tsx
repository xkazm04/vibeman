'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Square, Save, Loader2, MessageSquare } from 'lucide-react';
import type { DiscoveredTweet } from '../lib/types';
import { TweetResultCard } from './TweetResultCard';

interface TweetSelectionPanelProps {
  tweets: DiscoveredTweet[];
  selectedTweets: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSave: () => Promise<number>;
  isSaving: boolean;
}

export function TweetSelectionPanel({
  tweets,
  selectedTweets,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onSave,
  isSaving,
}: TweetSelectionPanelProps) {
  const [savedCount, setSavedCount] = React.useState<number | null>(null);

  const handleSave = async () => {
    const count = await onSave();
    setSavedCount(count);
    setTimeout(() => setSavedCount(null), 3000);
  };

  if (tweets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm">No tweets found yet.</p>
        <p className="text-xs mt-1">Run a search to discover content.</p>
      </div>
    );
  }

  const allSelected = selectedTweets.size === tweets.length;
  const someSelected = selectedTweets.size > 0;

  return (
    <div className="space-y-4">
      {/* Header with selection controls */}
      <div className="flex items-center justify-between sticky top-0 bg-gray-900/95 backdrop-blur-sm py-2 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
              bg-gray-800/60 hover:bg-gray-700/60 text-gray-400 hover:text-gray-200
              text-xs font-medium transition-colors"
          >
            {allSelected ? (
              <Square className="w-3.5 h-3.5" />
            ) : (
              <CheckSquare className="w-3.5 h-3.5" />
            )}
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-xs text-gray-500">
            {selectedTweets.size} of {tweets.length} selected
          </span>
        </div>

        {someSelected && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg
              bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-medium
              disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Selected
          </motion.button>
        )}
      </div>

      {/* Success Message */}
      <AnimatePresence>
        {savedCount !== null && savedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-sm text-green-300"
          >
            Successfully saved {savedCount} tweet{savedCount !== 1 ? 's' : ''} as feedback items!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tweet List */}
      <div className="space-y-3">
        {tweets.map((tweet) => (
          <TweetResultCard
            key={tweet.id}
            tweet={tweet}
            isSelected={selectedTweets.has(tweet.id)}
            onToggleSelect={() => onToggleSelect(tweet.id)}
          />
        ))}
      </div>
    </div>
  );
}
