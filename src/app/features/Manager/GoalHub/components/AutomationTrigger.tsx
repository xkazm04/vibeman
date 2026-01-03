/**
 * AutomationTrigger Component
 * Compact automation control for GoalHub header
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Loader2, CheckCircle2, XCircle, Play, Settings } from 'lucide-react';

interface AutomationTriggerProps {
  projectId: string;
  projectPath: string;
  projectName: string;
  onAutomationComplete?: () => void;
}

type AutomationPhase = 'idle' | 'starting' | 'exploring' | 'evaluating' | 'generating' | 'complete' | 'failed';

interface AutomationState {
  phase: AutomationPhase;
  progress: number;
  message: string;
  sessionId: string | null;
}

export default function AutomationTrigger({
  projectId,
  projectPath,
  projectName,
  onAutomationComplete,
}: AutomationTriggerProps) {
  const [state, setState] = useState<AutomationState>({
    phase: 'idle',
    progress: 0,
    message: '',
    sessionId: null,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [strategy, setStrategy] = useState<'build' | 'polish'>('build');

  // Poll for progress when automation is running
  useEffect(() => {
    if (!state.sessionId || state.phase === 'idle' || state.phase === 'complete' || state.phase === 'failed') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/standup/automation/sessions/${state.sessionId}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.session) {
            setState(prev => ({
              ...prev,
              phase: data.session.phase,
              progress: data.session.progress || prev.progress,
              message: data.session.message || prev.message,
            }));

            if (data.session.phase === 'complete') {
              onAutomationComplete?.();
            }
          }
        }
      } catch (error) {
        console.error('Failed to poll automation status:', error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [state.sessionId, state.phase, onAutomationComplete]);

  const startAutomation = useCallback(async () => {
    if (state.phase !== 'idle' && state.phase !== 'complete' && state.phase !== 'failed') {
      return;
    }

    setState({
      phase: 'starting',
      progress: 0,
      message: 'Initializing automation...',
      sessionId: null,
    });

    try {
      const response = await fetch('/api/standup/automation/unified', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectPath,
          projectName,
          strategy,
          autonomyLevel: 'cautious',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start automation');
      }

      const data = await response.json();
      setState({
        phase: 'exploring',
        progress: 10,
        message: 'Claude Code is exploring the codebase...',
        sessionId: data.sessionId,
      });
    } catch (error) {
      setState({
        phase: 'failed',
        progress: 0,
        message: error instanceof Error ? error.message : 'Automation failed',
        sessionId: null,
      });
    }
  }, [projectId, projectPath, projectName, strategy, state.phase]);

  const getPhaseColor = (phase: AutomationPhase) => {
    switch (phase) {
      case 'exploring': return 'text-cyan-400';
      case 'evaluating': return 'text-amber-400';
      case 'generating': return 'text-purple-400';
      case 'complete': return 'text-emerald-400';
      case 'failed': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const isRunning = state.phase !== 'idle' && state.phase !== 'complete' && state.phase !== 'failed';

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* Main Automation Button */}
        <button
          onClick={startAutomation}
          disabled={isRunning}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            isRunning
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 cursor-wait'
              : state.phase === 'complete'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
              : state.phase === 'failed'
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
          }`}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">{state.progress}%</span>
            </>
          ) : state.phase === 'complete' ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span className="hidden sm:inline">Done</span>
            </>
          ) : state.phase === 'failed' ? (
            <>
              <XCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Retry</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Automate</span>
            </>
          )}
        </button>

        {/* Settings Toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg transition-all ${
            showSettings
              ? 'bg-gray-700 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Indicator */}
      <AnimatePresence>
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 p-3 bg-gray-900/95 border border-gray-700 rounded-lg shadow-xl z-20 min-w-[280px]"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${getPhaseColor(state.phase)} animate-pulse`} />
              <span className={`text-sm font-medium ${getPhaseColor(state.phase)}`}>
                {state.phase.charAt(0).toUpperCase() + state.phase.slice(1)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden mb-2">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                initial={{ width: 0 }}
                animate={{ width: `${state.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-gray-400 truncate">{state.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Dropdown */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full right-0 mt-2 p-4 bg-gray-900/95 border border-gray-700 rounded-lg shadow-xl z-20 min-w-[200px]"
          >
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">
                  Strategy
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStrategy('build')}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-all ${
                      strategy === 'build'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    Build
                  </button>
                  <button
                    onClick={() => setStrategy('polish')}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-all ${
                      strategy === 'polish'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    Polish
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                {strategy === 'build'
                  ? 'Focus on new features and expansion'
                  : 'Focus on quality and refinement'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
