'use client';

import { Table2, Grid3X3, Layers, GitBranch } from 'lucide-react';

/** Available view modes for the Questions & Directions review section. */
export type QuestionsViewMode = 'table' | 'tree' | 'matrix' | 'carousel';

interface ViewModeToggleProps {
  /** Currently active view mode. */
  viewMode: QuestionsViewMode;
  /** Callback when the user selects a different view mode. */
  onViewModeChange: (mode: QuestionsViewMode) => void;
  /** Number of pending directions — shown as badge on the carousel tab. */
  pendingDirections: number;
  /** Number of question trees — shown as badge on the tree tab. */
  totalTrees: number;
}

/**
 * View configuration for each tab in the toggle bar.
 * Each entry drives one button with its icon, label, active style, and optional badge.
 */
const VIEW_MODES = [
  {
    key: 'table' as const,
    label: 'Table',
    icon: Table2,
    activeClass: 'bg-zinc-600/30 text-zinc-200 shadow-sm border border-zinc-500/20',
  },
  {
    key: 'matrix' as const,
    label: 'Matrix',
    icon: Grid3X3,
    activeClass: 'bg-cyan-600/30 text-cyan-300 shadow-sm border border-cyan-500/20',
  },
  {
    key: 'carousel' as const,
    label: 'Carousel',
    icon: Layers,
    activeClass: 'bg-emerald-600/30 text-emerald-300 shadow-sm border border-emerald-500/20',
    badgeKey: 'pendingDirections' as const,
    badgeClass: 'bg-emerald-500/20 text-emerald-400',
  },
  {
    key: 'tree' as const,
    label: 'Tree',
    icon: GitBranch,
    activeClass: 'bg-purple-600/30 text-purple-300 shadow-sm border border-purple-500/20',
    badgeKey: 'totalTrees' as const,
    badgeClass: 'bg-purple-500/20 text-purple-400',
  },
] as const;

/**
 * Toggle bar for switching between Questions & Directions view modes.
 *
 * Renders a pill-style segmented control with four view options:
 * table (default), matrix, carousel, and tree. Carousel and tree tabs
 * display badge counts when items are available.
 */
export default function ViewModeToggle({
  viewMode,
  onViewModeChange,
  pendingDirections,
  totalTrees,
}: ViewModeToggleProps) {
  const badgeCounts: Record<string, number> = {
    pendingDirections,
    totalTrees,
  };

  return (
    <div className="flex items-center gap-1 bg-gray-800/60 rounded-lg p-0.5 border border-gray-700/40">
      {VIEW_MODES.map(({ key, label, icon: Icon, activeClass, ...rest }) => {
        const badgeCount = 'badgeKey' in rest ? badgeCounts[rest.badgeKey] : 0;
        const badgeClass = 'badgeClass' in rest ? rest.badgeClass : undefined;

        return (
          <button
            key={key}
            onClick={() => onViewModeChange(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === key ? activeClass : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {badgeCount > 0 && badgeClass && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${badgeClass}`}>
                {badgeCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
