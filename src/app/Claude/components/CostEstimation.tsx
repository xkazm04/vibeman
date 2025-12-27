'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Clock, FileText, AlertTriangle } from 'lucide-react';

interface CostEstimationProps {
  /** Estimated input tokens */
  inputTokens: number;
  /** Estimated output tokens (typically 2-3x input for code generation) */
  outputTokens?: number;
  /** Model being used */
  model?: 'claude-3-opus' | 'claude-3-sonnet' | 'claude-3-haiku' | 'gpt-4' | 'gpt-4o' | 'ollama';
  /** Number of files in context */
  fileCount?: number;
  /** Show detailed breakdown */
  showDetails?: boolean;
  className?: string;
}

// Pricing per 1M tokens (approximate, as of 2024)
const MODEL_PRICING: Record<string, { input: number; output: number; name: string }> = {
  'claude-3-opus': { input: 15, output: 75, name: 'Claude 3 Opus' },
  'claude-3-sonnet': { input: 3, output: 15, name: 'Claude 3 Sonnet' },
  'claude-3-haiku': { input: 0.25, output: 1.25, name: 'Claude 3 Haiku' },
  'gpt-4': { input: 30, output: 60, name: 'GPT-4' },
  'gpt-4o': { input: 5, output: 15, name: 'GPT-4o' },
  'ollama': { input: 0, output: 0, name: 'Ollama (Local)' },
};

function formatCost(cost: number): string {
  if (cost === 0) return 'Free';
  if (cost < 0.01) return '<$0.01';
  if (cost < 1) return `$${cost.toFixed(2)}`;
  return `$${cost.toFixed(2)}`;
}

function formatTokens(tokens: number): string {
  if (tokens < 1000) return `${tokens}`;
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
  return `${(tokens / 1000000).toFixed(2)}M`;
}

function estimateTime(inputTokens: number, outputTokens: number): string {
  // Rough estimate: ~50 tokens/second for output
  const seconds = Math.ceil((inputTokens + outputTokens) / 50);
  if (seconds < 60) return `~${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  return `~${minutes}m`;
}

export function CostEstimation({
  inputTokens,
  outputTokens,
  model = 'claude-3-sonnet',
  fileCount,
  showDetails = true,
  className = '',
}: CostEstimationProps) {
  const estimatedOutput = outputTokens ?? Math.ceil(inputTokens * 2.5);
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['claude-3-sonnet'];

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (estimatedOutput / 1_000_000) * pricing.output;
  const totalCost = inputCost + outputCost;
  const estimatedDuration = estimateTime(inputTokens, estimatedOutput);

  const isExpensive = totalCost > 0.50;
  const isFree = pricing.input === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border ${
        isFree
          ? 'bg-green-900/20 border-green-500/30'
          : isExpensive
            ? 'bg-amber-900/20 border-amber-500/30'
            : 'bg-gray-800/50 border-gray-700/50'
      } p-3 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <DollarSign className={`w-4 h-4 ${isFree ? 'text-green-400' : isExpensive ? 'text-amber-400' : 'text-gray-400'}`} />
          <span className="text-sm font-medium text-gray-200">Estimated Cost</span>
        </div>
        <span className={`text-lg font-bold ${isFree ? 'text-green-400' : isExpensive ? 'text-amber-400' : 'text-white'}`}>
          {formatCost(totalCost)}
        </span>
      </div>

      {/* Warning for expensive operations */}
      {isExpensive && !isFree && (
        <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-amber-500/10 rounded-md">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs text-amber-300">This operation may be expensive</span>
        </div>
      )}

      {/* Details */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-gray-400">
            <FileText className="w-3 h-3" />
            <span>Input: {formatTokens(inputTokens)} tokens</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <FileText className="w-3 h-3" />
            <span>Output: ~{formatTokens(estimatedOutput)} tokens</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-400">
            <Clock className="w-3 h-3" />
            <span>Duration: {estimatedDuration}</span>
          </div>
          {fileCount !== undefined && (
            <div className="flex items-center gap-1.5 text-gray-400">
              <FileText className="w-3 h-3" />
              <span>{fileCount} file{fileCount !== 1 ? 's' : ''} in context</span>
            </div>
          )}
        </div>
      )}

      {/* Model info */}
      <div className="mt-2 pt-2 border-t border-gray-700/50 text-xs text-gray-500">
        Model: {pricing.name}
      </div>
    </motion.div>
  );
}

/**
 * Compact inline cost badge
 */
export function CostBadge({
  inputTokens,
  model = 'claude-3-sonnet',
}: {
  inputTokens: number;
  model?: string;
}) {
  const estimatedOutput = Math.ceil(inputTokens * 2.5);
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['claude-3-sonnet'];

  const totalCost =
    (inputTokens / 1_000_000) * pricing.input +
    (estimatedOutput / 1_000_000) * pricing.output;

  const isFree = pricing.input === 0;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        isFree
          ? 'bg-green-500/20 text-green-400'
          : 'bg-gray-700/50 text-gray-300'
      }`}
      title={`Estimated cost: ${formatCost(totalCost)}`}
    >
      <DollarSign className="w-3 h-3" />
      {formatCost(totalCost)}
    </span>
  );
}

export default CostEstimation;
