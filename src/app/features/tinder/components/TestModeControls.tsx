'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Beaker,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Square,
  FastForward,
  RotateCcw,
  Trash2,
  Download,
  ExternalLink,
  Clock,
  Zap,
  Target,
  AlertTriangle,
  X,
} from 'lucide-react';
import { UseTestModeResult } from '../lib/useTestMode';
import { TestScenarioId, ReplaySession } from '../lib/testScenarios';

interface TestModeControlsProps {
  testMode: UseTestModeResult;
  stats: {
    accepted: number;
    rejected: number;
    deleted: number;
  };
  remainingCount: number;
  onReload: () => void;
}

export default function TestModeControls({
  testMode,
  stats,
  remainingCount,
  onReload,
}: TestModeControlsProps) {
  const [expanded, setExpanded] = useState(true);
  const [showScenarios, setShowScenarios] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [autoReplaySpeed, setAutoReplaySpeed] = useState(1000);
  const [isAutoReplaying, setIsAutoReplaying] = useState(false);

  if (!testMode.isTestMode) return null;

  const handleScenarioChange = (scenarioId: TestScenarioId) => {
    testMode.changeScenario(scenarioId);
    setShowScenarios(false);
    onReload();
  };

  const handleStartAutoReplay = () => {
    setIsAutoReplaying(true);
    testMode.autoReplay(autoReplaySpeed);
  };

  const handlePauseAutoReplay = () => {
    setIsAutoReplaying(false);
    testMode.pauseAutoReplay();
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 left-4 z-50"
      data-testid="test-mode-controls"
    >
      {/* Main Panel */}
      <div className="bg-gradient-to-br from-amber-900/90 to-orange-900/90 backdrop-blur-md border border-amber-500/40 rounded-xl shadow-2xl overflow-hidden min-w-[320px]">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-3 bg-amber-800/50 hover:bg-amber-700/50 transition-colors"
          data-testid="test-mode-header-toggle"
        >
          <div className="flex items-center gap-2">
            <Beaker className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-amber-100">Test Mode</span>
            <span className="px-2 py-0.5 bg-amber-500/30 text-amber-200 text-xs rounded-full">
              DEV
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-amber-300" />
          ) : (
            <ChevronDown className="w-4 h-4 text-amber-300" />
          )}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4">
                {/* Scenario Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-amber-300 uppercase tracking-wide">
                    Active Scenario
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowScenarios(!showScenarios)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-black/30 border border-amber-500/30 rounded-lg hover:border-amber-400/50 transition-colors"
                      data-testid="scenario-selector-btn"
                    >
                      <div className="text-left">
                        <div className="text-sm font-medium text-white">
                          {testMode.scenarioName}
                        </div>
                        <div className="text-xs text-amber-300/70">
                          {testMode.totalIdeas} ideas
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-amber-400" />
                    </button>

                    <AnimatePresence>
                      {showScenarios && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-amber-500/30 rounded-lg shadow-xl overflow-hidden z-10"
                          data-testid="scenario-dropdown"
                        >
                          {testMode.scenarios.map((scenario) => (
                            <button
                              key={scenario.id}
                              onClick={() => handleScenarioChange(scenario.id)}
                              className={`w-full px-3 py-2 text-left hover:bg-amber-500/20 transition-colors ${
                                scenario.id === testMode.scenarioId
                                  ? 'bg-amber-500/30'
                                  : ''
                              }`}
                              data-testid={`scenario-option-${scenario.id}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-white">
                                  {scenario.name}
                                </span>
                                <span className="text-xs text-amber-300/70">
                                  {scenario.ideaCount}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {scenario.description}
                              </p>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center p-2 bg-black/20 rounded-lg">
                    <div className="text-lg font-bold text-green-400">{stats.accepted}</div>
                    <div className="text-xs text-gray-400">Accept</div>
                  </div>
                  <div className="text-center p-2 bg-black/20 rounded-lg">
                    <div className="text-lg font-bold text-red-400">{stats.rejected}</div>
                    <div className="text-xs text-gray-400">Reject</div>
                  </div>
                  <div className="text-center p-2 bg-black/20 rounded-lg">
                    <div className="text-lg font-bold text-gray-400">{stats.deleted}</div>
                    <div className="text-xs text-gray-400">Delete</div>
                  </div>
                  <div className="text-center p-2 bg-black/20 rounded-lg">
                    <div className="text-lg font-bold text-amber-400">{remainingCount}</div>
                    <div className="text-xs text-gray-400">Left</div>
                  </div>
                </div>

                {/* Replay Controls */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-amber-300 uppercase tracking-wide flex items-center gap-2">
                    <Zap className="w-3 h-3" />
                    Replay Controls
                  </label>

                  {testMode.isReplaying ? (
                    <div className="space-y-2">
                      {/* Progress Bar */}
                      <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${testMode.replayProgress}%` }}
                        />
                      </div>
                      <div className="text-xs text-amber-300/70 text-center">
                        {testMode.replayProgress}% complete
                      </div>

                      {/* Playback Controls */}
                      <div className="flex items-center justify-center gap-2">
                        {isAutoReplaying ? (
                          <button
                            onClick={handlePauseAutoReplay}
                            className="p-2 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg transition-colors"
                            data-testid="pause-replay-btn"
                          >
                            <Pause className="w-5 h-5 text-amber-400" />
                          </button>
                        ) : (
                          <button
                            onClick={handleStartAutoReplay}
                            className="p-2 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg transition-colors"
                            data-testid="play-replay-btn"
                          >
                            <Play className="w-5 h-5 text-amber-400" />
                          </button>
                        )}
                        <button
                          onClick={() => testMode.stepReplay()}
                          className="p-2 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg transition-colors"
                          data-testid="step-replay-btn"
                        >
                          <FastForward className="w-5 h-5 text-amber-400" />
                        </button>
                        <button
                          onClick={testMode.stopReplay}
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                          data-testid="stop-replay-btn"
                        >
                          <Square className="w-5 h-5 text-red-400" />
                        </button>
                      </div>

                      {/* Speed Control */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-amber-300/70">Speed:</span>
                        <input
                          type="range"
                          min="200"
                          max="3000"
                          step="200"
                          value={autoReplaySpeed}
                          onChange={(e) => setAutoReplaySpeed(Number(e.target.value))}
                          className="flex-1 accent-amber-500"
                          data-testid="replay-speed-slider"
                        />
                        <span className="text-amber-300 w-12">{autoReplaySpeed}ms</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSessions(!showSessions)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-black/30 border border-amber-500/30 rounded-lg hover:border-amber-400/50 transition-colors"
                      data-testid="sessions-toggle-btn"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="text-sm text-white">
                          Saved Sessions ({testMode.savedSessions.length})
                        </span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-amber-400" />
                    </button>
                  )}
                </div>

                {/* Saved Sessions List */}
                <AnimatePresence>
                  {showSessions && !testMode.isReplaying && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      {testMode.savedSessions.length === 0 ? (
                        <div className="text-center py-4 text-sm text-gray-400">
                          No saved sessions yet. Start swiping to record a session.
                        </div>
                      ) : (
                        <>
                          {testMode.savedSessions.slice(0, 5).map((session) => (
                            <SessionCard
                              key={session.id}
                              session={session}
                              onReplay={() => testMode.startReplay(session.id)}
                              onDelete={() => testMode.deleteSavedSession(session.id)}
                              formatDate={formatDate}
                              formatDuration={formatDuration}
                            />
                          ))}
                          {testMode.savedSessions.length > 5 && (
                            <div className="text-xs text-amber-300/70 text-center">
                              +{testMode.savedSessions.length - 5} more sessions
                            </div>
                          )}
                          <button
                            onClick={testMode.clearAllSessions}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg transition-colors text-red-400 text-sm"
                            data-testid="clear-sessions-btn"
                          >
                            <Trash2 className="w-4 h-4" />
                            Clear All Sessions
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Quick Actions */}
                <div className="flex gap-2 pt-2 border-t border-amber-500/20">
                  <button
                    onClick={() => {
                      onReload();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-black/30 hover:bg-black/40 border border-amber-500/30 rounded-lg transition-colors text-sm text-white"
                    data-testid="reset-scenario-btn"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                  <button
                    onClick={testMode.exitTestMode}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg transition-colors text-sm text-red-400"
                    data-testid="exit-test-mode-btn"
                  >
                    <X className="w-4 h-4" />
                    Exit Test
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Warning Badge */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-1 bg-amber-500 text-black text-xs font-bold rounded-full shadow-lg"
      >
        <AlertTriangle className="w-3 h-3" />
        TEST
      </motion.div>
    </motion.div>
  );
}

// ===== Session Card Component =====

interface SessionCardProps {
  session: ReplaySession;
  onReplay: () => void;
  onDelete: () => void;
  formatDate: (dateStr: string) => string;
  formatDuration: (ms: number) => string;
}

function SessionCard({
  session,
  onReplay,
  onDelete,
  formatDate,
  formatDuration,
}: SessionCardProps) {
  const totalDuration = session.actions.reduce((sum, a) => sum + a.duration, 0);
  const acceptCount = session.actions.filter(a => a.action === 'accept').length;
  const rejectCount = session.actions.filter(a => a.action === 'reject').length;

  return (
    <div className="flex items-center gap-2 p-2 bg-black/20 rounded-lg group">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">
          {session.scenarioId} ({session.actions.length} actions)
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{formatDate(session.startedAt)}</span>
          <span>•</span>
          <span className="text-green-400">{acceptCount}✓</span>
          <span className="text-red-400">{rejectCount}✗</span>
          <span>•</span>
          <span>{formatDuration(totalDuration)}</span>
        </div>
      </div>
      <button
        onClick={onReplay}
        className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 rounded transition-colors opacity-0 group-hover:opacity-100"
        title="Replay this session"
        data-testid={`replay-session-${session.id}`}
      >
        <Play className="w-4 h-4 text-amber-400" />
      </button>
      <button
        onClick={onDelete}
        className="p-1.5 bg-red-500/20 hover:bg-red-500/30 rounded transition-colors opacity-0 group-hover:opacity-100"
        title="Delete this session"
        data-testid={`delete-session-${session.id}`}
      >
        <Trash2 className="w-4 h-4 text-red-400" />
      </button>
    </div>
  );
}
