/**
 * AutomationPanel Component
 * Compact icon-based controls for the standup automation system
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  RefreshCw,
  Clock,
  AlertCircle,
  Bot,
  Wand2, // manual goal generation
  // Autonomy level icons
  Lightbulb, // suggest - just ideas
  Shield, // cautious - safe automation
  Rocket, // autonomous - full speed
  // Strategy icons
  Hammer, // build - create new things
  Sparkles, // polish - improve existing
} from 'lucide-react';
import GoalCandidatesModal from './GoalCandidatesModal';

// Types for goal candidates
interface GoalCandidate {
  title: string;
  description: string;
  reasoning: string;
  priorityScore: number;
  suggestedContext?: string;
  category: string;
  source: string;
  relatedItems?: string[];
}

interface ProjectCandidates {
  projectId: string;
  projectName: string;
  candidates: GoalCandidate[];
}

interface AutomationStatus {
  running: boolean;
  lastRun: string | null;
  nextRun: string | null;
  totalCyclesRun: number;
  stats: {
    goalsEvaluated: number;
    statusesUpdated: number;
    goalsGenerated: number;
    tasksCreated: number;
  };
}

interface AutomationConfig {
  enabled: boolean;
  intervalMinutes: number;
  autonomyLevel: 'suggest' | 'cautious' | 'autonomous';
  strategy: 'build' | 'polish';
  modes: {
    evaluateGoals: boolean;
    updateStatuses: boolean;
    generateGoals: boolean;
    createAnalysisTasks: boolean;
  };
}

// Interval options: 1, 2, 4, 8 hours
const INTERVAL_OPTIONS = [
  { value: 60, label: '1h' },
  { value: 120, label: '2h' },
  { value: 240, label: '4h' },
  { value: 480, label: '8h' },
];

const AUTONOMY_OPTIONS = [
  { value: 'suggest', label: 'Suggest', icon: Lightbulb, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/40' },
  { value: 'cautious', label: 'Cautious', icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40' },
  { value: 'autonomous', label: 'Auto', icon: Rocket, color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' },
];

const STRATEGY_OPTIONS = [
  { value: 'build', label: 'Build', icon: Hammer, color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/40' },
  { value: 'polish', label: 'Polish', icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/40' },
];

export default function AutomationPanel() {
  const [status, setStatus] = useState<AutomationStatus | null>(null);
  const [config, setConfig] = useState<AutomationConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Candidates modal state
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [projectCandidates, setProjectCandidates] = useState<ProjectCandidates[]>([]);

  // Fetch status and config
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/standup/automation?includeHistory=false');
      const data = await response.json();

      if (data.success) {
        setStatus(data.status);
        setConfig(data.config);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch status');
      }
    } catch (err) {
      setError('Failed to connect to automation service');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Poll every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Start automation
  const handleStart = async () => {
    try {
      const response = await fetch('/api/standup/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const data = await response.json();

      if (data.success) {
        setStatus(data.status);
        setError(null);
      } else {
        setError(data.error || 'Failed to start automation');
      }
    } catch (err) {
      setError('Failed to start automation');
    }
  };

  // Stop automation
  const handleStop = async () => {
    try {
      const response = await fetch('/api/standup/automation', {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        await fetchStatus();
      } else {
        setError(data.error || 'Failed to stop automation');
      }
    } catch (err) {
      setError('Failed to stop automation');
    }
  };

  // Run now (full cycle - evaluate, update, generate)
  const handleRunNow = async () => {
    setIsRunning(true);
    try {
      const response = await fetch('/api/standup/automation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();

      if (data.success) {
        await fetchStatus();
      } else {
        setError(data.error || 'Failed to run automation');
      }
    } catch (err) {
      setError('Failed to run automation');
    } finally {
      setIsRunning(false);
    }
  };

  // Generate goals and create Claude Code tasks (manual trigger)
  const handleGenerateGoals = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/standup/automation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Only run goal generation and task creation
          modes: {
            evaluateGoals: false,
            updateStatuses: false,
            generateGoals: true,
            createAnalysisTasks: true,
          },
        }),
      });
      const data = await response.json();

      if (data.success) {
        await fetchStatus();

        // Show feedback based on results
        const { summary, debug, results } = data;

        // Check for issues
        if (!debug?.hasAnthropicKey) {
          setError('Missing ANTHROPIC_API_KEY - goal generation requires Anthropic API');
        } else if (summary.goalsGenerated === 0 && summary.projectsProcessed > 0) {
          // Check for errors in results
          const projectErrors = debug?.projectsWithErrors || [];
          if (projectErrors.length > 0) {
            const firstError = projectErrors[0]?.errors?.[0] || 'Unknown error';
            setError(`Generation failed: ${firstError}`);
          } else {
            setError('No goals generated - check console for details');
          }
        } else if (summary.goalsGenerated > 0 && results) {
          // Extract candidates from results and show modal for review
          console.log('[AutomationPanel] Extracting candidates from results:', results);

          const candidatesData: ProjectCandidates[] = results
            .filter((r: any) => r.goalsGenerated && r.goalsGenerated.length > 0)
            .map((r: any) => ({
              projectId: r.projectId,
              projectName: r.projectName,
              candidates: r.goalsGenerated,
            }));

          console.log('[AutomationPanel] Candidates data:', candidatesData);

          if (candidatesData.length > 0) {
            setProjectCandidates(candidatesData);
            setShowCandidatesModal(true);
            console.log('[AutomationPanel] Modal should now be visible');
          } else {
            console.log('[AutomationPanel] No candidates found despite summary showing generation');
            setSuccessMessage(`Generated ${summary.goalsGenerated} goal candidate(s)!`);
            setTimeout(() => setSuccessMessage(null), 5000);
          }
        }
      } else {
        setError(data.error || 'Failed to generate goals');
      }
    } catch (err) {
      setError('Failed to generate goals');
    } finally {
      setIsGenerating(false);
    }
  };

  // Accept goal candidates
  const handleAcceptCandidates = async (projectId: string, candidates: GoalCandidate[]) => {
    const response = await fetch('/api/standup/automation/accept-candidates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        candidates,
        createAnalysis: true,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to create goals');
    }

    // Refresh status after creating goals
    await fetchStatus();

    return data;
  };

  // Update config
  const handleConfigUpdate = async (updates: Partial<AutomationConfig>) => {
    if (!config) return;

    const newConfig = { ...config, ...updates };
    setConfig(newConfig);

    try {
      const response = await fetch('/api/standup/automation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to update config');
        setConfig(config); // Revert
      }
    } catch (err) {
      setError('Failed to update config');
      setConfig(config); // Revert
    }
  };

  // Format time ago
  const formatTimeAgo = (isoString: string | null) => {
    if (!isoString) return 'Never';

    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Format time until
  const formatTimeUntil = (isoString: string | null) => {
    if (!isoString) return '--';

    const date = new Date(isoString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins <= 0) return 'Soon';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m`;
  };

  // Get current option configs
  const currentAutonomy = AUTONOMY_OPTIONS.find(o => o.value === config?.autonomyLevel) || AUTONOMY_OPTIONS[1];
  const currentStrategy = STRATEGY_OPTIONS.find(o => o.value === config?.strategy) || STRATEGY_OPTIONS[0];

  if (isLoading) {
    return (
      <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 px-4 py-3">
      {/* Single Row Config Panel */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Status & Controls */}
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${status?.running ? 'bg-emerald-500/20' : 'bg-gray-700/50'}`}>
            <Bot className={`w-4 h-4 ${status?.running ? 'text-emerald-400' : 'text-gray-400'}`} />
          </div>

          {/* Start/Stop Toggle */}
          <button
            onClick={status?.running ? handleStop : handleStart}
            className={`p-1.5 rounded-lg transition-colors ${
              status?.running
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            }`}
            title={status?.running ? 'Stop automation' : 'Start automation'}
          >
            {status?.running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Run Now (full cycle) */}
          <button
            onClick={handleRunNow}
            disabled={isRunning || isGenerating}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50"
            title="Run full cycle (evaluate, update, generate)"
          >
            <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          </button>

          {/* Generate Goals + Claude Code Tasks */}
          <button
            onClick={handleGenerateGoals}
            disabled={isRunning || isGenerating}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
              isGenerating
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-gray-400 hover:text-purple-400 hover:bg-purple-500/10'
            }`}
            title="Generate new goals & create Claude Code tasks"
          >
            <Wand2 className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
          </button>
        </div>

        <div className="w-px h-6 bg-gray-700" />

        {/* Interval Selection */}
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-gray-500" />
          <div className="flex bg-gray-800/50 rounded-lg p-0.5">
            {INTERVAL_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleConfigUpdate({ intervalMinutes: opt.value })}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  config?.intervalMinutes === opt.value
                    ? 'bg-purple-500/30 text-purple-300'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                title={`Check every ${opt.label}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-6 bg-gray-700" />

        {/* Autonomy Level */}
        <div className="flex items-center gap-1">
          <div className="flex bg-gray-800/50 rounded-lg p-0.5">
            {AUTONOMY_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const isSelected = config?.autonomyLevel === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleConfigUpdate({ autonomyLevel: opt.value as any })}
                  className={`p-1.5 rounded transition-colors ${
                    isSelected
                      ? `${opt.bg} ${opt.color} border ${opt.border}`
                      : 'text-gray-400 hover:text-gray-300 border border-transparent'
                  }`}
                  title={opt.label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
          <span className={`text-xs font-medium ${currentAutonomy.color}`}>
            {currentAutonomy.label}
          </span>
        </div>

        <div className="w-px h-6 bg-gray-700" />

        {/* Strategy */}
        <div className="flex items-center gap-1">
          <div className="flex bg-gray-800/50 rounded-lg p-0.5">
            {STRATEGY_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const isSelected = config?.strategy === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleConfigUpdate({ strategy: opt.value as any })}
                  className={`p-1.5 rounded transition-colors ${
                    isSelected
                      ? `${opt.bg} ${opt.color} border ${opt.border}`
                      : 'text-gray-400 hover:text-gray-300 border border-transparent'
                  }`}
                  title={opt.label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
          <span className={`text-xs font-medium ${currentStrategy.color}`}>
            {currentStrategy.label}
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stats Mini */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-500">
            <span className="text-purple-400 font-medium">{status?.stats.goalsEvaluated || 0}</span> eval
          </span>
          <span className="text-gray-500">
            <span className="text-emerald-400 font-medium">{status?.stats.statusesUpdated || 0}</span> upd
          </span>
          <span className="text-gray-500">
            <span className="text-blue-400 font-medium">{status?.stats.tasksCreated || 0}</span> tasks
          </span>
        </div>

        {/* Next Run / Status */}
        <div className="text-xs text-gray-500">
          {status?.running ? (
            <span>Next: <span className="text-gray-300">{formatTimeUntil(status.nextRun)}</span></span>
          ) : (
            <span className="text-gray-600">Paused</span>
          )}
        </div>
      </div>

      {/* Status messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400/60 hover:text-red-400"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
        {successMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 px-3 py-2 rounded-lg">
              <Sparkles className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goal Candidates Review Modal */}
      <GoalCandidatesModal
        isOpen={showCandidatesModal}
        onClose={() => {
          setShowCandidatesModal(false);
          setProjectCandidates([]);
        }}
        projectCandidates={projectCandidates}
        onAccept={handleAcceptCandidates}
      />
    </div>
  );
}
