/**
 * RunReportModal — Full run report with markdown + decision rating panel
 *
 * Fetches the report from /api/conductor/report, renders markdown via
 * MarkdownViewer, and shows an interactive decision rating panel below.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Star, Download, MessageSquare,
  Wand2,
} from 'lucide-react';

function ReportLoadingSpinner({ className }: { className?: string }) {
  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
        <rect x="5" y="2" width="14" height="20" rx="2" opacity="0.3" />
        <path d="M9 8h6M9 12h6M9 16h4" opacity="0.5">
          <animate attributeName="opacity" values="0.5;0.2;0.5" dur="1.5s" repeatCount="indefinite" />
        </path>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <defs>
        <linearGradient id="scan-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      {/* Document outline with pulse */}
      <rect x="5" y="2" width="14" height="20" rx="2" opacity="0.3" />
      {/* Text lines */}
      <path d="M9 8h6" opacity="0.4" />
      <path d="M9 12h6" opacity="0.4" />
      <path d="M9 16h4" opacity="0.4" />
      {/* Scanning line with gradient */}
      <line x1="5" y1="2" x2="19" y2="2" stroke="url(#scan-grad)" strokeWidth="2" opacity="0.9">
        <animate attributeName="y1" values="2;22;2" dur="1.6s" repeatCount="indefinite" />
        <animate attributeName="y2" values="2;22;2" dur="1.6s" repeatCount="indefinite" />
      </line>
      {/* Scan glow band */}
      <rect x="5" y="2" width="14" height="3" fill="url(#scan-grad)" opacity="0.12" rx="1">
        <animate attributeName="y" values="2;19;2" dur="1.6s" repeatCount="indefinite" />
      </rect>
    </svg>
  );
}

