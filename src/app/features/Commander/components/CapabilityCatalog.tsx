/**
 * Capability Catalog
 * Browsable modal showing all Annette tool capabilities organized by category.
 * Users can see descriptions, usage frequency, and click to invoke tools.
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Brain, Compass, Lightbulb, Target, FolderTree,
  Terminal, FolderOpen, ClipboardList, Search, Wrench,
  Zap, ChevronRight, BarChart3, Sparkles,
} from 'lucide-react';
import { useAnnetteStore } from '@/stores/annetteStore';
import {
  CAPABILITY_CATEGORIES,
  CapabilityCategory,
  ToolCapability,
  countToolUsage,
} from './capabilityManifest';

interface CapabilityCatalogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-select a category on open */
  initialCategory?: string;
  /** Pre-highlight a specific tool */
  highlightTool?: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Brain: <Brain className="w-4 h-4" />,
  Compass: <Compass className="w-4 h-4" />,
  Lightbulb: <Lightbulb className="w-4 h-4" />,
  Target: <Target className="w-4 h-4" />,
  FolderTree: <FolderTree className="w-4 h-4" />,
  Terminal: <Terminal className="w-4 h-4" />,
  FolderOpen: <FolderOpen className="w-4 h-4" />,
  ClipboardList: <ClipboardList className="w-4 h-4" />,
  Search: <Search className="w-4 h-4" />,
};

const COLOR_CLASSES: Record<string, { bg: string; border: string; text: string; pill: string }> = {
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', pill: 'bg-purple-500/15 text-purple-300' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', pill: 'bg-cyan-500/15 text-cyan-300' },
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', pill: 'bg-yellow-500/15 text-yellow-300' },
  green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', pill: 'bg-green-500/15 text-green-300' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', pill: 'bg-blue-500/15 text-blue-300' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', pill: 'bg-amber-500/15 text-amber-300' },
  slate: { bg: 'bg-slate-500/10', border: 'border-slate-500/20', text: 'text-slate-400', pill: 'bg-slate-500/15 text-slate-300' },
  indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', pill: 'bg-indigo-500/15 text-indigo-300' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', pill: 'bg-rose-500/15 text-rose-300' },
};

function UsageBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/5 text-[10px] text-gray-400 font-mono">
      <BarChart3 className="w-2.5 h-2.5" />
      {count}x
    </span>
  );
}

function ToolCard({
  tool,
  color,
  usageCount,
  isHighlighted,
  onInvoke,
}: {
  tool: ToolCapability;
  color: string;
  usageCount: number;
  isHighlighted: boolean;
  onInvoke: (tool: ToolCapability) => void;
}) {
  const colors = COLOR_CLASSES[color] || COLOR_CLASSES.cyan;

  return (
    <motion.button
      onClick={() => onInvoke(tool)}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all group ${
        isHighlighted
          ? `${colors.bg} ${colors.border} ring-1 ring-offset-0`
          : 'border-gray-700/40 hover:border-gray-600/60 hover:bg-gray-800/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
              {tool.label}
            </span>
            {tool.isCLI && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/20">
                <Terminal className="w-2.5 h-2.5" />
                CLI
              </span>
            )}
            <UsageBadge count={usageCount} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{tool.description}</p>
        </div>
        <div className={`flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${colors.text}`}>
          {tool.requiresInput ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
        </div>
      </div>
    </motion.button>
  );
}

function CategorySidebar({
  categories,
  activeId,
  usageCounts,
  onSelect,
}: {
  categories: CapabilityCategory[];
  activeId: string;
  usageCounts: Record<string, number>;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="w-48 flex-shrink-0 border-r border-gray-700/50 py-2">
      {categories.map((cat) => {
        const isActive = cat.id === activeId;
        const colors = COLOR_CLASSES[cat.color] || COLOR_CLASSES.cyan;
        const catUsage = cat.tools.reduce((sum, t) => sum + (usageCounts[t.name] || 0), 0);

        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all ${
              isActive
                ? `${colors.bg} ${colors.text} border-r-2`
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
            }`}
            style={isActive ? { borderRightColor: 'currentColor' } : undefined}
          >
            <span className={isActive ? colors.text : 'text-gray-500'}>
              {CATEGORY_ICONS[cat.icon] || <Wrench className="w-4 h-4" />}
            </span>
            <span className="text-xs font-medium flex-1 truncate">{cat.label}</span>
            {catUsage > 0 && (
              <span className="text-[10px] font-mono text-gray-600">{catUsage}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function CapabilityCatalog({
  isOpen,
  onClose,
  initialCategory,
  highlightTool,
}: CapabilityCatalogProps) {
  const [activeCategory, setActiveCategory] = useState(initialCategory || CAPABILITY_CATEGORIES[0].id);
  const messages = useAnnetteStore((s) => s.messages);
  const sendMessage = useAnnetteStore((s) => s.sendMessage);
  const isLoading = useAnnetteStore((s) => s.isLoading);

  const usageCounts = useMemo(() => countToolUsage(messages), [messages]);

  const activeCat = useMemo(
    () => CAPABILITY_CATEGORIES.find(c => c.id === activeCategory) || CAPABILITY_CATEGORIES[0],
    [activeCategory]
  );

  const totalTools = CAPABILITY_CATEGORIES.reduce((sum, c) => sum + c.tools.length, 0);
  const usedTools = new Set(Object.keys(usageCounts)).size;

  const handleInvoke = useCallback((tool: ToolCapability) => {
    if (isLoading) return;
    onClose();
    sendMessage(tool.triggerPrompt);
  }, [isLoading, onClose, sendMessage]);

  // Sync initialCategory when it changes while open
  if (initialCategory && initialCategory !== activeCategory && isOpen) {
    setActiveCategory(initialCategory);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-2xl max-h-[75vh] bg-gradient-to-br from-gray-900 via-gray-850 to-gray-900 border border-gray-700/60 rounded-xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Annette Capabilities</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {totalTools} tools across {CAPABILITY_CATEGORIES.length} categories
                    {usedTools > 0 && <span className="text-gray-600"> &middot; {usedTools} used this session</span>}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Body: sidebar + content */}
            <div className="flex flex-1 min-h-0">
              <CategorySidebar
                categories={CAPABILITY_CATEGORIES}
                activeId={activeCategory}
                usageCounts={usageCounts}
                onSelect={setActiveCategory}
              />

              {/* Tool list */}
              <div className="flex-1 overflow-y-auto p-3">
                <div className="mb-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${(COLOR_CLASSES[activeCat.color] || COLOR_CLASSES.cyan).text}`}>
                    {activeCat.label}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">{activeCat.description}</p>
                </div>

                <div className="space-y-1.5">
                  {activeCat.tools.map((tool, idx) => (
                    <ToolCard
                      key={tool.name}
                      tool={tool}
                      color={activeCat.color}
                      usageCount={usageCounts[tool.name] || 0}
                      isHighlighted={tool.name === highlightTool}
                      onInvoke={handleInvoke}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-gray-700/50 bg-gray-800/30">
              <p className="text-[10px] text-gray-600 text-center">
                Click a tool to ask Annette to use it &middot; Tools with <ChevronRight className="w-2.5 h-2.5 inline" /> will ask for details first
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
