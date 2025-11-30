'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scan,
  AlertTriangle,
  Code2,
  Layers,
  GitBranch,
  Zap,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Play,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { RefactorSuggestion, SuggestionEngineResult } from '../lib/refactorSuggestionEngine';

interface RefactorSuggestionPanelProps {
  projectId: string;
  projectPath: string;
  projectType?: string;
  onSuggestionSelect?: (suggestion: RefactorSuggestion) => void;
  onGenerateIdeas?: (suggestionIds: string[]) => void;
}

type ScanStatus = 'idle' | 'scanning' | 'completed' | 'error';

export default function RefactorSuggestionPanel({
  projectId,
  projectPath,
  projectType,
  onSuggestionSelect,
  onGenerateIdeas,
}: RefactorSuggestionPanelProps) {
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [result, setResult] = useState<SuggestionEngineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());

  const runScan = useCallback(async () => {
    setScanStatus('scanning');
    setScanProgress(0);
    setError(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setScanProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/refactor-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectPath,
          projectType,
          config: {
            enableAntiPatternDetection: true,
            enableDuplicationDetection: true,
            enableCouplingAnalysis: true,
            enableComplexityAnalysis: true,
            enableCleanCodeChecks: true,
            severityThreshold: 'low',
            maxSuggestions: 50,
          },
          generateIdeas: false,
        }),
      });

      clearInterval(progressInterval);
      setScanProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Scan failed');
      }

      const data = await response.json();
      setResult(data);
      setScanStatus('completed');

      // Auto-expand first category with issues
      if (data.suggestions.length > 0) {
        const firstCategory = data.suggestions[0].category;
        setExpandedCategories(new Set([firstCategory]));
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setScanStatus('error');
    }
  }, [projectId, projectPath, projectType]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleSuggestion = (id: string) => {
    setSelectedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleGenerateIdeas = async () => {
    if (selectedSuggestions.size === 0) return;

    try {
      const response = await fetch('/api/refactor-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectPath,
          projectType,
          generateIdeas: true,
          ideaOptions: {
            maxIdeas: selectedSuggestions.size,
            skipExisting: true,
          },
        }),
      });

      if (response.ok) {
        onGenerateIdeas?.(Array.from(selectedSuggestions));
        setSelectedSuggestions(new Set());
      }
    } catch (err) {
      console.error('Failed to generate ideas:', err);
    }
  };

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
      'anti-pattern': 'text-red-400',
      'duplication': 'text-yellow-400',
      'coupling': 'text-purple-400',
      'complexity': 'text-orange-400',
      'clean-code': 'text-blue-400',
    };
    return colors[category] || 'text-gray-400';
  };

  const getSeverityColor = (severity: RefactorSuggestion['severity']) => {
    const colors = {
      'critical': 'bg-red-500/20 text-red-400 border-red-500/30',
      'high': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'medium': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'low': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };
    return colors[severity] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  // Group suggestions by category
  const groupedSuggestions = result?.suggestions.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {} as Record<string, RefactorSuggestion[]>) || {};

  return (
    <div
      className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/60 rounded-xl shadow-2xl overflow-hidden"
      data-testid="refactor-suggestion-panel"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700/40 bg-gray-800/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
              <Scan className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Refactor Suggestions</h3>
              <p className="text-xs text-gray-400">AI-powered code analysis</p>
            </div>
          </div>

          <button
            onClick={runScan}
            disabled={scanStatus === 'scanning'}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 text-white text-xs font-medium transition-all flex items-center gap-1.5"
            data-testid="run-refactor-scan-btn"
          >
            {scanStatus === 'scanning' ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                Scan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {scanStatus === 'scanning' && (
        <div className="px-4 py-2 border-b border-gray-700/40">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Analyzing codebase...</span>
            <span>{scanProgress}%</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${scanProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* Error State */}
      {scanStatus === 'error' && error && (
        <div className="p-4 border-b border-red-500/20 bg-red-500/10">
          <div className="flex items-center gap-2 text-red-400">
            <XCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Results */}
      {scanStatus === 'completed' && result && (
        <>
          {/* Summary */}
          <div className="px-4 py-3 border-b border-gray-700/40 bg-gray-800/40">
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-lg font-bold text-white">{result.summary.totalIssues}</div>
                <div className="text-xs text-gray-400">Total Issues</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-400">{result.summary.topPriorityCount}</div>
                <div className="text-xs text-gray-400">High Priority</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-cyan-400">{result.analysisMetadata.filesAnalyzed}</div>
                <div className="text-xs text-gray-400">Files Scanned</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-400">{result.analysisMetadata.scanDurationMs}ms</div>
                <div className="text-xs text-gray-400">Duration</div>
              </div>
            </div>
          </div>

          {/* Suggestions by Category */}
          <div className="max-h-[400px] overflow-y-auto">
            {Object.entries(groupedSuggestions).map(([category, suggestions]) => {
              const Icon = getCategoryIcon(category as RefactorSuggestion['category']);
              const isExpanded = expandedCategories.has(category);

              return (
                <div key={category} className="border-b border-gray-700/30 last:border-b-0">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-800/40 transition-colors"
                    data-testid={`category-toggle-${category}`}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                      <Icon className={`w-4 h-4 ${getCategoryColor(category as RefactorSuggestion['category'])}`} />
                      <span className="text-sm font-medium text-gray-200 capitalize">
                        {category.replace('-', ' ')}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-gray-700/50 text-xs text-gray-400">
                      {suggestions.length}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {suggestions.map(suggestion => (
                          <div
                            key={suggestion.id}
                            className={`px-4 py-3 border-l-2 ml-6 hover:bg-gray-800/30 transition-colors cursor-pointer ${
                              selectedSuggestions.has(suggestion.id) ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700'
                            }`}
                            onClick={() => {
                              toggleSuggestion(suggestion.id);
                              onSuggestionSelect?.(suggestion);
                            }}
                            data-testid={`suggestion-item-${suggestion.id}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getSeverityColor(suggestion.severity)}`}>
                                    {suggestion.severity.toUpperCase()}
                                  </span>
                                  <span className="text-sm font-medium text-gray-200 truncate">
                                    {suggestion.title}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400 line-clamp-2">
                                  {suggestion.description}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                  <span>Effort: {suggestion.effort}</span>
                                  <span>Impact: {suggestion.impact}</span>
                                  <span>{suggestion.files.length} file(s)</span>
                                </div>
                              </div>
                              {selectedSuggestions.has(suggestion.id) && (
                                <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {result.suggestions.length === 0 && (
              <div className="p-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <p className="text-gray-300 font-medium">No issues found!</p>
                <p className="text-gray-500 text-sm mt-1">Your code looks clean.</p>
              </div>
            )}
          </div>

          {/* Action Bar */}
          {selectedSuggestions.size > 0 && (
            <div className="px-4 py-3 border-t border-gray-700/40 bg-gray-800/60">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {selectedSuggestions.size} suggestion(s) selected
                </span>
                <button
                  onClick={handleGenerateIdeas}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white text-xs font-medium flex items-center gap-1.5"
                  data-testid="generate-ideas-from-suggestions-btn"
                >
                  <Sparkles className="w-3 h-3" />
                  Generate Ideas
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Idle State */}
      {scanStatus === 'idle' && (
        <div className="p-6 text-center">
          <Scan className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Click "Scan" to analyze your codebase</p>
          <p className="text-gray-500 text-xs mt-1">Detects anti-patterns, duplication, and more</p>
        </div>
      )}
    </div>
  );
}
