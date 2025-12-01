'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useStorybookStore } from '../lib/storybookStore';
import { MatchStatus } from '../lib/types';
import { Check, AlertCircle, X, Plus, FileCode } from 'lucide-react';

interface ComponentListProps {
  title: string;
  subtitle: string;
  source: 'storybook' | 'vibeman';
}

const statusIcons: Record<MatchStatus, React.ReactNode> = {
  matched: <Check className="w-4 h-4 text-green-400" />,
  partial: <AlertCircle className="w-4 h-4 text-yellow-400" />,
  missing: <X className="w-4 h-4 text-red-400" />,
  unique: <Plus className="w-4 h-4 text-cyan-400" />
};

const statusColors: Record<MatchStatus, string> = {
  matched: 'border-green-500/30 bg-green-500/5',
  partial: 'border-yellow-500/30 bg-yellow-500/5',
  missing: 'border-red-500/30 bg-red-500/5',
  unique: 'border-cyan-500/30 bg-cyan-500/5'
};

export function ComponentList({ title, subtitle, source }: ComponentListProps) {
  const { matches, filter, searchQuery, setSelectedComponent, selectedComponent } = useStorybookStore();

  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      // Get the relevant component based on source
      const component = source === 'storybook'
        ? match.storybookComponent
        : match.vibemanComponent;

      // For storybook source: show matched, partial, and missing
      // For vibeman source: show matched, partial, and unique
      if (source === 'storybook') {
        if (match.status === 'unique') return false; // Unique items only show in vibeman list
        if (!component && match.status !== 'missing') return false;
      } else {
        if (match.status === 'missing') return false; // Missing items only show in storybook list
        if (!component && match.status !== 'unique') return false;
      }

      // Filter by status
      if (filter !== 'all' && match.status !== filter) return false;

      // Filter by search
      if (searchQuery) {
        const name = component?.name.toLowerCase() || '';
        if (!name.includes(searchQuery.toLowerCase())) return false;
      }

      return true;
    });
  }, [matches, filter, searchQuery, source]);

  // Group by category
  const groupedMatches = useMemo(() => {
    const groups: Record<string, typeof filteredMatches> = {};

    filteredMatches.forEach(match => {
      const component = source === 'storybook'
        ? match.storybookComponent
        : match.vibemanComponent;
      const category = component?.category || 'uncategorized';

      if (!groups[category]) groups[category] = [];
      groups[category].push(match);
    });

    return groups;
  }, [filteredMatches, source]);

  return (
    <div
      className="bg-gray-900/50 rounded-xl border border-white/10 h-[500px] flex flex-col"
      data-testid={`component-list-${source}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="text-xs text-gray-500 font-mono">{subtitle}</p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {Object.entries(groupedMatches).map(([category, items]) => (
          <div key={category} className="mb-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider px-2 py-1">
              {category} ({items.length})
            </div>

            {items.map((match, index) => {
              const component = source === 'storybook'
                ? match.storybookComponent
                : match.vibemanComponent;
              const isSelected = selectedComponent === match;

              return (
                <motion.button
                  key={`${source}-${category}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => setSelectedComponent(match)}
                  className={`w-full text-left px-3 py-2 rounded-lg mb-1 border transition-all
                    ${statusColors[match.status]}
                    ${isSelected ? 'ring-2 ring-cyan-500' : ''}
                    hover:opacity-80`}
                  data-testid={`component-item-${component?.name || match.status}`}
                >
                  <div className="flex items-center gap-2">
                    {statusIcons[match.status]}
                    <span className="flex-1 text-white text-sm truncate">
                      {component?.name || `(${match.status})`}
                    </span>
                    {component?.lineCount && (
                      <span className="text-xs text-gray-500">
                        {component.lineCount}L
                      </span>
                    )}
                  </div>

                  {component?.hasExamples && (
                    <div className="flex items-center gap-1 mt-1">
                      <FileCode className="w-3 h-3 text-purple-400" />
                      <span className="text-xs text-purple-400">Has examples</span>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        ))}

        {Object.keys(groupedMatches).length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            No components match the current filters
          </div>
        )}
      </div>
    </div>
  );
}
