/**
 * Hypothesis Card Component
 * Individual hypothesis display with verification actions
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  Circle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Play,
  FileText,
  GitPullRequest,
  Camera,
  MessageSquare,
} from 'lucide-react';
import { useGoalHubStore } from '@/stores/goalHubStore';
import type { GoalHypothesis, EvidenceType } from '@/app/db/models/goal-hub.types';
import { SCAN_TYPE_CONFIGS } from '@/app/features/Ideas/lib/scanTypes';

interface HypothesisCardProps {
  hypothesis: GoalHypothesis;
  projectPath: string;
  compact?: boolean;
}

export default function HypothesisCard({
  hypothesis,
  projectPath,
  compact = false,
}: HypothesisCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [evidence, setEvidence] = useState('');
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('manual_note');

  const { updateHypothesis, verifyHypothesis, deleteHypothesis } = useGoalHubStore();

  const getStatusIcon = () => {
    switch (hypothesis.status) {
      case 'verified':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-cyan-400" />;
      default:
        return <Circle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getCategoryColor = () => {
    const colors: Record<string, string> = {
      behavior: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
      performance: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
      security: 'bg-red-500/20 text-red-400 border-red-500/40',
      accessibility: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
      ux: 'bg-pink-500/20 text-pink-400 border-pink-500/40',
      integration: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
      edge_case: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
      data: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      error: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      custom: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
    };
    return colors[hypothesis.category] || colors.custom;
  };

  const getAgentInfo = () => {
    if (!hypothesis.agentSource) return null;
    const agent = SCAN_TYPE_CONFIGS.find((c) => c.value === hypothesis.agentSource);
    return agent ? { emoji: agent.emoji, label: agent.label } : null;
  };

  const agentInfo = getAgentInfo();

  const handleStartProgress = async () => {
    await updateHypothesis(hypothesis.id, { status: 'in_progress' });
  };

  const handleVerify = async () => {
    if (!evidence.trim()) return;
    await verifyHypothesis(hypothesis.id, evidence, evidenceType);
    setIsVerifying(false);
    setEvidence('');
  };

  const handleDelete = async () => {
    if (confirm('Delete this hypothesis?')) {
      await deleteHypothesis(hypothesis.id);
    }
  };

  const evidenceTypes: Array<{ value: EvidenceType; label: string; icon: typeof FileText }> = [
    { value: 'manual_note', label: 'Note', icon: MessageSquare },
    { value: 'pr', label: 'PR', icon: GitPullRequest },
    { value: 'test_result', label: 'Test', icon: FileText },
    { value: 'screenshot', label: 'Screenshot', icon: Camera },
    { value: 'implementation_log', label: 'Impl Log', icon: FileText },
  ];

  return (
    <div
      className={`bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden ${
        hypothesis.status === 'verified' ? 'opacity-75' : ''
      }`}
    >
      {/* Header */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-white text-sm truncate">
                {hypothesis.title}
              </h4>
              {hypothesis.priority >= 8 && (
                <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
                  High
                </span>
              )}
            </div>
            {!compact && (
              <p className="text-xs text-gray-400 line-clamp-2">
                {hypothesis.statement}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className={`px-2 py-0.5 text-xs rounded border ${getCategoryColor()}`}>
                {hypothesis.category}
              </span>
              {agentInfo && (
                <span className="text-xs text-gray-500">
                  {agentInfo.emoji} {agentInfo.label}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-500 hover:text-white"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-800"
          >
            <div className="p-3 space-y-3">
              {/* Statement */}
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">
                  Statement
                </label>
                <p className="text-sm text-gray-300 mt-1">{hypothesis.statement}</p>
              </div>

              {/* Reasoning */}
              {hypothesis.reasoning && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider">
                    Reasoning
                  </label>
                  <p className="text-sm text-gray-400 mt-1">{hypothesis.reasoning}</p>
                </div>
              )}

              {/* Evidence (if verified) */}
              {hypothesis.status === 'verified' && hypothesis.evidence && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider">
                    Evidence ({hypothesis.evidenceType})
                  </label>
                  <p className="text-sm text-emerald-400 mt-1">{hypothesis.evidence}</p>
                </div>
              )}

              {/* Verification Form */}
              {isVerifying ? (
                <div className="space-y-3 pt-2 border-t border-gray-800">
                  <div className="flex gap-2">
                    {evidenceTypes.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setEvidenceType(value)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-colors ${
                          evidenceType === value
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
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
                    placeholder="Describe the evidence for verification..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsVerifying(false)}
                      className="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleVerify}
                      disabled={!evidence.trim()}
                      className="px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg"
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
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 rounded-lg"
                    >
                      <Play className="w-3 h-3" />
                      Start
                    </button>
                  )}
                  {hypothesis.status !== 'verified' && (
                    <button
                      onClick={() => setIsVerifying(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 rounded-lg"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Verify
                    </button>
                  )}
                  <button
                    onClick={handleDelete}
                    className="ml-auto p-1.5 text-gray-500 hover:text-red-400"
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
