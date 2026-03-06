/**
 * ClusterMap — Groups as cluster containers, contexts as nodes inside them
 *
 * Replaces the 4-row layer layout with a dynamic grid of group clusters.
 * Relationships between groups are drawn as Bézier curves between clusters.
 */

'use client';

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Context, ContextGroup } from '@/stores/contextStore';
import type { ContextGroupRelationship } from '@/lib/queries/contextQueries';
import type { ClusterPosition } from './types';
import GroupCluster from './GroupCluster';
import ConnectionLine from './ConnectionLine';

interface ClusterMapProps {
  groups: ContextGroup[];
  contexts: Context[];
  relationships: ContextGroupRelationship[];
  moduleCountData?: Record<string, number>;
  selectedModuleId?: string | null;
  onModuleSelect: (moduleId: string) => void;
  onModuleHover?: (moduleId: string | null) => void;
}

/**
 * Calculate grid positions for clusters based on group count.
 */
function calculateClusterPositions(count: number): ClusterPosition[] {
  if (count === 0) return [];

  const cols = count <= 2 ? count : count <= 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);

  const gapX = 4; // percentage gap
  const gapY = 4;
  const clusterW = (100 - gapX * (cols + 1)) / cols;
  const clusterH = (100 - gapY * (rows + 1)) / rows;

  const positions: ClusterPosition[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.push({
      x: gapX + col * (clusterW + gapX) + clusterW / 2,
      y: gapY + row * (clusterH + gapY) + clusterH / 2,
      width: clusterW,
      height: clusterH,
    });
  }

  return positions;
}

export default function ClusterMap({
  groups,
  contexts,
  relationships,
  moduleCountData,
  selectedModuleId,
  onModuleSelect,
}: ClusterMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clusterRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [clusterPositions, setClusterPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Group contexts by their groupId, collect ungrouped
  const contextsByGroup = useMemo(() => {
    const map = new Map<string, Context[]>();

    // Initialize all groups
    groups.forEach(g => map.set(g.id, []));

    // Distribute contexts
    const ungrouped: Context[] = [];
    contexts.forEach(ctx => {
      if (ctx.groupId && map.has(ctx.groupId)) {
        map.get(ctx.groupId)!.push(ctx);
      } else {
        ungrouped.push(ctx);
      }
    });

    return { grouped: map, ungrouped };
  }, [groups, contexts]);

  // Build connection map for counting
  const connectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    groups.forEach(g => { counts[g.id] = 0; });
    relationships.forEach(rel => {
      counts[rel.sourceGroupId] = (counts[rel.sourceGroupId] || 0) + 1;
      counts[rel.targetGroupId] = (counts[rel.targetGroupId] || 0) + 1;
    });
    return counts;
  }, [groups, relationships]);

  // Include ungrouped as a virtual group if any exist
  const allDisplayGroups = useMemo(() => {
    const result = [...groups];
    if (contextsByGroup.ungrouped.length > 0) {
      result.push({
        id: '__ungrouped__',
        projectId: '',
        name: 'Ungrouped',
        color: '#6b7280',
        position: result.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    return result;
  }, [groups, contextsByGroup.ungrouped]);

  // Calculate cluster positions
  const positions = useMemo(
    () => calculateClusterPositions(allDisplayGroups.length),
    [allDisplayGroups.length]
  );

  // Handle cluster ref registration
  const handleClusterPositionChange = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      clusterRefs.current.set(id, el);
    } else {
      clusterRefs.current.delete(id);
    }
  }, []);

  // Update cluster center positions from DOM
  const updateClusterPositions = useCallback(() => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newPositions = new Map<string, { x: number; y: number }>();

    clusterRefs.current.forEach((el, id) => {
      const rect = el.getBoundingClientRect();
      newPositions.set(id, {
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2,
      });
    });

    setClusterPositions(newPositions);
  }, []);

  useEffect(() => {
    const timer = setTimeout(updateClusterPositions, 150);
    window.addEventListener('resize', updateClusterPositions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateClusterPositions);
    };
  }, [updateClusterPositions, updateTrigger]);

  useEffect(() => {
    const timer = setTimeout(() => setUpdateTrigger(n => n + 1), 300);
    return () => clearTimeout(timer);
  }, [groups, contexts]);

  // Build connection lines between clusters
  const connections = useMemo(() => {
    const conns: { fromPos: { x: number; y: number }; toPos: { x: number; y: number }; fromId: string; toId: string }[] = [];
    const processed = new Set<string>();

    relationships.forEach(rel => {
      const key = [rel.sourceGroupId, rel.targetGroupId].sort().join('-');
      if (processed.has(key)) return;

      const fromPos = clusterPositions.get(rel.sourceGroupId);
      const toPos = clusterPositions.get(rel.targetGroupId);
      if (fromPos && toPos) {
        conns.push({ fromPos, toPos, fromId: rel.sourceGroupId, toId: rel.targetGroupId });
        processed.add(key);
      }
    });

    return conns;
  }, [relationships, clusterPositions]);

  // Highlighted connections when hovering a group
  const highlightedConnections = useMemo(() => {
    if (!hoveredGroup) return new Set<string>();
    const keys = new Set<string>();
    relationships.forEach(rel => {
      if (rel.sourceGroupId === hoveredGroup || rel.targetGroupId === hoveredGroup) {
        keys.add([rel.sourceGroupId, rel.targetGroupId].sort().join('-'));
      }
    });
    return keys;
  }, [hoveredGroup, relationships]);

  if (allDisplayGroups.length === 0) {
    return (
      <div className="relative w-full h-full min-h-[600px] flex items-center justify-center bg-gray-950 rounded-2xl">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-2">No context groups found</p>
          <p className="text-gray-500 text-sm">Create context groups to see the system map</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      className="relative w-full h-full min-h-[600px] overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.98) 100%)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Connection lines between clusters */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
        <defs>
          <filter id="cluster-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {connections.map(conn => {
          const connKey = [conn.fromId, conn.toId].sort().join('-');
          return (
            <ConnectionLine
              key={connKey}
              fromPos={conn.fromPos}
              toPos={conn.toPos}
              isHighlighted={highlightedConnections.has(connKey)}
              uniqueId={`cluster-${connKey}`}
            />
          );
        })}
      </svg>

      {/* Group clusters */}
      <div className="absolute inset-0" style={{ zIndex: 2 }}>
        {allDisplayGroups.map((group, i) => {
          const pos = positions[i];
          if (!pos) return null;

          const isUngrouped = group.id === '__ungrouped__';
          const groupContexts = isUngrouped
            ? contextsByGroup.ungrouped
            : contextsByGroup.grouped.get(group.id) || [];

          return (
            <div
              key={group.id}
              onMouseEnter={() => setHoveredGroup(group.id)}
              onMouseLeave={() => setHoveredGroup(null)}
            >
              <GroupCluster
                group={group}
                contexts={groupContexts}
                position={pos}
                isSelected={selectedModuleId === group.id}
                onSelect={onModuleSelect}
                index={i}
                connectionCount={connectionCounts[group.id] || 0}
                changeCount={moduleCountData?.[group.id] || 0}
                onPositionChange={handleClusterPositionChange}
              />
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
