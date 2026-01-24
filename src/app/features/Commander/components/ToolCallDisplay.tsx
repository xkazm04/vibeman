/**
 * Tool Call Display
 * Shows tool executions inline within chat messages
 */

'use client';

import { motion } from 'framer-motion';
import { Wrench, CheckCircle2 } from 'lucide-react';

interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

interface ToolCallDisplayProps {
  toolCalls: ToolCall[];
}

const TOOL_LABELS: Record<string, string> = {
  get_behavioral_context: 'Brain Context',
  get_outcomes: 'Outcomes',
  get_reflection_status: 'Reflection Status',
  trigger_reflection: 'Trigger Reflection',
  get_signals: 'Signals',
  get_insights: 'Insights',
  generate_directions: 'Generate Directions',
  list_directions: 'List Directions',
  get_direction_detail: 'Direction Detail',
  accept_direction: 'Accept Direction',
  reject_direction: 'Reject Direction',
  browse_ideas: 'Browse Ideas',
  accept_idea: 'Accept Idea',
  reject_idea: 'Reject Idea',
  generate_ideas: 'Generate Ideas',
  get_idea_stats: 'Idea Stats',
  list_goals: 'List Goals',
  create_goal: 'Create Goal',
  update_goal: 'Update Goal',
  generate_goal_candidates: 'Goal Candidates',
  list_contexts: 'List Contexts',
  get_context_detail: 'Context Detail',
  scan_contexts: 'Scan Contexts',
  generate_description: 'Generate Description',
  get_queue_status: 'Queue Status',
  queue_requirement: 'Queue Requirement',
  get_execution_status: 'Execution Status',
  get_implementation_logs: 'Implementation Logs',
  get_project_structure: 'Project Structure',
  list_projects: 'List Projects',
  get_project_files: 'Project Files',
  generate_standup: 'Generate Standup',
  get_standup_history: 'Standup History',
  run_automation: 'Run Automation',
};

export default function ToolCallDisplay({ toolCalls }: ToolCallDisplayProps) {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
      {toolCalls.map((tool, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.05 }}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300"
        >
          <Wrench className="w-3 h-3" />
          <span>{TOOL_LABELS[tool.name] || tool.name}</span>
          <CheckCircle2 className="w-3 h-3 text-green-400" />
        </motion.div>
      ))}
    </div>
  );
}
