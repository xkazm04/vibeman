'use client';

import { useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Command,
  ArrowRight,
  Clock,
  Target,
  FolderTree,
  Lightbulb,
  Heart,
  Play,
  BarChart3,
  Activity,
  BookOpen,
  Wand2,
  Trophy,
  Users,
  Layers,
  Sunrise,
  Map,
  Sparkles,
  Scan,
  X,
} from 'lucide-react';
import { useWorkflowStore, getQuickActions, filterQuickActions, type QuickAction } from '@/stores/workflowStore';
import { useOnboardingStore, type AppModule } from '@/stores/onboardingStore';

// Icon mapping
const ICON_MAP: Record<string, React.ElementType> = {
  Target,
  FolderTree,
  Lightbulb,
  Heart,
  Play,
  BarChart3,
  Activity,
  BookOpen,
  Wand2,
  Trophy,
  Users,
  Layers,
  Sunrise,
  Map,
  Sparkles,
  Scan,
};

export default function CommandPalette() {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    isCommandPaletteOpen,
    commandPaletteQuery,
    closeCommandPalette,
    setCommandPaletteQuery,
    recentEntities,
    pushStep,
    addRecentEntity,
  } = useWorkflowStore();

  const { setActiveModule, activeModule } = useOnboardingStore();

  // Handle navigation
  const handleNavigate = useCallback((module: AppModule) => {
    setActiveModule(module);
    pushStep({ module, label: module });
    closeCommandPalette();
  }, [setActiveModule, pushStep, closeCommandPalette]);

  // Get all quick actions
  const allActions = useMemo(() => {
    return getQuickActions(activeModule, recentEntities, handleNavigate);
  }, [activeModule, recentEntities, handleNavigate]);

  // Filter actions based on query
  const filteredActions = useMemo(() => {
    return filterQuickActions(allActions, commandPaletteQuery);
  }, [allActions, commandPaletteQuery]);

  // Selected index for keyboard navigation
  const selectedIndexRef = useRef(0);

  // Focus input when opened
  useEffect(() => {
    if (isCommandPaletteOpen && inputRef.current) {
      inputRef.current.focus();
      selectedIndexRef.current = 0;
    }
  }, [isCommandPaletteOpen]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isCommandPaletteOpen) {
          closeCommandPalette();
        } else {
          useWorkflowStore.getState().openCommandPalette();
        }
        return;
      }

      // Handle navigation when open
      if (!isCommandPaletteOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeCommandPalette();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndexRef.current = Math.min(
          selectedIndexRef.current + 1,
          filteredActions.length - 1
        );
        scrollToSelected();
        // Force re-render
        setCommandPaletteQuery(commandPaletteQuery);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndexRef.current = Math.max(selectedIndexRef.current - 1, 0);
        scrollToSelected();
        setCommandPaletteQuery(commandPaletteQuery);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const action = filteredActions[selectedIndexRef.current];
        if (action) {
          executeAction(action);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, filteredActions, closeCommandPalette, commandPaletteQuery, setCommandPaletteQuery]);

  // Scroll selected item into view
  const scrollToSelected = () => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector('[data-selected="true"]');
      selectedEl?.scrollIntoView({ block: 'nearest' });
    }
  };

  // Execute an action
  const executeAction = (action: QuickAction) => {
    if (action.action) {
      action.action();
    } else if (action.module) {
      handleNavigate(action.module);
      if (action.entityId && action.entityType && action.entityName) {
        addRecentEntity({
          id: action.entityId,
          type: action.entityType as 'context' | 'goal' | 'idea' | 'task' | 'requirement',
          name: action.entityName,
          module: action.module,
        });
      }
    }
    closeCommandPalette();
  };

  // Reset selected index when query changes
  useEffect(() => {
    selectedIndexRef.current = 0;
  }, [commandPaletteQuery]);

  // Get icon component
  const getIcon = (iconName?: string) => {
    if (!iconName) return ArrowRight;
    return ICON_MAP[iconName] || ArrowRight;
  };

  // Category labels
  const getCategoryLabel = (category: QuickAction['category']) => {
    switch (category) {
      case 'navigation': return 'Go to';
      case 'action': return 'Actions';
      case 'entity': return 'Entities';
      case 'recent': return 'Recent';
      default: return '';
    }
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
        onClick={closeCommandPalette}
        data-testid="command-palette-backdrop"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Palette */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="relative w-full max-w-xl bg-slate-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          data-testid="command-palette"
        >
          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.02] pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />

          {/* Search Input */}
          <div className="relative flex items-center gap-3 px-4 py-3 border-b border-gray-700/50">
            <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={commandPaletteQuery}
              onChange={(e) => setCommandPaletteQuery(e.target.value)}
              placeholder="Search commands, modules, or entities..."
              className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 text-sm outline-none"
              data-testid="command-palette-input"
            />
            <div className="flex items-center gap-1.5 text-gray-500">
              <kbd className="px-1.5 py-0.5 text-[10px] bg-gray-800 rounded border border-gray-700">
                <Command className="w-3 h-3 inline" />K
              </kbd>
              <span className="text-xs">to toggle</span>
            </div>
            <button
              onClick={closeCommandPalette}
              className="p-1 hover:bg-gray-800 rounded transition-colors"
              data-testid="command-palette-close"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Results */}
          <div
            ref={listRef}
            className="max-h-[60vh] overflow-y-auto py-2"
            data-testid="command-palette-results"
          >
            {filteredActions.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                No results found for &ldquo;{commandPaletteQuery}&rdquo;
              </div>
            ) : (
              <>
                {/* Group by category */}
                {(['recent', 'navigation', 'action'] as const).map((category) => {
                  const categoryActions = filteredActions.filter((a) => a.category === category);
                  if (categoryActions.length === 0) return null;

                  return (
                    <div key={category} className="mb-2">
                      <div className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                        {getCategoryLabel(category)}
                      </div>
                      {categoryActions.map((action) => {
                        const globalIndex = filteredActions.indexOf(action);
                        const isSelected = selectedIndexRef.current === globalIndex;
                        const Icon = action.category === 'recent' ? Clock : getIcon(action.icon);

                        return (
                          <button
                            key={action.id}
                            onClick={() => executeAction(action)}
                            onMouseEnter={() => {
                              selectedIndexRef.current = globalIndex;
                              setCommandPaletteQuery(commandPaletteQuery);
                            }}
                            data-selected={isSelected}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              isSelected
                                ? 'bg-purple-500/20 text-white'
                                : 'text-gray-300 hover:bg-gray-800/50'
                            }`}
                            data-testid={`command-palette-item-${action.id}`}
                          >
                            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                              isSelected ? 'bg-purple-500/30' : 'bg-gray-800/50'
                            }`}>
                              <Icon className={`w-4 h-4 ${isSelected ? 'text-purple-300' : 'text-gray-400'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{action.label}</div>
                              <div className="text-xs text-gray-500 truncate">{action.description}</div>
                            </div>
                            {action.shortcut && (
                              <kbd className="px-1.5 py-0.5 text-[10px] bg-gray-800 rounded border border-gray-700 text-gray-400">
                                {action.shortcut}
                              </kbd>
                            )}
                            {isSelected && (
                              <ArrowRight className="w-4 h-4 text-purple-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-700/50 flex items-center justify-between text-[10px] text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-gray-800 rounded border border-gray-700">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-gray-800 rounded border border-gray-700">↵</kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-gray-800 rounded border border-gray-700">esc</kbd>
                close
              </span>
            </div>
            <span className="text-gray-600">
              {filteredActions.length} result{filteredActions.length !== 1 ? 's' : ''}
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
