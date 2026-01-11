/**
 * Hypothesis Row Component
 * Compact single-row display for hypothesis list items
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  Circle,
  ChevronRight,
  Trash2,
  Play,
  FileText,
  GitPullRequest,
  Camera,
  MessageSquare,
} from 'lucide-react';
import { useGoalHubStore } from '@/stores/goalHubStore';
import type { GoalHypothesis, EvidenceType, HypothesisStatus } from '@/app/db/models/goal-hub.types';
import { SCAN_TYPE_CONFIGS } from '@/app/features/Ideas/lib/scanTypes';

interface HypothesisRowProps {
  hypothesis: GoalHypothesis;
  projectPath: string;
}

const STATUS_CONFIG: Record<HypothesisStatus, { icon: typeof Circle; color: string; bgColor: string }> = {
  unverified: { icon: Circle, color: 'text-gray-400', bgColor: 'border-gray-700' },
  in_progress: { icon: Clock, color: 'text-cyan-400', bgColor: 'border-cyan-500/40 bg-cyan-500/5' },
  verified: { icon: CheckCircle2, color: 'text-emerald-400', bgColor: 'border-emerald-500/40 bg-emerald-500/5' },
  completed: { icon: CheckCircle2, color: 'text-purple-400', bgColor: 'border-purple-500/40 bg-purple-500/5' },
  disproven: { icon: Circle, color: 'text-red-400', bgColor: 'border-red-500/40 bg-red-500/5' },
};

const CATEGORY_COLORS: Record<string, string> = {
  behavior: 'bg-blue-500/20 text-blue-400',
  performance: 'bg-yellow-500/20 text-yellow-400',
  security: 'bg-red-500/20 text-red-400',
  ux: 'bg-pink-500/20 text-pink-400',
  integration: 'bg-cyan-500/20 text-cyan-400',
  edge_case: 'bg-orange-500/20 text-orange-400',
  data: 'bg-emerald-500/20 text-emerald-400',
  error: 'bg-rose-500/20 text-rose-400',
  custom: 'bg-gray-500/20 text-gray-400',
};

export default function HypothesisRow({ hypothesis, projectPath }: HypothesisRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [evidence, setEvidence] = useState('');
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('manual_note');

  const { updateHypothesis, verifyHypothesis, deleteHypothesis } = useGoalHubStore();

  const statusConfig = STATUS_CONFIG[hypothesis.status];
  const StatusIcon = statusConfig.icon;
  const categoryColor = CATEGORY_COLORS[hypothesis.category] || CATEGORY_COLORS.custom;

  const agentInfo = hypothesis.agentSource
    ? SCAN_TYPE_CONFIGS.find((c) => c.value === hypothesis.agentSource)
    : null;

  const handleStartProgress = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await updateHypothesis(hypothesis.id, { status: 'in_progress' });
  };

  const handleMarkComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await updateHypothesis(hypothesis.id, { status: 'completed' });
  };

  const handleVerify = async () => {
    if (!evidence.trim()) return;
    await verifyHypothesis(hypothesis.id, evidence, evidenceType);
    setIsVerifying(false);
    setEvidence('');
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this hypothesis?')) {
      await deleteHypothesis(hypothesis.id);
    }
  };

  const evidenceTypes: Array<{ value: EvidenceType; label: string; icon: typeof FileText }> = [
    { value: 'manual_note', label: 'Note', icon: MessageSquare },
    { value: 'pr', label: 'PR', icon: GitPullRequest },
    { value: 'test_result', label: 'Test', icon: FileText },
    { value: 'screenshot', label: 'Screenshot', icon: Camera },
    { value: 'implementation_log', label: 'Log', icon: FileText },
  ];

  const isComplete = hypothesis.status === 'verified' || hypothesis.status === 'completed';

  const handleRowClick = (e: React.MouseEvent) => {
    // Ignore clicks on action buttons
    if ((e.target as HTMLElement).closest('[data-action-button]')) {
      return;
    }
    setIsExpanded(!isExpanded);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="group">
      {/* Compact Row */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleRowClick}
        onKeyDown={handleKeyDown}
        className={`w-full text-left py-2 px-3 rounded-xl border transition-all cursor-pointer ${statusConfig.bgColor} ${
          isExpanded ? 'border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/5' : 'hover:border-gray-600 hover:bg-gray-800/30'
        } ${isComplete ? 'opacity-60' : ''}`}
      >
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          <div className={`p-1 rounded-lg ${isComplete ? 'bg-emerald-500/10' : 'bg-gray-800/50'}`}>
            <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
          </div>

          {/* Title */}
          <span className={`text-sm font-medium truncate flex-1 min-w-0 ${isComplete ? 'text-gray-400 line-through' : 'text-white'}`}>
            {hypothesis.title}
          </span>

          {/* Tags */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Priority badge */}
            {hypothesis.priority >= 8 && (
              <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
                High
              </span>
            )}

            {/* Category badge */}
            <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded-full border border-white/10 ${categoryColor}`}>
              {hypothesis.category}
            </span>

            {/* Agent emoji */}
            {agentInfo && (
              <span className="text-xs" title={agentInfo.label}>
                {agentInfo.emoji}
              </span>
            )}

            {/* Quick actions (visible on hover) */}
            {!isComplete && (
              <div className="hidden group-hover:flex items-center gap-1" data-action-button>
                {hypothesis.status === 'unverified' && (
                  <button
                    onClick={handleStartProgress}
                    className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30 transition-all"
                    title="Start"
                    data-action-button
                  >
                    <Play className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={handleMarkComplete}
                  className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30 transition-all"
                  title="Complete"
                  data-action-button
                >
                  <CheckCircle2 className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Expand indicator */}
            <ChevronRight
              className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="ml-4 mr-2 mt-1 p-4 space-y-3 bg-gray-900/60 backdrop-blur-sm rounded-xl border border-gray-800/80 shadow-inner">
              {/* Statement */}
              <div className="space-y-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Statement</span>
                <p className="text-sm text-gray-300 leading-relaxed">{hypothesis.statement}</p>
              </div>

              {/* Reasoning */}
              {hypothesis.reasoning && (
                <div className="space-y-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Reasoning</span>
                  <p className="text-sm text-gray-400 italic leading-relaxed">{hypothesis.reasoning}</p>
                </div>
              )}

              {/* Evidence (if verified) */}
              {isComplete && hypothesis.evidence && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400 block mb-1">
                    {hypothesis.evidenceType}
                  </span>
                  <p className="text-sm text-emerald-300">{hypothesis.evidence}</p>
                </div>
              )}

              {/* Verification Form */}
              {isVerifying ? (
                <div className="space-y-3 pt-3 border-t border-gray-800/50">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Evidence Type</span>
                  <div className="flex gap-2 flex-wrap">
                    {evidenceTypes.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setEvidenceType(value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          evidenceType === value
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                            : 'bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-700/60 border border-transparent'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                    placeholder="Describe the evidence..."
                    className="w-full px-3 py-2 bg-gray-800/60 border border-gray-700/60 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 resize-none transition-all"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsVerifying(false)}
                      className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800/50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleVerify}
                      disabled={!evidence.trim()}
                      className="px-4 py-2 text-xs font-medium bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 rounded-lg transition-all shadow-lg shadow-emerald-500/20 disabled:shadow-none"
                    >
                      Verify Hypothesis
                    </button>
                  </div>
                </div>
              ) : (
                /* Actions */
                <div className="flex items-center gap-2 pt-3 border-t border-gray-800/50">
                  {hypothesis.status === 'unverified' && (
                    <button
                      onClick={handleStartProgress}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 rounded-lg transition-all shadow-lg shadow-cyan-500/20"
                    >
                      <Play className="w-3 h-3" />
                      Start
                    </button>
                  )}
                  {!isComplete && (
                    <>
                      <button
                        onClick={handleMarkComplete}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 rounded-lg transition-all shadow-lg shadow-purple-500/20"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Complete
                      </button>
                      <button
                        onClick={() => setIsVerifying(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 rounded-lg transition-all shadow-lg shadow-emerald-500/20"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Verify
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleDelete}
                    className="ml-auto p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Delete hypothesis"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
