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

export default function ContextFileFooter({ markdownContent, previewMode }: ContextFileFooterProps) {
  const stats = getMarkdownStats(markdownContent);

  return (
    <div className="px-4 py-3 border-t border-gray-700 bg-gray-800/30">
      <div className="flex items-center justify-between text-sm text-gray-400">
        <div className="flex items-center space-x-4">
          <span>Language: Markdown</span>
          <span>•</span>
          <span>Lines: {stats.lines}</span>
          <span>•</span>
          <span>Characters: {stats.characters}</span>
          <span>•</span>
          <span>Words: {stats.words}</span>
        </div>
        {previewMode === 'edit' && (
          <div className="text-gray-500">
            Press Ctrl+S to save
          </div>
        )}
      </div>
    </div>
  );
}
