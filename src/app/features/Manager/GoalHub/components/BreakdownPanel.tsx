/**
 * Breakdown Panel Component
 * Displays and triggers goal breakdown analysis
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Lightbulb,
  Shield,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { useGoalHubStore } from '@/stores/goalHubStore';
import { saveRequirement, executeRequirement } from '@/app/Claude/lib/requirementApi';
import type { GoalBreakdown, AgentResponse } from '@/app/db/models/goal-hub.types';
import { SCAN_TYPE_CONFIGS } from '@/app/features/Ideas/lib/scanTypes';

interface BreakdownPanelProps {
  breakdown: GoalBreakdown | null;
  isGenerating: boolean;
  projectPath: string;
}

export default function BreakdownPanel({
  breakdown,
  isGenerating,
  projectPath,
}: BreakdownPanelProps) {
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);

  const { generateBreakdown, saveBreakdownResult, activeGoal } = useGoalHubStore();

  const toggleAgent = (agentType: string) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agentType)) {
        next.delete(agentType);
      } else {
        next.add(agentType);
      }
      return next;
    });
  };

  const handleGenerateBreakdown = async () => {
    if (!activeGoal) return;

    setExecutionError(null);
    setIsExecuting(true);

    try {
      // Get the prompt for Claude Code
      const result = await generateBreakdown(projectPath);
      if (!result) throw new Error('Failed to generate breakdown prompt');

      // Save as a requirement file
      const saved = await saveRequirement(projectPath, result.requirementName, result.prompt);
      if (!saved) throw new Error('Failed to save requirement file');

      // Execute the requirement with Claude Code
      // Note: In a real implementation, this would spawn a Claude Code process
      // For now, we'll show instructions to the user
      setExecutionError(
        `Requirement saved as "${result.requirementName}". ` +
        `Run it with Claude Code to generate the breakdown, then paste the JSON result.`
      );

      // TODO: Integrate with actual Claude Code execution
      // const executed = await executeRequirement(projectPath, result.requirementName);
      // if (executed) {
      //   // Parse the result and save
      //   const agentResponses = parseClaudeCodeOutput(executed.output);
      //   await saveBreakdownResult({ agentResponses });
      // }
    } catch (error) {
      setExecutionError(
        error instanceof Error ? error.message : 'Failed to generate breakdown'
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const getAgentConfig = (agentType: string) => {
    return SCAN_TYPE_CONFIGS.find((c) => c.value === agentType);
  };

  const renderAgentResponse = (response: AgentResponse) => {
    const config = getAgentConfig(response.agentType);
    const isExpanded = expandedAgents.has(response.agentType);

    return (
      <div
        key={response.agentType}
        className="border border-gray-800 rounded-lg overflow-hidden"
      >
        <button
          onClick={() => toggleAgent(response.agentType)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{response.agentEmoji || config?.emoji}</span>
            <div className="text-left">
              <h4 className="font-medium text-white">
                {response.agentLabel || config?.label || response.agentType}
              </h4>
              <p className="text-xs text-gray-500 line-clamp-1">
                {response.perspective}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {response.hypotheses.length} hypotheses
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-800"
            >
              <div className="p-4 space-y-4">
                {/* Perspective */}
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider">
                    Perspective
                  </label>
                  <p className="text-sm text-gray-300 mt-1">{response.perspective}</p>
                </div>

                {/* Recommendations */}
                {response.recommendations.length > 0 && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" />
                      Recommendations
                    </label>
                    <ul className="mt-2 space-y-1">
                      {response.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                          <span className="text-cyan-400">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risks */}
                {response.risks.length > 0 && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Risks
                    </label>
                    <ul className="mt-2 space-y-1">
                      {response.risks.map((risk, i) => (
                        <li key={i} className="text-sm text-orange-400 flex items-start gap-2">
                          <span>⚠️</span>
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Hypotheses Preview */}
                {response.hypotheses.length > 0 && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider">
                      Generated Hypotheses
                    </label>
                    <div className="mt-2 space-y-2">
                      {response.hypotheses.map((h, i) => (
                        <div
                          key={i}
                          className="p-2 bg-gray-800/50 rounded text-sm"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white">{h.title}</span>
                            <span className="px-1.5 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded">
                              {h.category}
                            </span>
                          </div>
                          <p className="text-gray-400 text-xs">{h.statement}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">Multi-Agent Breakdown</h3>
        </div>
        <button
          onClick={handleGenerateBreakdown}
          disabled={isGenerating || isExecuting}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-medium transition-colors"
        >
          {isGenerating || isExecuting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : breakdown ? (
            <>
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Breakdown
            </>
          )}
        </button>
      </div>

      {/* Error/Info Message */}
      {executionError && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-400">{executionError}</p>
        </div>
      )}

      {/* Content */}
      {!breakdown ? (
        <div className="text-center py-16 bg-gradient-to-b from-purple-900/20 to-gray-900/30 border border-gray-800 border-dashed rounded-xl">
          <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
            <Sparkles className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">
            AI-Powered Goal Analysis
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Use multiple AI agents to analyze your goal from different perspectives.
            Each agent provides recommendations, identifies risks, and generates testable hypotheses.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <span className="px-2.5 py-1 text-xs bg-gray-800/50 text-gray-400 rounded-full">🧘 Architecture</span>
            <span className="px-2.5 py-1 text-xs bg-gray-800/50 text-gray-400 rounded-full">🐛 Bug Detection</span>
            <span className="px-2.5 py-1 text-xs bg-gray-800/50 text-gray-400 rounded-full">⚡ Performance</span>
            <span className="px-2.5 py-1 text-xs bg-gray-800/50 text-gray-400 rounded-full">🛡️ Security</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Generated: {new Date(breakdown.createdAt).toLocaleString()}</span>
            {breakdown.modelUsed && <span>Model: {breakdown.modelUsed}</span>}
            {breakdown.inputTokens > 0 && (
              <span>
                Tokens: {breakdown.inputTokens} in / {breakdown.outputTokens} out
              </span>
            )}
          </div>

          {/* Agent Responses */}
          <div className="space-y-3">
            {breakdown.agentResponses.map(renderAgentResponse)}
          </div>
        </div>
      )}
    </div>
  );
}
