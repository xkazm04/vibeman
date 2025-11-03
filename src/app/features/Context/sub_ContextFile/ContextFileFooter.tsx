/**
 * Context File Modal Footer Component
 * Displays file statistics and keyboard hints
 */

import React from 'react';
import { getMarkdownStats } from '../lib';

interface ContextFileFooterProps {
  markdownContent: string;
  previewMode: 'edit' | 'preview';
}

function StatsSeparator() {
  return <span>•</span>;
}

function StatsItem({ label, value }: { label: string; value: string | number }) {
  return <span>{label}: {value}</span>;
}

function StatsDisplay({ stats }: { stats: { lines: number; characters: number; words: number } }) {
  return (
    <div className="flex items-center space-x-4">
      <span>Language: Markdown</span>
      <StatsSeparator />
      <StatsItem label="Lines" value={stats.lines} />
      <StatsSeparator />
      <StatsItem label="Characters" value={stats.characters} />
      <StatsSeparator />
      <StatsItem label="Words" value={stats.words} />
    </div>
  );
}

export default function ContextFileFooter({ markdownContent, previewMode }: ContextFileFooterProps) {
  const stats = getMarkdownStats(markdownContent);

  return (
    <div className="px-4 py-3 border-t border-gray-700 bg-gray-800/30">
      <div className="flex items-center justify-between text-sm text-gray-400">
        <StatsDisplay stats={stats} />
        {previewMode === 'edit' && (
          <div className="text-gray-500">
            Press Ctrl+S to save
          </div>
        )}
      </div>
    </div>
  );
}
