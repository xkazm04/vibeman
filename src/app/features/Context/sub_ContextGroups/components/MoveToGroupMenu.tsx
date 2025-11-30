import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, FolderMinus } from 'lucide-react';
import { ContextGroup } from '@/stores/contextStore';

interface MoveToGroupMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  groups: ContextGroup[];
  currentGroupId: string | null;
  onMoveToGroup: (groupId: string | null) => void;
  onClose: () => void;
}

/**
 * Keyboard-accessible menu for moving context cards between groups
 *
 * Features:
 * - Number shortcuts (0-9) for quick group selection
 * - Arrow key navigation
 * - Visual indicators for keyboard shortcuts
 * - Screen reader announcements
 */
const MoveToGroupMenu = React.memo<MoveToGroupMenuProps>(({
  isOpen,
  position,
  groups,
  currentGroupId,
  onMoveToGroup,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = React.useState(0);
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset focus when menu opens
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(0);
    }
  }, [isOpen]);

  // Focus the menu when it opens
  useEffect(() => {
    if (isOpen && menuRef.current) {
      menuRef.current.focus();
    }
  }, [isOpen]);

  // Defensive check: ensure groups is an array
  const safeGroups = Array.isArray(groups) ? groups : [];

  // All options including "Unsorted"
  const options = [
    { id: null, name: 'Unsorted', color: '#71717a', shortcut: '0' },
    ...safeGroups.map((g, i) => ({
      id: g.id,
      name: g.name,
      color: g.color,
      shortcut: i < 9 ? String(i + 1) : undefined,
    })),
  ];

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, options.length - 1));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          onMoveToGroup(options[focusedIndex].id);
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9': {
          event.preventDefault();
          const index = parseInt(event.key, 10);
          if (index < options.length) {
            onMoveToGroup(options[index].id);
          }
          break;
        }
      }
    },
    [options, focusedIndex, onMoveToGroup, onClose]
  );

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const menuContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20"
            style={{ zIndex: 999998 }}
            onClick={onClose}
            data-testid="move-menu-backdrop"
          />

          {/* Menu */}
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed bg-gray-900/95 backdrop-blur-xl border border-cyan-500/30 rounded-xl shadow-2xl py-2 min-w-[240px] overflow-hidden"
            style={{
              left: `${Math.min(position.x, window.innerWidth - 260)}px`,
              top: `${Math.min(position.y, window.innerHeight - 300)}px`,
              zIndex: 999999,
              boxShadow:
                '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(6, 182, 212, 0.2)',
            }}
            role="menu"
            aria-label="Move context to group"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            data-testid="move-to-group-menu"
          >
            {/* Header */}
            <div className="px-4 py-2 border-b border-cyan-500/20 mb-1">
              <h3 className="text-sm font-semibold text-cyan-300 flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Move to Group
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Press number or arrow keys to select
              </p>
            </div>

            {/* Options */}
            <div className="max-h-[300px] overflow-y-auto">
              {options.map((option, index) => {
                const isCurrentGroup = option.id === currentGroupId;
                const isFocused = index === focusedIndex;

                return (
                  <motion.button
                    key={option.id ?? 'unsorted'}
                    className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-all duration-150
                      ${isFocused ? 'bg-cyan-500/20' : 'hover:bg-gray-800/50'}
                      ${isCurrentGroup ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                    onClick={() => {
                      if (!isCurrentGroup) {
                        onMoveToGroup(option.id);
                      }
                    }}
                    disabled={isCurrentGroup}
                    role="menuitem"
                    aria-selected={isFocused}
                    aria-disabled={isCurrentGroup}
                    data-testid={`move-to-group-${option.id ?? 'unsorted'}`}
                    whileHover={!isCurrentGroup ? { x: 4 } : undefined}
                  >
                    {/* Shortcut badge */}
                    {option.shortcut && (
                      <span
                        className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold
                          ${isFocused ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-300'}
                        `}
                      >
                        {option.shortcut}
                      </span>
                    )}

                    {/* Color indicator */}
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: option.color }}
                    />

                    {/* Group name */}
                    <span
                      className={`flex-1 font-medium truncate
                        ${isFocused ? 'text-cyan-300' : 'text-gray-200'}
                        ${isCurrentGroup ? 'line-through' : ''}
                      `}
                    >
                      {option.name}
                    </span>

                    {/* Current indicator */}
                    {isCurrentGroup && (
                      <span className="text-xs text-gray-500">(current)</span>
                    )}

                    {/* Unsorted icon */}
                    {option.id === null && (
                      <FolderMinus className="w-4 h-4 text-gray-500" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-cyan-500/20 mt-1">
              <p className="text-xs text-gray-500 text-center">
                <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400 text-[10px]">Esc</kbd>
                {' '}to cancel
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined'
    ? createPortal(menuContent, document.body)
    : null;
});

MoveToGroupMenu.displayName = 'MoveToGroupMenu';

export default MoveToGroupMenu;
