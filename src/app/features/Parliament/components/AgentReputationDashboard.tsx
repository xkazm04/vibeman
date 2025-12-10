'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  Star,
  Users,
} from 'lucide-react';
import type { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { getScanTypeConfig, SCAN_TYPE_CONFIGS } from '@/app/features/Ideas/lib/scanTypes';
import type { AgentReputation } from '../lib/types';

interface AgentReputationDashboardProps {
  projectId: string;
}

interface ReputationData extends AgentReputation {
  trend: 'up' | 'down' | 'stable';
  recentValidations: number;
  recentRejections: number;
}

const ReputationBadge: React.FC<{ score: number }> = ({ score }) => {
  let color = 'text-gray-400 bg-gray-500/20 border-gray-500/40';
  let label = 'Novice';

  if (score >= 80) {
    color = 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40';
    label = 'Expert';
  } else if (score >= 60) {
    color = 'text-green-400 bg-green-500/20 border-green-500/40';
    label = 'Trusted';
  } else if (score >= 40) {
    color = 'text-blue-400 bg-blue-500/20 border-blue-500/40';
    label = 'Learning';
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${color}`}>
      <Star className="w-3 h-3" />
      {label}
    </span>
  );
};

const TrendIndicator: React.FC<{ trend: 'up' | 'down' | 'stable' }> = ({ trend }) => {
  if (trend === 'up') {
    return <TrendingUp className="w-4 h-4 text-green-400" />;
  }
  if (trend === 'down') {
    return <TrendingDown className="w-4 h-4 text-red-400" />;
  }
  return <Minus className="w-4 h-4 text-gray-400" />;
};

const AgentReputationCard: React.FC<{
  reputation: ReputationData;
  onValidateCritique?: (agentType: ScanType, validated: boolean) => void;
  expanded: boolean;
  onToggle: () => void;
}> = ({ reputation, onValidateCritique, expanded, onToggle }) => {
  const config = getScanTypeConfig(reputation.agentType);

  return (
    <motion.div
      layout
      className="bg-gray-800/40 rounded-lg overflow-hidden border border-gray-700/40"
      data-testid={`reputation-card-${reputation.agentType}`}
    >
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between hover:bg-gray-800/60 transition-colors"
        data-testid={`reputation-toggle-${reputation.agentType}`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-xl border border-gray-700">
            {config?.emoji || '🤖'}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-200">{config?.label || reputation.agentType}</span>
              <ReputationBadge score={reputation.reputationScore} />
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{reputation.totalCritiques} critiques</span>
              <span>•</span>
              <span className="text-green-400">{Math.round(reputation.accuracyRate * 100)}% accurate</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TrendIndicator trend={reputation.trend} />
          <div className="w-12 h-12 relative">
            <svg viewBox="0 0 36 36" className="w-12 h-12 transform -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-gray-700"
              />
              <motion.circle
                cx="18"
                cy="18"
                r="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${reputation.reputationScore} ${100 - reputation.reputationScore}`}
                className={
                  reputation.reputationScore >= 80 ? 'text-yellow-400' :
                  reputation.reputationScore >= 60 ? 'text-green-400' :
                  reputation.reputationScore >= 40 ? 'text-blue-400' :
                  'text-gray-400'
                }
                initial={{ strokeDashoffset: 100 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-200">
              {reputation.reputationScore}
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-gray-700/40 space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-900/50 rounded-lg p-2 text-center" data-testid="stat-total-critiques">
                  <div className="text-lg font-bold text-gray-200">{reputation.totalCritiques}</div>
                  <div className="text-xs text-gray-500">Total Critiques</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-2 text-center" data-testid="stat-validated">
                  <div className="text-lg font-bold text-green-400">{reputation.validatedCritiques}</div>
                  <div className="text-xs text-gray-500">Validated</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-2 text-center" data-testid="stat-rejected">
                  <div className="text-lg font-bold text-red-400">{reputation.rejectedCritiques}</div>
                  <div className="text-xs text-gray-500">Rejected</div>
                </div>
              </div>

              {/* Accuracy Bar */}
              <div data-testid="accuracy-bar">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span>Critique Accuracy</span>
                  <span>{Math.round(reputation.accuracyRate * 100)}%</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${reputation.accuracyRate * 100}%` }}
                    className={`h-full ${
                      reputation.accuracyRate >= 0.8 ? 'bg-green-500' :
                      reputation.accuracyRate >= 0.5 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                  />
                </div>
              </div>

              {/* Category Badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Specialization:</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${config?.color || 'bg-gray-500/20 text-gray-400'}`}>
                  {config?.category || 'general'}
                </span>
              </div>

              {/* Last Updated */}
              <div className="text-xs text-gray-500">
                Last updated: {new Date(reputation.lastUpdated).toLocaleDateString()}
              </div>

              {/* Manual Validation Buttons */}
              {onValidateCritique && (
                <div className="flex gap-2 pt-2 border-t border-gray-700/40">
                  <button
                    onClick={() => onValidateCritique(reputation.agentType, true)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors text-sm"
                    data-testid={`validate-${reputation.agentType}`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    Validate Last Critique
                  </button>
                  <button
                    onClick={() => onValidateCritique(reputation.agentType, false)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm"
                    data-testid={`reject-${reputation.agentType}`}
                  >
                    <ThumbsDown className="w-4 h-4" />
                    Reject Last Critique
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function AgentReputationDashboard({ projectId }: AgentReputationDashboardProps) {
  const [reputations, setReputations] = useState<ReputationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<ScanType | null>(null);
  const [sortBy, setSortBy] = useState<'score' | 'critiques' | 'accuracy'>('score');

  const fetchReputations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/parliament/reputation?projectId=${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch reputations');
      }

      const data = await response.json();
      setReputations(data.reputations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchReputations();
  }, [fetchReputations]);

  const handleValidateCritique = async (agentType: ScanType, validated: boolean) => {
    try {
      const response = await fetch('/api/parliament/reputation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate_critique',
          projectId,
          agentType,
          validated,
        }),
      });

      if (response.ok) {
        fetchReputations();
      }
    } catch (err) {
      console.error('Failed to validate critique:', err);
    }
  };

  const sortedReputations = [...reputations].sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return b.reputationScore - a.reputationScore;
      case 'critiques':
        return b.totalCritiques - a.totalCritiques;
      case 'accuracy':
        return b.accuracyRate - a.accuracyRate;
      default:
        return 0;
    }
  });

  // Calculate summary stats
  const avgReputation = reputations.length > 0
    ? Math.round(reputations.reduce((sum, r) => sum + r.reputationScore, 0) / reputations.length)
    : 0;
  const totalCritiques = reputations.reduce((sum, r) => sum + r.totalCritiques, 0);
  const avgAccuracy = reputations.length > 0
    ? reputations.reduce((sum, r) => sum + r.accuracyRate, 0) / reputations.length
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="reputation-loading">
        <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
        <span className="ml-2 text-gray-400">Loading reputation data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-700/40 rounded-lg" data-testid="reputation-error">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchReputations}
          className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
          data-testid="reputation-retry-btn"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden" data-testid="reputation-dashboard">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            <h3 className="text-sm font-semibold text-gray-200">Agent Reputation</h3>
          </div>
          <button
            onClick={fetchReputations}
            className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Refresh"
            data-testid="reputation-refresh-btn"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 p-4 border-b border-gray-700/40">
        <div className="bg-gray-800/40 rounded-lg p-3 text-center" data-testid="summary-agents">
          <Users className="w-5 h-5 mx-auto mb-1 text-purple-400" />
          <div className="text-lg font-bold text-gray-200">{reputations.length}</div>
          <div className="text-xs text-gray-500">Active Agents</div>
        </div>
        <div className="bg-gray-800/40 rounded-lg p-3 text-center" data-testid="summary-avg-score">
          <Award className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
          <div className="text-lg font-bold text-gray-200">{avgReputation}</div>
          <div className="text-xs text-gray-500">Avg. Reputation</div>
        </div>
        <div className="bg-gray-800/40 rounded-lg p-3 text-center" data-testid="summary-accuracy">
          <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-400" />
          <div className="text-lg font-bold text-gray-200">{Math.round(avgAccuracy * 100)}%</div>
          <div className="text-xs text-gray-500">Avg. Accuracy</div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-700/40">
        <span className="text-xs text-gray-500">Sort by:</span>
        {(['score', 'critiques', 'accuracy'] as const).map((option) => (
          <button
            key={option}
            onClick={() => setSortBy(option)}
            className={`px-2 py-1 text-xs rounded-lg transition-colors ${
              sortBy === option
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
            }`}
            data-testid={`sort-${option}`}
          >
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>

      {/* Agent List */}
      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {reputations.length === 0 ? (
          <div className="text-center py-8 text-gray-400" data-testid="no-reputations">
            <Award className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No agent reputation data yet</p>
            <p className="text-xs mt-1">Run some parliament debates to start building reputation</p>
          </div>
        ) : (
          <AnimatePresence>
            {sortedReputations.map((reputation) => (
              <AgentReputationCard
                key={reputation.agentType}
                reputation={reputation}
                onValidateCritique={handleValidateCritique}
                expanded={expandedAgent === reputation.agentType}
                onToggle={() => setExpandedAgent(
                  expandedAgent === reputation.agentType ? null : reputation.agentType
                )}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
