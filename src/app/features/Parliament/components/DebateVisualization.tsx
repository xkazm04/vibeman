'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  MessageSquare,
  Vote,
  CheckCircle,
  XCircle,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Play,
  Award,
  AlertTriangle,
  Scale,
  Gavel,
} from 'lucide-react';
import type { ScanType } from '@/app/features/Ideas/lib/scanTypes';
import { getScanTypeConfig } from '@/app/features/Ideas/lib/scanTypes';
import type {
  DebateResult,
  DebateTurn,
  ParliamentaryVote,
  TradeOffAnalysis,
  DebateRole,
} from '../lib/types';

interface DebateVisualizationProps {
  projectId: string;
  ideaId?: string;
  onDebateComplete?: (result: DebateResult) => void;
}

interface DebateSessionData {
  id: string;
  status: string;
  rounds: Array<{
    roundNumber: number;
    turns: DebateTurn[];
    outcome: string;
    summary: string;
  }>;
  votes: ParliamentaryVote[];
  tradeOffs: TradeOffAnalysis[];
  consensusLevel: number;
  selectedIdeaId: string | null;
}

const RoleBadge: React.FC<{ role: DebateRole }> = ({ role }) => {
  const roleConfig: Record<DebateRole, { color: string; icon: React.ReactNode }> = {
    proposer: { color: 'bg-green-500/20 text-green-400 border-green-500/40', icon: <Play className="w-3 h-3" /> },
    challenger: { color: 'bg-red-500/20 text-red-400 border-red-500/40', icon: <AlertTriangle className="w-3 h-3" /> },
    mediator: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/40', icon: <Scale className="w-3 h-3" /> },
    voter: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/40', icon: <Vote className="w-3 h-3" /> },
  };

  const config = roleConfig[role];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${config.color}`}>
      {config.icon}
      {role}
    </span>
  );
};

const AgentAvatar: React.FC<{ agentType: ScanType; size?: 'sm' | 'md' | 'lg' }> = ({ agentType, size = 'md' }) => {
  const config = getScanTypeConfig(agentType);
  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-8 h-8 text-lg',
    lg: 'w-12 h-12 text-2xl',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gray-800 flex items-center justify-center border border-gray-700`}
      title={config?.label || agentType}
      data-testid={`agent-avatar-${agentType}`}
    >
      {config?.emoji || '🤖'}
    </div>
  );
};

