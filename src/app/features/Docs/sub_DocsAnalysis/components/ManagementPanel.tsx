/**
 * ManagementPanel Component
 * Expandable panel for managing context groups and relationships
 */

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ContextGroup } from '@/stores/contextStore';
import type { ContextGroupRelationship } from '@/lib/queries/contextQueries';
import ArchitectureGroupList from './ArchitectureGroupList';
import ArchitectureRelationships from './ArchitectureRelationships';

interface ManagementPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
  groups: ContextGroup[];
  relationships: ContextGroupRelationship[];
  onUpdateGroup: (
    groupId: string,
    updates: { name?: string; type?: 'pages' | 'client' | 'server' | 'external' | null }
  ) => Promise<void>;
  onCreateRelationship: (sourceGroupId: string, targetGroupId: string) => Promise<void>;
  onDeleteRelationship: (relationshipId: string) => Promise<void>;
  isMutating: boolean;
}

export default function ManagementPanel({
  isExpanded,
  onToggle,
  groups,
  relationships,
  onUpdateGroup,
  onCreateRelationship,
  onDeleteRelationship,
  isMutating,
}: ManagementPanelProps) {
  return (
    <>
      {/* Expanded Panel - Full height overlay */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="absolute inset-0 top-[52px] z-20 bg-gray-900/95 backdrop-blur-md border-t border-gray-700/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="h-full flex flex-col">
              {/* Panel Header */}
              <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-800/30 transition-colors border-b border-gray-700/30"
                data-testid="collapse-management-panel-btn"
              >
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Group Management
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {/* Panel Content - fills remaining height */}
              <div className="flex-1 overflow-hidden p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                  {/* Context Groups List */}
                  <div className="bg-gray-800/30 rounded-xl border border-gray-700/30 overflow-hidden">
                    <ArchitectureGroupList
                      groups={groups}
                      onUpdateGroup={onUpdateGroup}
                      loading={isMutating}
                    />
                  </div>

                  {/* Relationships Management */}
                  <div className="bg-gray-800/30 rounded-xl border border-gray-700/30 overflow-hidden">
                    <ArchitectureRelationships
                      groups={groups}
                      relationships={relationships}
                      onCreateRelationship={onCreateRelationship}
                      onDeleteRelationship={onDeleteRelationship}
                      loading={isMutating}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed Panel Toggle Button */}
      {!isExpanded && (
        <div className="border-t border-gray-700/30 bg-gray-900/60 backdrop-blur-sm">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-800/30 transition-colors"
            data-testid="expand-management-panel-btn"
          >
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Group Management
            </span>
            <ChevronUp className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}
    </>
  );
}
