'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  ShieldX,
  ChevronDown,
  ChevronRight,
  Wrench,
  FileEdit,
  Terminal as TerminalIcon,
  Eye,
  Search,
  Globe,
  FolderOpen,
} from 'lucide-react';
import { SAFE_TOOLS, type PendingToolApproval } from '../lib/manualSession.types';

// ============================================================================
// Tool icon mapping
// ============================================================================

const TOOL_ICONS: Record<string, typeof Wrench> = {
  Edit: FileEdit,
  Write: FileEdit,
  Read: Eye,
  Bash: TerminalIcon,
  Grep: Search,
  Glob: FolderOpen,
  WebSearch: Globe,
  WebFetch: Globe,
};

// ============================================================================
// Tool input preview
// ============================================================================

function ToolInputPreview({ input }: { input: Record<string, unknown> }) {
  const entries = Object.entries(input).slice(0, 5);

  return (
    <div className="space-y-1 mt-2">
      {entries.map(([key, value]) => {
        const display = typeof value === 'string'
          ? value.length > 200 ? value.slice(0, 200) + '...' : value
          : JSON.stringify(value).slice(0, 200);

        return (
          <div key={key} className="text-2xs">
            <span className="text-gray-500">{key}: </span>
            <span className="text-gray-400 break-all font-mono">{display}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Single tool row
// ============================================================================

function ToolRow({ tool }: { tool: PendingToolApproval }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TOOL_ICONS[tool.toolName] || Wrench;
  const isSafe = SAFE_TOOLS.has(tool.toolName);
  const hasInput = Object.keys(tool.toolInput).length > 0;

  return (
    <div className="rounded-md bg-gray-900/50 border border-gray-700/30">
      <button
        onClick={() => hasInput && setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
        disabled={!hasInput}
      >
        <Icon className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
        <span className="text-xs font-medium text-gray-200 flex-1">{tool.toolName}</span>
        {isSafe && (
          <span className="text-2xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
            safe
          </span>
        )}
        {hasInput && (
          expanded
            ? <ChevronDown className="w-3 h-3 text-gray-500" />
            : <ChevronRight className="w-3 h-3 text-gray-500" />
        )}
      </button>
      {expanded && hasInput && (
        <div className="px-3 pb-2 border-t border-gray-800/50">
          <ToolInputPreview input={tool.toolInput} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main card
// ============================================================================

interface ToolApprovalCardProps {
  tools: PendingToolApproval[];
  onApprove: () => void;
  onDeny: () => void;
}

export function ToolApprovalCard({ tools, onApprove, onDeny }: ToolApprovalCardProps) {
  if (tools.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-3 mb-2 rounded-lg border border-amber-500/20 bg-amber-500/5 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-500/10">
        <ShieldCheck className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-medium text-amber-300">
          Claude wants to use {tools.length} tool{tools.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Tool list */}
      <div className="p-2 space-y-1.5">
        {tools.map((tool) => (
          <ToolRow key={tool.toolUseId} tool={tool} />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-amber-500/10 bg-gray-900/30">
        <button
          onClick={onApprove}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md
            bg-green-500/15 border border-green-500/30 text-green-300
            hover:bg-green-500/25 hover:text-green-200
            transition-colors text-xs font-medium"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Approve
        </button>
        <button
          onClick={onDeny}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md
            bg-red-500/10 border border-red-500/20 text-red-400
            hover:bg-red-500/20 hover:text-red-300
            transition-colors text-xs font-medium"
        >
          <ShieldX className="w-3.5 h-3.5" />
          Deny
        </button>
      </div>
    </motion.div>
  );
}
