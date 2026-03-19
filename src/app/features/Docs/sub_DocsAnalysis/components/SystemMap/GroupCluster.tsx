/**
 * GroupCluster — Container representing a context group with its child contexts
 */

'use client';

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Context, ContextGroup } from '@/stores/contextStore';
import { getLucideIcon } from './helpers';
import ContextNode from './ContextNode';
import type { ClusterPosition } from './types';

interface GroupClusterProps {
  group: ContextGroup;
  contexts: Context[];
  position: ClusterPosition;
  isSelected: boolean;
  onSelect: (groupId: string) => void;
  onContextSelect?: (contextId: string) => void;
  selectedContextId?: string | null;
  index: number;
  connectionCount: number;
  changeCount: number;
  onPositionChange: (id: string, el: HTMLDivElement | null) => void;
}

export default function GroupCluster({
  group,
  contexts,
  position,
  isSelected,
  onSelect,
  onContextSelect,
  selectedContextId,
  index,
  connectionCount,
  changeCount,
  onPositionChange,
}: GroupClusterProps) {
  const clusterRef = useRef<HTMLDivElement>(null);
  const Icon = getLucideIcon(group.icon);
  const color = group.color || '#06b6d4';

  useEffect(() => {
    onPositionChange(group.id, clusterRef.current);
  }, [group.id, onPositionChange]);

  return (
    <motion.div
      ref={clusterRef}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
      className="absolute"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        width: `${position.width}%`,
        height: `${position.height}%`,
        transform: 'translate(-50%, -50%)',
      }}
      data-testid={`system-map-node-${group.id}`}
    >
      <motion.div
        onClick={() => onSelect(group.id)}
        className={`relative h-full rounded-2xl border backdrop-blur-sm cursor-pointer transition-shadow overflow-hidden ${
          isSelected ? 'ring-1 ring-offset-1 ring-offset-gray-950 ring-white/30' : ''
        }`}
        style={{
          background: `linear-gradient(135deg, ${color}12 0%, ${color}06 100%)`,
          borderColor: isSelected ? `${color}60` : `${color}25`,
          boxShadow: isSelected
            ? `0 0 30px ${color}25, inset 0 0 15px ${color}08`
            : `0 0 10px ${color}10`,
        }}
        whileHover={{
          borderColor: `${color}50`,
          boxShadow: `0 0 25px ${color}20, inset 0 0 15px ${color}08`,
        }}
      >
        {/* Group Header */}
        <div
          className="flex items-center gap-2 px-3 py-2 border-b"
          style={{ borderColor: `${color}15` }}
        >
          <Icon className="w-4 h-4 shrink-0" style={{ color }} />
          <span className="text-xs font-semibold truncate" style={{ color }}>
            {group.name}
          </span>
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            {connectionCount > 0 && (
              <span
                className="text-micro font-mono px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${color}20`, color: `${color}cc` }}
                title={`${connectionCount} connections`}
              >
                {connectionCount}
              </span>
            )}
            {changeCount > 0 && (
              <span
                className="text-micro font-mono px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400"
                title={`${changeCount} changes`}
              >
                {changeCount}
              </span>
            )}
            <span className="text-micro text-gray-600 font-mono">
              {contexts.length}
            </span>
          </div>
        </div>

        {/* Context Nodes */}
        <div className="px-2 py-1.5 flex flex-wrap gap-1 overflow-y-auto max-h-[calc(100%-36px)] custom-scrollbar">
          {contexts.length > 0 ? (
            contexts.map((ctx, i) => (
              <ContextNode
                key={ctx.id}
                context={ctx}
                color={color}
                isSelected={selectedContextId === ctx.id}
                onSelect={(id) => {
                  onContextSelect?.(id);
                }}
                index={i}
              />
            ))
          ) : (
            <div className="flex items-center justify-center w-full py-3">
              <span className="text-2xs text-gray-600 italic">No contexts</span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
