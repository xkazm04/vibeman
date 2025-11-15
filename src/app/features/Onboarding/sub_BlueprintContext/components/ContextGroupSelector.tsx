'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, X } from 'lucide-react';
import { useActiveProjectStore } from '@/stores/activeProjectStore';
import { fetchContextGroups } from '../lib/contextGroupApi';

export interface ContextGroup {
  id: string;
  projectId: string;
  name: string;
  color: string;
  position: number;
}

export interface ContextGroupSelectorProps {
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string | null) => void;
  className?: string;
}

/**
 * Context group selector bottom panel for Blueprint
 * Allows user to select a single context group for scans
 */
export default function ContextGroupSelector({
  selectedGroupId,
  onSelectGroup,
  className = '',
}: ContextGroupSelectorProps) {
  const { activeProject } = useActiveProjectStore();
  const [groups, setGroups] = useState<ContextGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load context groups when active project changes
  useEffect(() => {
    if (!activeProject) {
      setGroups([]);
      return;
    }

    const loadGroups = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchContextGroups(activeProject.id);
        setGroups(data);
      } catch (err) {
        setError('Failed to load context groups');
        console.error('[ContextGroupSelector] Error loading groups:', err);
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
  }, [activeProject]);

  const handleGroupClick = (groupId: string) => {
    // Toggle selection - clicking selected group deselects it
    if (selectedGroupId === groupId) {
      onSelectGroup(null);
    } else {
      onSelectGroup(groupId);
    }
  };

  if (!activeProject) {
    return null;
  }

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center gap-2 p-4 ${className}`}
        data-testid="context-group-selector-loading"
      >
        <Layers className="w-4 h-4 text-cyan-400 animate-pulse" />
        <span className="text-xs text-gray-400 font-mono">Loading context groups...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center gap-2 p-4 ${className}`}
        data-testid="context-group-selector-error"
      >
        <X className="w-4 h-4 text-red-400" />
        <span className="text-xs text-red-400 font-mono">{error}</span>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div
        className={`flex items-center justify-center gap-2 p-4 ${className}`}
        data-testid="context-group-selector-empty"
      >
        <Layers className="w-4 h-4 text-gray-500" />
        <span className="text-xs text-gray-500 font-mono">No context groups available</span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-3 ${className}`}
      data-testid="context-group-selector"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Layers className="w-4 h-4 text-cyan-400" />
        <h3 className="text-xs font-mono text-cyan-300 uppercase tracking-wider">
          Context Groups
        </h3>
        {selectedGroupId && (
          <button
            onClick={() => onSelectGroup(null)}
            className="ml-auto text-xs text-gray-400 hover:text-cyan-400 font-mono transition-colors"
            data-testid="context-group-clear-btn"
          >
            Clear
          </button>
        )}
      </div>

      {/* Context groups */}
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {groups.map((group, index) => {
            const isSelected = selectedGroupId === group.id;

            return (
              <motion.button
                key={group.id}
                onClick={() => handleGroupClick(group.id)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.03 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  relative px-4 py-2 rounded-lg border-2 transition-all font-mono text-xs
                  ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-lg shadow-cyan-500/30'
                      : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:bg-gray-800/70'
                  }
                `}
                data-testid={`context-group-${group.id}`}
              >
                {/* Color indicator */}
                <div
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                  style={{ backgroundColor: group.color }}
                />

                {/* Group name */}
                <span className="ml-3">{group.name}</span>

                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute inset-0 rounded-lg border-2 border-cyan-400 shadow-lg shadow-cyan-400/30" />
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