const DebateTurnCard: React.FC<{ turn: DebateTurn }> = ({ turn }) => {
  const config = getScanTypeConfig(turn.agentType);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex gap-3 p-3 bg-gray-800/40 rounded-lg"
      data-testid={`debate-turn-${turn.id}`}
    >
      <AgentAvatar agentType={turn.agentType} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-200 text-sm">{config?.label || turn.agentType}</span>
          <RoleBadge role={turn.role} />
          <span className="text-xs text-gray-500">
            {Math.round(turn.confidence)}% confident
          </span>
        </div>
        <p className="text-sm text-gray-300">{turn.content}</p>
        {turn.targetAgent && (
          <div className="mt-1 text-xs text-gray-500">
            Responding to {getScanTypeConfig(turn.targetAgent)?.label || turn.targetAgent}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const VoteCard: React.FC<{ vote: ParliamentaryVote['votes'][0] }> = ({ vote }) => {
  const config = getScanTypeConfig(vote.agentType);
  const voteIcons = {
    support: <CheckCircle className="w-5 h-5 text-green-400" />,
    oppose: <XCircle className="w-5 h-5 text-red-400" />,
    abstain: <MinusCircle className="w-5 h-5 text-gray-400" />,
  };

  const voteColors = {
    support: 'border-green-500/40 bg-green-500/10',
    oppose: 'border-red-500/40 bg-red-500/10',
    abstain: 'border-gray-500/40 bg-gray-500/10',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-3 rounded-lg border ${voteColors[vote.vote]}`}
      data-testid={`vote-${vote.agentType}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AgentAvatar agentType={vote.agentType} size="sm" />
          <span className="text-sm font-medium text-gray-200">{config?.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {voteIcons[vote.vote]}
          <span className="text-xs text-gray-400">
            Weight: {vote.weight.toFixed(2)}
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-400">{vote.reasoning}</p>
    </motion.div>
  );
};

const TradeOffCard: React.FC<{ tradeOff: TradeOffAnalysis }> = ({ tradeOff }) => {
  const proConfig = getScanTypeConfig(tradeOff.proAgent);
  const conConfig = getScanTypeConfig(tradeOff.conAgent);

  const importanceColors = {
    critical: 'border-red-500/40 bg-red-500/10',
    significant: 'border-yellow-500/40 bg-yellow-500/10',
    minor: 'border-gray-500/40 bg-gray-500/10',
  };

  return (
    <div
      className={`p-3 rounded-lg border ${importanceColors[tradeOff.importance]}`}
      data-testid={`tradeoff-${tradeOff.id}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-200 capitalize">{tradeOff.dimension}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          tradeOff.importance === 'critical' ? 'bg-red-500/20 text-red-400' :
          tradeOff.importance === 'significant' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {tradeOff.importance}
        </span>
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex gap-2">
          <span className="text-green-400">{proConfig?.emoji}</span>
          <p className="text-gray-300">{tradeOff.proArgument}</p>
        </div>
        <div className="flex gap-2">
          <span className="text-red-400">{conConfig?.emoji}</span>
          <p className="text-gray-300">{tradeOff.conArgument}</p>
        </div>
        {tradeOff.resolution && (
          <div className="pt-2 border-t border-gray-700/40">
            <span className="text-purple-400">Resolution:</span>
            <p className="text-gray-300">{tradeOff.resolution}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default function DebateVisualization({
  projectId,
  ideaId,
  onDebateComplete,
}: DebateVisualizationProps) {
  const [session, setSession] = useState<DebateSessionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rounds' | 'votes' | 'tradeoffs'>('rounds');
  const [expandedRound, setExpandedRound] = useState<number | null>(1);
  const [isDebating, setIsDebating] = useState(false);

  const fetchSession = useCallback(async () => {
    if (!ideaId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/parliament/session?projectId=${projectId}&ideaId=${ideaId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setSession(null);
          return;
        }
        throw new Error('Failed to fetch debate session');
      }

      const data = await response.json();
      setSession(data.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId, ideaId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const startDebate = async () => {
    if (!ideaId) return;

    setIsDebating(true);
    setError(null);

    try {
      const response = await fetch('/api/parliament/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, ideaId }),
      });

      if (!response.ok) {
        throw new Error('Failed to start debate');
      }

      const result = await response.json();
      setSession(result.session);

      if (onDebateComplete) {
        onDebateComplete(result.result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsDebating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="debate-loading">
        <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
        <span className="ml-2 text-gray-400">Loading debate session...</span>
      </div>
    );
  }

  if (!session && !isDebating) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 text-center" data-testid="debate-empty">
        <Gavel className="w-12 h-12 mx-auto mb-4 text-purple-400" />
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Parliament Debate</h3>
        <p className="text-sm text-gray-400 mb-4">
          Start a multi-agent debate to evaluate this idea from multiple perspectives.
        </p>
        <button
          onClick={startDebate}
          disabled={!ideaId}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
          data-testid="start-debate-btn"
        >
          <Users className="w-4 h-4" />
          Start Debate
        </button>
      </div>
    );
  }

  if (isDebating) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6" data-testid="debate-in-progress">
        <div className="flex items-center justify-center gap-3 mb-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Gavel className="w-8 h-8 text-purple-400" />
          </motion.div>
          <span className="text-lg font-semibold text-gray-200">Debate in Progress</span>
        </div>
        <div className="space-y-2">
          {['Selecting agents...', 'Opening arguments...', 'Challenges and rebuttals...', 'Reaching consensus...', 'Voting...'].map((step, index) => (
            <motion.div
              key={step}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.5 }}
              className="flex items-center gap-2 text-sm text-gray-400"
            >
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              {step}
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-700/40 rounded-lg" data-testid="debate-error">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchSession}
          className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
          data-testid="debate-retry-btn"
        >
          Retry
        </button>
      </div>
    );
  }

  // Guard against null session (TypeScript narrowing)
  if (!session) {
    return null;
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden" data-testid="debate-visualization">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gavel className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-semibold text-gray-200">Parliament Debate</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              session.status === 'consensus' ? 'bg-green-500/20 text-green-400' :
              session.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>
              {session.status}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-400">
              Consensus: <span className="font-medium text-purple-400">{Math.round(session.consensusLevel * 100)}%</span>
            </div>
            <button
              onClick={fetchSession}
              className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors"
              title="Refresh"
              data-testid="debate-refresh-btn"
            >
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Result Banner */}
      {session.selectedIdeaId && (
        <div className="px-4 py-2 bg-green-500/10 border-b border-green-500/30 flex items-center gap-2">
          <Award className="w-4 h-4 text-green-400" />
          <span className="text-sm text-green-400">Idea approved by parliament vote</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-700/40">
        {([
          { id: 'rounds', label: 'Debate Rounds', icon: <MessageSquare className="w-4 h-4" />, count: session.rounds.length },
          { id: 'votes', label: 'Votes', icon: <Vote className="w-4 h-4" />, count: session.votes[0]?.votes.length || 0 },
          { id: 'tradeoffs', label: 'Trade-offs', icon: <Scale className="w-4 h-4" />, count: session.tradeOffs.length },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/30'
            }`}
            data-testid={`debate-tab-${tab.id}`}
          >
            {tab.icon}
            {tab.label}
            <span className="px-1.5 py-0.5 rounded-full bg-gray-700/50 text-xs">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'rounds' && (
            <motion.div
              key="rounds"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {session.rounds.map((round) => (
                <div key={round.roundNumber} className="border border-gray-700/40 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedRound(expandedRound === round.roundNumber ? null : round.roundNumber)}
                    className="w-full flex items-center justify-between p-3 bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
                    data-testid={`round-header-${round.roundNumber}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200">Round {round.roundNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        round.outcome === 'consensus' ? 'bg-green-500/20 text-green-400' :
                        round.outcome === 'vote_required' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {round.outcome}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{round.turns.length} turns</span>
                      {expandedRound === round.roundNumber ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedRound === round.roundNumber && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-3 space-y-3 border-t border-gray-700/40">
                          {round.turns.map((turn) => (
                            <DebateTurnCard key={turn.id} turn={turn} />
                          ))}
                          {round.summary && (
                            <div className="p-2 bg-gray-900/50 rounded text-xs text-gray-400">
                              <span className="font-medium">Summary:</span> {round.summary}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'votes' && session.votes[0] && (
            <motion.div
              key="votes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Vote Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center" data-testid="vote-summary-support">
                  <CheckCircle className="w-6 h-6 mx-auto mb-1 text-green-400" />
                  <div className="text-xl font-bold text-green-400">{session.votes[0].supportCount}</div>
                  <div className="text-xs text-gray-400">Support</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center" data-testid="vote-summary-oppose">
                  <XCircle className="w-6 h-6 mx-auto mb-1 text-red-400" />
                  <div className="text-xl font-bold text-red-400">{session.votes[0].opposeCount}</div>
                  <div className="text-xs text-gray-400">Oppose</div>
                </div>
                <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-3 text-center" data-testid="vote-summary-abstain">
                  <MinusCircle className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                  <div className="text-xl font-bold text-gray-400">{session.votes[0].abstainCount}</div>
                  <div className="text-xs text-gray-400">Abstain</div>
                </div>
              </div>

              {/* Weighted Result */}
              <div className="p-3 bg-gray-800/40 rounded-lg" data-testid="vote-weighted-result">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Weighted Vote Margin</span>
                  <span className={`text-lg font-bold ${session.votes[0].passed ? 'text-green-400' : 'text-red-400'}`}>
                    {session.votes[0].passed ? '+' : ''}{session.votes[0].margin.toFixed(2)}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(session.votes[0].weightedSupport / (session.votes[0].weightedSupport + (session.votes[0].opposeCount * 1))) * 100}%` }}
                    className="h-full bg-gradient-to-r from-green-500 to-green-400"
                  />
                </div>
              </div>

              {/* Individual Votes */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-400">Individual Votes</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {session.votes[0].votes.map((vote) => (
                    <VoteCard key={vote.agentType} vote={vote} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'tradeoffs' && (
            <motion.div
              key="tradeoffs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {session.tradeOffs.length === 0 ? (
                <div className="text-center py-8 text-gray-400" data-testid="no-tradeoffs">
                  <Scale className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No significant trade-offs identified</p>
                </div>
              ) : (
                session.tradeOffs.map((tradeOff) => (
                  <TradeOffCard key={tradeOff.id} tradeOff={tradeOff} />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
