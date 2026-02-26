/**
 * Tool Call Display
 * Interactive tool capability display — shows executed tools as clickable pills.
 * Clicking a tool pill opens the CapabilityCatalog focused on that tool's category.
 * Includes a "Browse All" button to discover all available capabilities.
 */

'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Wrench, CheckCircle2, Terminal, Sparkles } from 'lucide-react';
import { TOOL_LABELS, TOOL_CATEGORIES, TOOL_MAP } from './capabilityManifest';
import CapabilityCatalog from './CapabilityCatalog';

interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

interface ToolCallDisplayProps {
  toolCalls: ToolCall[];
}

export default function ToolCallDisplay({ toolCalls }: ToolCallDisplayProps) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogCategory, setCatalogCategory] = useState<string | undefined>();
  const [highlightTool, setHighlightTool] = useState<string | undefined>();

  const handleToolClick = useCallback((toolName: string) => {
    const category = TOOL_CATEGORIES[toolName];
    setCatalogCategory(category);
    setHighlightTool(toolName);
    setCatalogOpen(true);
  }, []);

  const handleBrowseAll = useCallback(() => {
    setCatalogCategory(undefined);
    setHighlightTool(undefined);
    setCatalogOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setCatalogOpen(false);
    setHighlightTool(undefined);
  }, []);

  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 mt-2 mb-1">
        {toolCalls.map((tool, idx) => {
          const isCLI = TOOL_MAP[tool.name]?.isCLI || false;
          return (
            <motion.button
              key={idx}
              onClick={() => handleToolClick(tool.name)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ delay: idx * 0.05 }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs cursor-pointer transition-colors ${
                isCLI
                  ? 'bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20'
                  : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/20'
              }`}
              title={TOOL_MAP[tool.name]?.description || tool.name}
            >
              {isCLI ? <Terminal className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
              <span>{TOOL_LABELS[tool.name] || tool.name}</span>
              <CheckCircle2 className="w-3 h-3 text-green-400" />
            </motion.button>
          );
        })}

        {/* Browse All capabilities button */}
        <motion.button
          onClick={handleBrowseAll}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ delay: toolCalls.length * 0.05 }}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10 cursor-pointer transition-colors"
          title="Browse all Annette capabilities"
        >
          <Sparkles className="w-3 h-3" />
          <span>All Tools</span>
        </motion.button>
      </div>

      <CapabilityCatalog
        isOpen={catalogOpen}
        onClose={handleClose}
        initialCategory={catalogCategory}
        highlightTool={highlightTool}
      />
    </>
  );
}
