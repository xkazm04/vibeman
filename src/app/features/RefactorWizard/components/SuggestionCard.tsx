'use client';

import { memo } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import type { RefactorOpportunity } from '@/stores/refactorStore';

interface SuggestionCardProps {
  opportunity: RefactorOpportunity;
  index: number;
}

/**
 * Compact card component for displaying refactor suggestions in ResultsStep
 * Memoized for optimal performance in virtualized lists
 */
export const SuggestionCard = memo(function SuggestionCard({
  opportunity,
  index,
}: SuggestionCardProps) {
  const severityColors = {
    critical: 'from-red-500/20 to-orange-500/20 border-red-500/30',
    high: 'from-orange-500/20 to-yellow-500/20 border-orange-500/30',
    medium: 'from-yellow-500/20 to-blue-500/20 border-yellow-500/30',
    low: 'from-blue-500/20 to-cyan-500/20 border-cyan-500/30',
  };

  const severityTextColors = {
    critical: 'text-red-400',
    high: 'text-orange-400',
    medium: 'text-yellow-400',
    low: 'text-cyan-400',
  };

  const effortLabels = {
    low: '~1h',
    medium: '~4h',
    high: '~8h',
  };

  return (
    <div
      className={`relative bg-gradient-to-br ${severityColors[opportunity.severity]} border rounded-lg p-4 transition-all`}
      data-testid={`suggestion-card-${index}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium text-sm mb-1 truncate">
            {opportunity.title}
          </h4>
          <p className="text-gray-400 text-xs line-clamp-2">
            {opportunity.description}
          </p>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2">
          <span className={`text-xs font-medium ${severityTextColors[opportunity.severity]}`}>
            {opportunity.severity}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-white/10">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            <span>{opportunity.files.length} file{opportunity.files.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>{effortLabels[opportunity.effort]}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 bg-black/30 rounded text-gray-400">
            {opportunity.category}
          </span>
        </div>
      </div>
    </div>
  );
});
