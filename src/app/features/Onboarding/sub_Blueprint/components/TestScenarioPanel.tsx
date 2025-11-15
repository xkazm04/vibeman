'use client';

/**
 * Test Scenario Panel
 * Displays AI-generated test scenarios and execution results in Blueprint layout
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TestScenario, TestExecution, VisualDiff } from '@/app/db';
import { Play, CheckCircle, XCircle, Clock, Eye, Download } from 'lucide-react';

interface TestScenarioPanelProps {
  projectId: string;
  contextId?: string;
}

export function TestScenarioPanel({ projectId, contextId }: TestScenarioPanelProps) {
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [executions, setExecutions] = useState<Record<string, TestExecution>>({});
  const [loading, setLoading] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [visualDiffs, setVisualDiffs] = useState<VisualDiff[]>([]);

  // Load scenarios
  useEffect(() => {
    loadScenarios();
  }, [projectId, contextId]);

  async function loadScenarios() {
    try {
      const params = new URLSearchParams({ projectId });
      if (contextId) params.append('contextId', contextId);

      const res = await fetch(`/api/test-scenarios?${params}`);
      const data = await res.json();
      setScenarios(data.scenarios || []);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    }
  }

  async function runScenario(scenarioId: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/test-scenarios/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId,
          baseUrl: 'http://localhost:3000',
          captureScreenshots: true
        })
      });

      const data = await res.json();
      if (data.execution) {
        setExecutions(prev => ({ ...prev, [scenarioId]: data.execution }));
      }
    } catch (error) {
      console.error('Failed to run scenario:', error);
    } finally {
      setLoading(false);
    }
  }

  async function viewExecution(executionId: string) {
    try {
      const res = await fetch(`/api/test-scenarios/execute?executionId=${executionId}`);
      const data = await res.json();
      setVisualDiffs(data.visualDiffs || []);
    } catch (error) {
      console.error('Failed to load execution:', error);
    }
  }

  function getStatusIcon(status?: string) {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-400" data-testid="test-status-passed-icon" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" data-testid="test-status-failed-icon" />;
      case 'running':
        return <Clock className="w-5 h-5 text-yellow-400 animate-spin" data-testid="test-status-running-icon" />;
      default:
        return <Play className="w-5 h-5 text-gray-400" data-testid="test-status-pending-icon" />;
    }
  }

  function getStatusColor(status?: string): string {
    switch (status) {
      case 'passed':
        return 'border-green-500/30 bg-green-950/20';
      case 'failed':
        return 'border-red-500/30 bg-red-950/20';
      case 'running':
        return 'border-yellow-500/30 bg-yellow-950/20';
      default:
        return 'border-cyan-500/20 bg-slate-900/40';
    }
  }

  return (
    <div className="h-full flex flex-col bg-slate-950/80 backdrop-blur-sm border border-cyan-500/20 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/20">
        <h2
          className="text-xl font-mono text-cyan-400 uppercase tracking-wider"
          data-testid="test-scenario-panel-title"
        >
          Test Scenarios
        </h2>
        <div className="text-sm text-cyan-300/60" data-testid="test-scenario-count">
          {scenarios.length} scenarios
        </div>
      </div>

      {/* Scenarios List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {scenarios.map((scenario, index) => {
            const execution = executions[scenario.id];
            const statusColor = getStatusColor(execution?.status);

            return (
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={`border rounded-lg p-4 transition-all hover:border-cyan-400/40 ${statusColor}`}
                data-testid={`test-scenario-card-${index}`}
              >
                {/* Scenario Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3
                      className="font-mono text-cyan-100 font-medium mb-1"
                      data-testid={`test-scenario-name-${index}`}
                    >
                      {scenario.name}
                    </h3>
                    <p className="text-sm text-cyan-300/60" data-testid={`test-scenario-desc-${index}`}>
                      {scenario.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {getStatusIcon(execution?.status)}
                    <button
                      onClick={() => runScenario(scenario.id)}
                      disabled={loading}
                      className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded text-sm text-cyan-300 transition-colors disabled:opacity-50"
                      data-testid={`run-test-btn-${index}`}
                    >
                      Run
                    </button>
                  </div>
                </div>

                {/* Steps Preview */}
                <div className="space-y-1 mb-3">
                  {scenario.user_flows.slice(0, 3).map((step, stepIdx) => (
                    <div
                      key={stepIdx}
                      className="text-xs text-cyan-300/50 font-mono flex items-center gap-2"
                      data-testid={`test-step-${index}-${stepIdx}`}
                    >
                      <span className="text-cyan-500">{step.step}.</span>
                      <span>{step.action}</span>
                      <span className="text-cyan-400/40">{step.selector}</span>
                    </div>
                  ))}
                  {scenario.user_flows.length > 3 && (
                    <div className="text-xs text-cyan-300/30 font-mono">
                      +{scenario.user_flows.length - 3} more steps
                    </div>
                  )}
                </div>

                {/* Execution Results */}
                {execution && (
                  <div className="mt-3 pt-3 border-t border-cyan-500/10">
                    <div className="flex items-center justify-between text-xs">
                      <div className="space-y-1">
                        <div className="text-cyan-300/60">
                          <span className="text-cyan-400">Status:</span> {execution.status}
                        </div>
                        {execution.execution_time_ms && (
                          <div className="text-cyan-300/60">
                            <span className="text-cyan-400">Time:</span> {execution.execution_time_ms}ms
                          </div>
                        )}
                        {execution.error_message && (
                          <div className="text-red-400 text-xs mt-1">
                            Error: {execution.error_message}
                          </div>
                        )}
                      </div>
                      {execution.screenshots.length > 0 && (
                        <button
                          onClick={() => viewExecution(execution.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded text-cyan-300 transition-colors"
                          data-testid={`view-screenshots-btn-${index}`}
                        >
                          <Eye className="w-3 h-3" />
                          {execution.screenshots.length} screenshots
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Confidence Score */}
                {scenario.ai_confidence_score && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="text-xs text-cyan-300/50">AI Confidence:</div>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500"
                        style={{ width: `${scenario.ai_confidence_score}%` }}
                      />
                    </div>
                    <div className="text-xs text-cyan-400 font-mono">
                      {scenario.ai_confidence_score}%
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {scenarios.length === 0 && (
          <div className="text-center py-12 text-cyan-300/40" data-testid="no-scenarios-message">
            <p>No test scenarios generated yet.</p>
            <p className="text-sm mt-2">Use the context analyzer to generate scenarios.</p>
          </div>
        )}
      </div>

      {/* Visual Diffs Modal */}
      <AnimatePresence>
        {visualDiffs.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8"
            onClick={() => setVisualDiffs([])}
            data-testid="visual-diffs-modal"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-cyan-500/30 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-cyan-500/20">
                <h3 className="text-xl font-mono text-cyan-400">Visual Diffs</h3>
              </div>
              <div className="p-6 space-y-4">
                {visualDiffs.map((diff, idx) => (
                  <div key={diff.id} className="border border-cyan-500/20 rounded-lg p-4">
                    <h4 className="font-mono text-cyan-300 mb-2">{diff.step_name}</h4>
                    {diff.has_differences && (
                      <div className="text-sm text-yellow-400 mb-2">
                        Diff: {diff.diff_percentage?.toFixed(2)}%
                      </div>
                    )}
                    <div className="text-xs text-cyan-300/50">
                      {diff.viewport_width}x{diff.viewport_height}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