function MiniSpinner({ className }: { className?: string }) {
  const prefersReduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced) {
    return (
      <svg viewBox="0 0 14 14" fill="none" className={className}>
        <circle cx="7" cy="7" r="2" fill="currentColor" opacity="0.6">
          <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.5s" repeatCount="indefinite" />
        </circle>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 14 14" fill="none" className={className}>
      <defs>
        <linearGradient id="mini-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0" />
          <stop offset="100%" stopColor="#d946ef" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      <circle cx="7" cy="7" r="5" stroke="url(#mini-grad)" strokeWidth="1.5" strokeLinecap="round"
        strokeDasharray="8 23" fill="none">
        <animateTransform attributeName="transform" type="rotate" from="0 7 7" to="360 7 7" dur="0.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="7" cy="2" r="1" fill="currentColor">
        <animateTransform attributeName="transform" type="rotate" from="0 7 7" to="360 7 7" dur="0.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
import { UniversalModal } from '@/components/UniversalModal';
import MarkdownViewer from '@/components/markdown/MarkdownViewer';
import { toast } from '@/stores/messageStore';
import type { PipelineDecision } from '../lib/v3/reportGenerator';

interface RunReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  runId: string;
}

interface DecisionRating {
  rating: number;
  comment?: string;
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5 transition-colors"
        >
          <Star
            className={`w-4 h-4 ${
              star <= (hover || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-600'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function RunReportModal({ isOpen, onClose, runId }: RunReportModalProps) {
  const [markdown, setMarkdown] = useState('');
  const [decisions, setDecisions] = useState<PipelineDecision[]>([]);
  const [ratings, setRatings] = useState<Record<string, DecisionRating>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRatings, setShowRatings] = useState(false);
  const [commentOpen, setCommentOpen] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [generatingRedesign, setGeneratingRedesign] = useState(false);

  // Fetch report data
  useEffect(() => {
    if (!isOpen || !runId) return;
    setLoading(true);
    setError(null);

    fetch(`/api/conductor/report?runId=${runId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch report');
        return res.json();
      })
      .then((data) => {
        setMarkdown(data.markdown || '');
        setDecisions(data.decisions || []);
        setRatings(data.decisionRatings || {});
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isOpen, runId]);

  // Rate a decision
  const handleRate = useCallback(async (decisionId: string, rating: number) => {
    const prev = ratings[decisionId];
    setRatings((r) => ({ ...r, [decisionId]: { ...prev, rating } }));

    try {
      await fetch('/api/conductor/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, decisionId, rating, comment: prev?.comment }),
      });
    } catch {
      toast.error('Failed to save rating');
    }
  }, [runId, ratings]);

  // Save a comment
  const handleSaveComment = useCallback(async (decisionId: string) => {
    const prev = ratings[decisionId];
    const updated = { ...prev, rating: prev?.rating || 3, comment: commentText };
    setRatings((r) => ({ ...r, [decisionId]: updated }));
    setCommentOpen(null);
    setCommentText('');

    try {
      await fetch('/api/conductor/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, decisionId, rating: updated.rating, comment: updated.comment }),
      });
    } catch {
      toast.error('Failed to save comment');
    }
  }, [runId, ratings, commentText]);

  // Generate redesign commands for low-rated decisions
  const lowRatedIds = Object.entries(ratings)
    .filter(([, r]) => r.rating <= 2)
    .map(([id]) => id);

  const handleGenerateRedesign = useCallback(async () => {
    if (lowRatedIds.length === 0) return;
    setGeneratingRedesign(true);

    try {
      const res = await fetch('/api/conductor/report/redesign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, decisionIds: lowRatedIds }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Created ${data.count} redesign command(s) in .claude/commands/`);
      } else {
        toast.error(data.error || 'Failed to generate redesign commands');
      }
    } catch {
      toast.error('Failed to generate redesign commands');
    } finally {
      setGeneratingRedesign(false);
    }
  }, [runId, lowRatedIds]);

  // Export markdown
  const handleExport = useCallback(() => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conductor-report-${runId.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [markdown, runId]);

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Run Report"
      subtitle="Pipeline execution summary and decisions"
      icon={FileText}
      iconBgColor="bg-cyan-600/20"
      iconColor="text-cyan-400"
      maxWidth="max-w-4xl"
      maxHeight="max-h-[85vh]"
      footerActions={[
        {
          icon: Download,
          label: 'Export .md',
          onClick: handleExport,
          variant: 'secondary',
          disabled: !markdown,
        },
        {
          icon: Star,
          label: showRatings ? 'Hide Ratings' : 'Rate Decisions',
          onClick: () => setShowRatings(!showRatings),
          variant: 'primary',
          disabled: decisions.length === 0,
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        {/* Loading / Error states */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <ReportLoadingSpinner className="w-6 h-6 text-cyan-400" />
            <span className="ml-2 text-sm text-gray-400">Generating report...</span>
          </div>
        )}

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-600/10 border border-red-600/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Markdown Report */}
        {!loading && !error && markdown && (
          <div className="overflow-y-auto max-h-[50vh] px-1">
            <MarkdownViewer content={markdown} />
          </div>
        )}

        {/* Decision Rating Panel */}
        {showRatings && decisions.length > 0 && (
          <div className="border-t border-gray-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                Rate Decisions
              </h3>
              {lowRatedIds.length > 0 && (
                <button
                  onClick={handleGenerateRedesign}
                  disabled={generatingRedesign}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                    bg-purple-600/20 text-purple-400 hover:bg-purple-600/30
                    border border-purple-600/40 transition-all
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingRedesign ? (
                    <MiniSpinner className="w-3.5 h-3.5 text-purple-400" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  Generate Redesign ({lowRatedIds.length})
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[30vh] overflow-y-auto">
              {decisions.map((decision) => {
                const r = ratings[decision.id];
                const isCommentOpen = commentOpen === decision.id;

                return (
                  <div
                    key={decision.id}
                    className="p-3 rounded-lg bg-gray-800/30 border border-gray-700/50"
                  >
                    <div className="flex items-center gap-3">
                      {/* Type badge */}
                      <span className={`text-micro px-1.5 py-0.5 rounded uppercase shrink-0 ${
                        decision.type === 'task' ? 'bg-cyan-600/20 text-cyan-400' :
                        decision.type === 'architectural' ? 'bg-purple-600/20 text-purple-400' :
                        'bg-orange-600/20 text-orange-400'
                      }`}>
                        {decision.type}
                      </span>

                      {/* Title */}
                      <span className="text-sm text-gray-300 flex-1 truncate">
                        {decision.title}
                      </span>

                      {/* Star rating */}
                      <StarRating
                        value={r?.rating || 0}
                        onChange={(rating) => handleRate(decision.id, rating)}
                      />

                      {/* Comment toggle */}
                      <button
                        onClick={() => {
                          if (isCommentOpen) {
                            setCommentOpen(null);
                          } else {
                            setCommentOpen(decision.id);
                            setCommentText(r?.comment || '');
                          }
                        }}
                        className={`p-1 rounded transition-colors ${
                          r?.comment ? 'text-cyan-400' : 'text-gray-600 hover:text-gray-400'
                        }`}
                        title={r?.comment ? 'Edit comment' : 'Add comment'}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Context */}
                    <p className="text-caption text-gray-500 mt-1 ml-14">
                      {decision.context}
                    </p>

                    {/* Comment input */}
                    {isCommentOpen && (
                      <div className="mt-2 ml-14 flex gap-2">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Why was this decision poor?"
                          className="flex-1 px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded
                            text-gray-300 placeholder-gray-600 focus:border-cyan-600/50 focus:outline-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveComment(decision.id);
                          }}
                        />
                        <button
                          onClick={() => handleSaveComment(decision.id)}
                          className="px-2 py-1 text-2xs bg-cyan-600/20 text-cyan-400 rounded
                            border border-cyan-600/30 hover:bg-cyan-600/30 transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    )}

                    {/* Existing comment display */}
                    {r?.comment && !isCommentOpen && (
                      <p className="text-2xs text-gray-500 mt-1 ml-14 italic">
                        &ldquo;{r.comment}&rdquo;
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </UniversalModal>
  );
}
