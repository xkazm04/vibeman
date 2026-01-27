'use client';

/**
 * DecisionBadge Component
 * Shows a badge with the count of new decisions from Butler.
 * Clicking shows recent decisions in a dropdown.
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, XCircle, SkipForward, Trash2 } from 'lucide-react';
import {
  useDecisionSyncStore,
  formatDecisionAction,
  getTimeSinceLastPoll,
  type DecisionRecord,
} from '@/stores/decisionSyncStore';

interface DecisionBadgeProps {
  className?: string;
}

export function DecisionBadge({ className = '' }: DecisionBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const newDecisionCount = useDecisionSyncStore((s) => s.newDecisionCount);
  const recentDecisions = useDecisionSyncStore((s) => s.recentDecisions);
  const lastPollAt = useDecisionSyncStore((s) => s.lastPollAt);
  const clearNewDecisionCount = useDecisionSyncStore((s) => s.clearNewDecisionCount);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Don't render if no new decisions
  if (newDecisionCount === 0) {
    return null;
  }

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClear = () => {
    clearNewDecisionCount();
    setIsOpen(false);
  };

  // Get action icon
  const getActionIcon = (action: DecisionRecord['action']) => {
    switch (action) {
      case 'accept_direction':
        return <Check className="w-3 h-3 text-emerald-400" />;
      case 'reject_direction':
        return <XCircle className="w-3 h-3 text-red-400" />;
      case 'skip_direction':
        return <SkipForward className="w-3 h-3 text-amber-400" />;
      default:
        return null;
    }
  };

  // Get action color class
  const getActionColor = (action: DecisionRecord['action']) => {
    switch (action) {
      case 'accept_direction':
        return 'text-emerald-400';
      case 'reject_direction':
        return 'text-red-400';
      case 'skip_direction':
        return 'text-amber-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Badge Button */}
      <motion.button
        onClick={handleToggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 hover:bg-orange-500/30 transition-colors"
      >
        <Bell className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{newDecisionCount}</span>

        {/* Pulse indicator */}
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 bg-gray-900 border border-gray-700/50 rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50 bg-gray-800/50">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-medium text-white">
                  Decisions from Butler
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Decisions List */}
            <div className="max-h-64 overflow-y-auto">
              {recentDecisions.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  No recent decisions
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {recentDecisions.slice(0, 10).map((decision, index) => (
                    <div
                      key={`${decision.directionId}-${index}`}
                      className="px-3 py-2 hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {getActionIcon(decision.action)}
                        <span className={`text-xs font-medium ${getActionColor(decision.action)}`}>
                          {formatDecisionAction(decision.action)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500 truncate">
                        Direction: {decision.directionId.slice(0, 12)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-700/50 bg-gray-800/30">
              <span className="text-xs text-gray-500">
                Last sync: {getTimeSinceLastPoll(lastPollAt)}
              </span>
              <button
                onClick={handleClear}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700/50 rounded transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
