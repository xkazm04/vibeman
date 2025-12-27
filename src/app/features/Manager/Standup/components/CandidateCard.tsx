/**
 * CandidateCard Component
 * Individual goal candidate display with selection
 */

'use client';

import { Check } from 'lucide-react';
import type { GoalCandidate } from '../types';
import { getCategoryColor, getPriorityColor } from '../utils';

interface CandidateCardProps {
  candidate: GoalCandidate;
  isSelected: boolean;
  onToggle: () => void;
}

export function CandidateCard({
  candidate,
  isSelected,
  onToggle,
}: CandidateCardProps) {
  return (
    <div
      onClick={onToggle}
      className={`p-4 rounded-xl border cursor-pointer transition-all ${
        isSelected
          ? 'bg-purple-500/10 border-purple-500/40'
          : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Selection indicator */}
        <div
          className={`mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isSelected
              ? 'bg-purple-500 border-purple-500'
              : 'border-gray-600 hover:border-gray-500'
          }`}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-medium text-white">{candidate.title}</h4>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(
                candidate.category
              )}`}
            >
              {candidate.category}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(
                candidate.priorityScore
              )}`}
            >
              {candidate.priorityScore}%
            </span>
          </div>
          <p className="text-sm text-gray-300 mb-2">{candidate.description}</p>
          <p className="text-xs text-gray-500 italic">{candidate.reasoning}</p>
        </div>
      </div>
    </div>
  );
}
