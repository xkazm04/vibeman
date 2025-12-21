'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, AlertCircle, Edit2 } from 'lucide-react';
import type { DiscoveryConfig } from '../lib/types';

interface DiscoverySearchProps {
  config: DiscoveryConfig;
  isSearching: boolean;
  searchError: string | null;
  onSearch: (query: string) => void;
  onEdit: () => void;
}

export function DiscoverySearch({
  config,
  isSearching,
  searchError,
  onSearch,
  onEdit,
}: DiscoverySearchProps) {
  const [customQuery, setCustomQuery] = useState('');
  const [useCustomQuery, setUseCustomQuery] = useState(false);

  const handleSearch = () => {
    const query = useCustomQuery && customQuery.trim() ? customQuery : config.query;
    onSearch(query);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Config Info */}
      <div className="p-4 rounded-xl bg-gray-800/40 border border-gray-700/40">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-lg font-medium text-gray-200">{config.name}</h3>
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-gray-700/60 text-gray-500 hover:text-gray-300 transition-colors"
            title="Edit configuration"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-400">{config.query}</p>
      </div>

      {/* Custom Query Toggle */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={useCustomQuery}
            onChange={(e) => setUseCustomQuery(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500
              focus:ring-cyan-500/30 focus:ring-offset-0"
          />
          <span className="text-sm text-gray-400">Use custom query</span>
        </label>
      </div>

      {/* Custom Query Input */}
      {useCustomQuery && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <textarea
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            placeholder="Enter a one-time search query..."
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700/60
              text-gray-200 placeholder-gray-500 text-sm resize-none
              focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
          />
        </motion.div>
      )}

      {/* Search Button */}
      <button
        onClick={handleSearch}
        disabled={isSearching || (useCustomQuery && !customQuery.trim())}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
          bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400
          text-white font-medium transition-all
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSearching ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Searching with Grok...
          </>
        ) : (
          <>
            <Search className="w-5 h-5" />
            Search X with Grok
          </>
        )}
      </button>

      {/* Error Display */}
      {searchError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{searchError}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
