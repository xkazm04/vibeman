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

  return (
    <div className="group">
      {/* Compact Row */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full text-left py-1.5 px-2 rounded-lg border transition-colors ${statusConfig.bgColor} ${
          isExpanded ? 'border-cyan-500 bg-cyan-500/10' : 'hover:border-gray-600'
        } ${isComplete ? 'opacity-70' : ''}`}
      >
        <div className="flex items-center gap-2">
          {/* Status Icon */}
          <StatusIcon className={`w-4 h-4 flex-shrink-0 ${statusConfig.color}`} />

          {/* Title */}
          <span className={`text-sm font-medium truncate flex-1 min-w-0 ${isComplete ? 'text-gray-400' : 'text-white'}`}>
            {hypothesis.title}
          </span>

          {/* Tags */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Priority badge */}
            {hypothesis.priority >= 8 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded">
                High
              </span>
            )}

            {/* Category badge */}
            <span className={`px-1.5 py-0.5 text-[10px] rounded ${categoryColor}`}>
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
              <div className="hidden group-hover:flex items-center gap-1">
                {hypothesis.status === 'unverified' && (
                  <button
                    onClick={handleStartProgress}
                    className="p-1 rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                    title="Start"
                  >
                    <Play className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={handleMarkComplete}
                  className="p-1 rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
                  title="Complete"
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
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pl-6 pr-2 py-2 space-y-2 bg-gray-900/30 rounded-b-lg border-x border-b border-gray-800 -mt-1">
              {/* Statement */}
              <p className="text-xs text-gray-400">{hypothesis.statement}</p>

              {/* Reasoning */}
              {hypothesis.reasoning && (
                <p className="text-xs text-gray-500 italic">{hypothesis.reasoning}</p>
              )}

              {/* Evidence (if verified) */}
              {isComplete && hypothesis.evidence && (
                <div className="text-xs">
                  <span className="text-gray-500">{hypothesis.evidenceType}: </span>
                  <span className="text-emerald-400">{hypothesis.evidence}</span>
                </div>
              )}

              {/* Verification Form */}
              {isVerifying ? (
                <div className="space-y-2 pt-2 border-t border-gray-800">
                  <div className="flex gap-1 flex-wrap">
                    {evidenceTypes.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setEvidenceType(value)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] ${
                          evidenceType === value
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        <Icon className="w-2.5 h-2.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                    placeholder="Evidence..."
                    className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                    rows={2}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsVerifying(false)}
                      className="px-2 py-1 text-[10px] text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleVerify}
                      disabled={!evidence.trim()}
                      className="px-2 py-1 text-[10px] bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 rounded"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              ) : (
                /* Actions */
                <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                  {hypothesis.status === 'unverified' && (
                    <button
                      onClick={handleStartProgress}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] bg-cyan-600 hover:bg-cyan-500 rounded"
                    >
                      <Play className="w-2.5 h-2.5" />
                      Start
                    </button>
                  )}
                  {!isComplete && (
                    <>
                      <button
                        onClick={handleMarkComplete}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] bg-purple-600 hover:bg-purple-500 rounded"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Complete
                      </button>
                      <button
                        onClick={() => setIsVerifying(true)}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] bg-emerald-600 hover:bg-emerald-500 rounded"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Verify
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleDelete}
                    className="ml-auto p-1 text-gray-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
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
