'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Trash2, Clock, Hash, Plus } from 'lucide-react';
import type { DiscoveryConfig } from '../lib/types';

interface DiscoveryConfigListProps {
  configs: DiscoveryConfig[];
  selectedConfig: DiscoveryConfig | null;
  isLoading: boolean;
  onSelect: (config: DiscoveryConfig) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
}

export function DiscoveryConfigList({
  configs,
  selectedConfig,
  isLoading,
  onSelect,
  onDelete,
  onCreateNew,
}: DiscoveryConfigListProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <div className="animate-spin w-5 h-5 border-2 border-gray-600 border-t-cyan-500 rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Create New Button */}
      <button
        onClick={onCreateNew}
        className="w-full p-3 rounded-xl border-2 border-dashed border-gray-700/60
          hover:border-cyan-500/50 hover:bg-gray-800/30 transition-all
          flex items-center justify-center gap-2 text-gray-400 hover:text-cyan-400"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm font-medium">New Discovery</span>
      </button>

      {/* Config List */}
      <AnimatePresence mode="popLayout">
        {configs.map((config) => {
          const isSelected = selectedConfig?.id === config.id;

          return (
            <motion.div
              key={config.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`
                p-3 rounded-xl border cursor-pointer transition-all group
                ${isSelected
                  ? 'bg-cyan-500/10 border-cyan-500/50'
                  : 'bg-gray-800/40 border-gray-700/40 hover:border-gray-600/60'
                }
              `}
              onClick={() => onSelect(config)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Search className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-cyan-400' : 'text-gray-500'}`} />
                    <span className="text-sm font-medium text-gray-200 truncate">
                      {config.name}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 pl-6">
                    {config.query}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(config.id);
                  }}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100
                    hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 mt-2 pl-6 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(config.lastSearchAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  {config.resultsCount} found
                </span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {configs.length === 0 && (
        <div className="py-8 text-center text-gray-500 text-sm">
          No discovery configurations yet.
          <br />
          Create one to start searching.
        </div>
      )}
    </div>
  );
}
