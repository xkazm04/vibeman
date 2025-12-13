'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  AlertTriangle,
  ArrowRight,
  GitBranch,
  Layers,
  Merge,
  Split,
  Link2Off,
  FolderInput,
  FileCode,
  PackageCheck,
} from 'lucide-react';
import { DbArchitectureSuggestion } from '@/app/db/models/architecture-graph.types';

interface SuggestionsListProps {
  suggestions: DbArchitectureSuggestion[];
  onUpdateStatus: (id: string, status: string, feedback?: string) => void;
}

const PRIORITY_CONFIG = {
  critical: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  high: {
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  medium: {
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
  },
  low: {
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
  },
};

const TYPE_ICONS: Record<string, typeof Split> = {
  extract_module: Split,
  merge_modules: Merge,
  break_circular: GitBranch,
  move_to_layer: FolderInput,
  introduce_interface: FileCode,
  remove_dependency: Link2Off,
  consolidate_utilities: PackageCheck,
};

const TYPE_LABELS: Record<string, string> = {
  extract_module: 'Extract Module',
  merge_modules: 'Merge Modules',
  break_circular: 'Break Circular',
  move_to_layer: 'Move to Layer',
  introduce_interface: 'Add Interface',
  remove_dependency: 'Remove Dependency',
  consolidate_utilities: 'Consolidate',
};

export default function SuggestionsList({
  suggestions,
  onUpdateStatus,
}: SuggestionsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>('pending');
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  // Filter suggestions
  const filteredSuggestions = suggestions.filter((s) => {
    if (filterStatus && s.status !== filterStatus) return false;
    return true;
  });

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedSuggestions = [...filteredSuggestions].sort(
    (a, b) =>
      (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) -
      (priorityOrder[b.priority as keyof typeof priorityOrder] || 4)
  );

  const counts = {
    pending: suggestions.filter((s) => s.status === 'pending').length,
    accepted: suggestions.filter((s) => s.status === 'accepted').length,
    implemented: suggestions.filter((s) => s.status === 'implemented').length,
  };

  const SuggestionItem = ({ suggestion }: { suggestion: DbArchitectureSuggestion }) => {
    const priorityConfig = PRIORITY_CONFIG[suggestion.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium;
    const TypeIcon = TYPE_ICONS[suggestion.suggestion_type] || Lightbulb;
    const isExpanded = expandedId === suggestion.id;

    const handleAccept = () => {
      onUpdateStatus(suggestion.id, 'accepted', feedback[suggestion.id]);
    };

    const handleReject = () => {
      onUpdateStatus(suggestion.id, 'rejected', feedback[suggestion.id]);
    };

    const handleImplement = () => {
      onUpdateStatus(suggestion.id, 'implemented', feedback[suggestion.id]);
    };

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`border rounded-lg overflow-hidden ${priorityConfig.bgColor} ${priorityConfig.borderColor}`}
        data-testid={`suggestion-item-${suggestion.id}`}
      >
        {/* Header */}
        <div
          className="flex items-start gap-3 p-3 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => setExpandedId(isExpanded ? null : suggestion.id)}
        >
          <div className={`p-1.5 rounded-lg ${priorityConfig.bgColor} border ${priorityConfig.borderColor}`}>
            <TypeIcon className={`w-4 h-4 ${priorityConfig.color}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium text-white truncate">{suggestion.title}</h4>
              <span className={`text-xs px-1.5 py-0.5 rounded ${priorityConfig.color} bg-gray-800/50`}>
                {suggestion.priority}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500">
                {TYPE_LABELS[suggestion.suggestion_type] || suggestion.suggestion_type}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {suggestion.status === 'pending' && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/10 text-cyan-400">
                Pending
              </span>
            )}
            {suggestion.status === 'accepted' && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/10 text-green-400">
                Accepted
              </span>
            )}
            {suggestion.status === 'implemented' && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-400">
                Implemented
              </span>
            )}
            {suggestion.status === 'rejected' && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-500/10 text-gray-400">
                Rejected
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-700/50"
            >
              <div className="p-3 space-y-3">
                {/* Description */}
                <p className="text-sm text-gray-300">{suggestion.description}</p>

                {/* Reasoning */}
                {suggestion.reasoning && (
                  <div className="flex items-start gap-2 p-2 bg-gray-800/50 rounded-lg">
                    <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-400">{suggestion.reasoning}</p>
                  </div>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2">
                  {suggestion.predicted_effort && (
                    <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                      <p className="text-sm font-semibold text-white">{suggestion.predicted_effort}/10</p>
                      <p className="text-xs text-gray-500">Effort</p>
                    </div>
                  )}
                  {suggestion.predicted_impact && (
                    <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                      <p className="text-sm font-semibold text-green-400">{suggestion.predicted_impact}/10</p>
                      <p className="text-xs text-gray-500">Impact</p>
                    </div>
                  )}
                  {suggestion.predicted_risk && (
                    <div className="bg-gray-800/50 rounded-lg p-2 text-center">
                      <p className="text-sm font-semibold text-amber-400">{suggestion.predicted_risk}/10</p>
                      <p className="text-xs text-gray-500">Risk</p>
                    </div>
                  )}
                </div>

                {/* Actions for pending */}
                {suggestion.status === 'pending' && (
                  <div className="space-y-2 pt-2 border-t border-gray-700/50">
                    {/* Feedback input */}
                    <input
                      type="text"
                      placeholder="Add feedback (optional)"
                      value={feedback[suggestion.id] || ''}
                      onChange={(e) =>
                        setFeedback((prev) => ({ ...prev, [suggestion.id]: e.target.value }))
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                      data-testid={`suggestion-feedback-${suggestion.id}-input`}
                    />

                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAccept();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/10 border border-green-500/30 rounded-lg transition-colors"
                        data-testid={`accept-suggestion-${suggestion.id}-btn`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Accept
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReject();
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 border border-red-500/30 rounded-lg transition-colors"
                        data-testid={`reject-suggestion-${suggestion.id}-btn`}
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* Actions for accepted */}
                {suggestion.status === 'accepted' && (
                  <div className="pt-2 border-t border-gray-700/50">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImplement();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg"
                      data-testid={`implement-suggestion-${suggestion.id}-btn`}
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Mark as Implemented
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4" data-testid="suggestions-list">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-medium text-white">
            {counts.pending} Pending Suggestions
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {counts.accepted > 0 && (
            <span className="text-green-400">{counts.accepted} accepted</span>
          )}
          {counts.implemented > 0 && (
            <span className="text-purple-400">{counts.implemented} implemented</span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <select
          value={filterStatus || ''}
          onChange={(e) => setFilterStatus(e.target.value || null)}
          className="px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
          data-testid="filter-suggestions-status-select"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="implemented">Implemented</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Suggestions list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {sortedSuggestions.map((suggestion) => (
            <SuggestionItem key={suggestion.id} suggestion={suggestion} />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {filteredSuggestions.length === 0 && (
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-gray-500/50 mx-auto mb-3" />
          <p className="text-gray-400">No suggestions found</p>
          <p className="text-xs text-gray-500 mt-1">
            {filterStatus
              ? 'Try adjusting your filters'
              : 'Run an analysis to generate suggestions'}
          </p>
        </div>
      )}
    </div>
  );
}
