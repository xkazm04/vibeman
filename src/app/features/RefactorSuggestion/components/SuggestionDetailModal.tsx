'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  AlertTriangle,
  Code2,
  Layers,
  GitBranch,
  Zap,
  FileCode,
  ListChecks,
  Lightbulb,
  Sparkles,
  Copy,
  ExternalLink,
} from 'lucide-react';
import type { RefactorSuggestion } from '../lib/refactorSuggestionEngine';

interface SuggestionDetailModalProps {
  suggestion: RefactorSuggestion | null;
  onClose: () => void;
  onGenerateIdea?: (suggestion: RefactorSuggestion) => void;
  onCopyRequirement?: (suggestion: RefactorSuggestion) => void;
}

export default function SuggestionDetailModal({
  suggestion,
  onClose,
  onGenerateIdea,
  onCopyRequirement,
}: SuggestionDetailModalProps) {
  if (!suggestion) return null;

  const getCategoryIcon = (category: RefactorSuggestion['category']) => {
    const icons = {
      'anti-pattern': AlertTriangle,
      'duplication': Layers,
      'coupling': GitBranch,
      'complexity': Code2,
      'clean-code': Zap,
    };
    return icons[category] || Code2;
  };

  const getCategoryColor = (category: RefactorSuggestion['category']) => {
    const colors = {
      'anti-pattern': 'from-red-500/20 to-red-600/20 border-red-500/30 text-red-400',
      'duplication': 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30 text-yellow-400',
      'coupling': 'from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400',
      'complexity': 'from-orange-500/20 to-orange-600/20 border-orange-500/30 text-orange-400',
      'clean-code': 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400',
    };
    return colors[category] || 'from-gray-500/20 to-gray-600/20 border-gray-500/30 text-gray-400';
  };

  const getSeverityColor = (severity: RefactorSuggestion['severity']) => {
    const colors = {
      'critical': 'bg-red-500',
      'high': 'bg-orange-500',
      'medium': 'bg-yellow-500',
      'low': 'bg-blue-500',
    };
    return colors[severity] || 'bg-gray-500';
  };

  const Icon = getCategoryIcon(suggestion.category);
  const categoryColorClass = getCategoryColor(suggestion.category);

  const handleCopyRequirement = () => {
    if (suggestion.requirementTemplate) {
      navigator.clipboard.writeText(suggestion.requirementTemplate);
      onCopyRequirement?.(suggestion);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        data-testid="suggestion-detail-modal-overlay"
      >
        <motion.div
          className="w-full max-w-2xl bg-gray-900 rounded-2xl border border-gray-700/60 shadow-2xl overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          data-testid="suggestion-detail-modal"
        >
          {/* Header */}
          <div className={`px-6 py-4 bg-gradient-to-r ${categoryColorClass} border-b border-gray-700/40`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-black/20 border border-white/10">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${getSeverityColor(suggestion.severity)}`} />
                    <span className="text-xs text-gray-400 uppercase">{suggestion.severity}</span>
                    <span className="text-gray-600">•</span>
                    <span className="text-xs text-gray-400 capitalize">{suggestion.category.replace('-', ' ')}</span>
                  </div>
                  <h2 className="text-lg font-semibold text-white">{suggestion.title}</h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                data-testid="close-suggestion-modal-btn"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Issue Description
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">{suggestion.description}</p>
            </div>

            {/* Suggested Fix */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                Suggested Fix
              </h3>
              <div className="p-3 bg-gray-800/60 rounded-lg border border-gray-700/40">
                <p className="text-sm text-gray-300">{suggestion.suggestedFix}</p>
              </div>
            </div>

            {/* Refactoring Steps */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-green-400" />
                Refactoring Steps
              </h3>
              <ol className="space-y-2">
                {suggestion.refactorSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-800 flex items-center justify-center text-xs text-gray-300">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* Affected Files */}
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                Affected Files ({suggestion.files.length})
              </h3>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {suggestion.files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-gray-800/40 rounded-lg hover:bg-gray-800/60 transition-colors group"
                  >
                    <code className="text-xs text-gray-300 font-mono truncate">
                      {file}
                    </code>
                    {suggestion.lineNumbers?.[file] && (
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        Lines: {suggestion.lineNumbers[file].slice(0, 5).join(', ')}
                        {suggestion.lineNumbers[file].length > 5 && '...'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Clean Architecture Principle */}
            {suggestion.cleanArchitecturePrinciple && (
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Clean Architecture Principle
                </h3>
                <div className="px-3 py-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <p className="text-sm text-purple-300">{suggestion.cleanArchitecturePrinciple}</p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700/40">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-200 capitalize">{suggestion.effort}</div>
                <div className="text-xs text-gray-500">Effort</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-200 capitalize">{suggestion.impact}</div>
                <div className="text-xs text-gray-500">Impact</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-gray-200">
                  {suggestion.autoFixAvailable ? 'Yes' : 'No'}
                </div>
                <div className="text-xs text-gray-500">Auto-fix</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-gray-700/40 bg-gray-800/40 flex items-center justify-between">
            <button
              onClick={handleCopyRequirement}
              className="px-4 py-2 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-300 text-sm font-medium flex items-center gap-2 transition-colors"
              data-testid="copy-requirement-btn"
            >
              <Copy className="w-4 h-4" />
              Copy Requirement
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-gray-400 hover:text-gray-300 text-sm font-medium transition-colors"
                data-testid="close-modal-btn"
              >
                Close
              </button>
              <button
                onClick={() => onGenerateIdea?.(suggestion)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white text-sm font-medium flex items-center gap-2 transition-all"
                data-testid="generate-idea-from-suggestion-btn"
              >
                <Sparkles className="w-4 h-4" />
                Create Idea
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
