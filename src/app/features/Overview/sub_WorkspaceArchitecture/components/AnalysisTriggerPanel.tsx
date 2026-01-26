'use client';

/**
 * AnalysisTriggerPanel
 * UI component to trigger architecture analysis and show status
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, Loader2, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import type { DbArchitectureAnalysisSession } from '@/app/db/models/cross-project-architecture.types';

interface AnalysisTriggerPanelProps {
  isAnalyzing: boolean;
  latestAnalysis: DbArchitectureAnalysisSession | null;
  projectCount: number;
  relationshipCount: number;
  onTriggerAnalysis: () => Promise<{
    success: boolean;
    analysisId?: string;
    promptContent?: string;
    error?: string;
  }>;
  onAnalysisPrompt?: (prompt: string, analysisId: string) => void;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export function AnalysisTriggerPanel({
  isAnalyzing,
  latestAnalysis,
  projectCount,
  relationshipCount,
  onTriggerAnalysis,
  onAnalysisPrompt,
}: AnalysisTriggerPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<{ prompt: string; analysisId: string } | null>(null);

  const handleAnalyze = useCallback(async () => {
    setError(null);

    const result = await onTriggerAnalysis();

    if (!result.success) {
      setError(result.error || 'Analysis failed');
      return;
    }

    if (result.promptContent && result.analysisId) {
      if (onAnalysisPrompt) {
        // If we have a handler, use it directly
        onAnalysisPrompt(result.promptContent, result.analysisId);
      } else {
        // Store for manual copy
        setPendingPrompt({
          prompt: result.promptContent,
          analysisId: result.analysisId,
        });
      }
    }
  }, [onTriggerAnalysis, onAnalysisPrompt]);

  const copyPromptToClipboard = useCallback(() => {
    if (pendingPrompt) {
      navigator.clipboard.writeText(pendingPrompt.prompt);
      setPendingPrompt(null);
    }
  }, [pendingPrompt]);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-medium text-zinc-300">Architecture Analysis</span>
        </div>
        <div className="flex items-center gap-2">
          {isAnalyzing ? (
            <span className="flex items-center gap-1 text-xs text-cyan-400">
              <Loader2 className="w-3 h-3 animate-spin" />
              Analyzing...
            </span>
          ) : latestAnalysis?.status === 'completed' ? (
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(latestAnalysis.completed_at)}
            </span>
          ) : null}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3 border-t border-zinc-800/50">
              {/* Stats */}
              <div className="flex items-center gap-4 pt-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">Projects:</span>
                  <span className="text-zinc-300 font-medium">{projectCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">Connections:</span>
                  <span className="text-zinc-300 font-medium">{relationshipCount}</span>
                </div>
              </div>

              {/* Latest analysis status */}
              {latestAnalysis && (
                <div className="flex items-center gap-2 text-xs">
                  {latestAnalysis.status === 'completed' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-zinc-400">
                        Found {latestAnalysis.relationships_discovered} connections
                      </span>
                    </>
                  ) : latestAnalysis.status === 'failed' ? (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                      <span className="text-zinc-400">
                        {latestAnalysis.error_message || 'Analysis failed'}
                      </span>
                    </>
                  ) : null}
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 px-2 py-1.5 rounded">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Pending prompt - show copy button */}
              {pendingPrompt && (
                <div className="space-y-2">
                  <div className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1.5 rounded">
                    Analysis prompt ready. Copy and run in Claude Code terminal.
                  </div>
                  <button
                    onClick={copyPromptToClipboard}
                    className="w-full px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors"
                  >
                    Copy Prompt to Clipboard
                  </button>
                </div>
              )}

              {/* Analyze button */}
              {!pendingPrompt && (
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || projectCount === 0}
                  className={`
                    w-full flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-all
                    ${isAnalyzing || projectCount === 0
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white shadow-lg shadow-cyan-500/20'
                    }
                  `}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Analyzing Architecture...
                    </>
                  ) : (
                    <>
                      <Scan className="w-3.5 h-3.5" />
                      Analyze Cross-Project Architecture
                    </>
                  )}
                </button>
              )}

              {/* Help text */}
              {projectCount === 0 && (
                <p className="text-xs text-zinc-500 text-center">
                  Add projects to this workspace to analyze their architecture
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AnalysisTriggerPanel;
