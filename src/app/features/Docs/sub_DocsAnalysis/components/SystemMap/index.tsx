/**
 * SystemMap Component - Level 1
 * Structured 4-row layout visualization of context groups
 * Rows: Pages → Client → Server → External
 * Dynamic spacing based on node count per layer
 * Connected to real context groups from the database
 */

'use client';

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

import { SystemMapProps, ModuleLayer, LAYER_CONFIG } from './types';
import { contextGroupsToModules, calculateAllPositions } from './helpers';
import ConnectionLine from './ConnectionLine';
import ModuleNode from './ModuleNode';
import LayerLabel from './LayerLabel';

export default function SystemMap({
  onModuleSelect,
  groups,
  relationships,
  moduleCountData,
  selectedModuleId,
  onModuleHover,
}: SystemMapProps) {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(
    new Map()
  );
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Combined hover handler that updates local state and triggers prefetch callback
  const handleModuleHover = useCallback(
    (moduleId: string | null) => {
      setHoveredModule(moduleId);
      // Trigger prefetch callback when user hovers over a module
      if (moduleId && onModuleHover) {
        onModuleHover(moduleId);
      }
    },
    [onModuleHover]
  );

  // Convert context groups to system modules with count data
  const systemModules = useMemo(() => {
    const modules = contextGroupsToModules(groups, relationships);
    // Merge count data if provided
    if (moduleCountData) {
      return modules.map(m => ({
        ...m,
        count: moduleCountData[m.id] ?? 0,
      }));
    }
    return modules;
  }, [groups, relationships, moduleCountData]);

  // Handle node ref registration
  const handleNodePositionChange = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      nodeRefs.current.set(id, el);
    } else {
      nodeRefs.current.delete(id);
    }
  }, []);

  // Update node positions from DOM
  const updateNodePositions = useCallback(() => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newPositions = new Map<string, { x: number; y: number }>();

    nodeRefs.current.forEach((el, id) => {
      const rect = el.getBoundingClientRect();
      // Get center of the node relative to container
      newPositions.set(id, {
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2,
      });
    });

    setNodePositions(newPositions);
  }, []);

  // Update positions on mount, resize, and when nodes change
  useEffect(() => {
    const timer = setTimeout(updateNodePositions, 100); // Small delay to let nodes render
    window.addEventListener('resize', updateNodePositions);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateNodePositions);
    };
  }, [updateNodePositions, updateTrigger]);

  // Trigger position update after nodes mount or groups change
  useEffect(() => {
    const timer = setTimeout(() => setUpdateTrigger(n => n + 1), 200);
    return () => clearTimeout(timer);
  }, [groups, relationships]);

  // Calculate positioned modules
  const { positionedModules } = useMemo(() => {
    return calculateAllPositions(systemModules);
  }, [systemModules]);

  // Generate connections using actual DOM positions
  const connections = useMemo(() => {
    const conns: {
      fromPos: { x: number; y: number };
      toPos: { x: number; y: number };
      fromId: string;
      toId: string;
    }[] = [];
    const processed = new Set<string>();

    positionedModules.forEach(({ module }) => {
      module.connections.forEach(connId => {
        const connKey = [module.id, connId].sort().join('-');
        if (!processed.has(connKey)) {
          const fromPos = nodePositions.get(module.id);
          const toPos = nodePositions.get(connId);
          if (fromPos && toPos) {
            conns.push({
              fromPos,
              toPos,
              fromId: module.id,
              toId: connId,
            });
            processed.add(connKey);
          }
        }
      });
    });

    return conns;
  }, [positionedModules, nodePositions]);

  // Determine which connections to highlight
  const highlightedConnections = useMemo(() => {
    if (!hoveredModule) return new Set<string>();
    const module = systemModules.find(m => m.id === hoveredModule);
    if (!module) return new Set<string>();

    const keys = new Set<string>();
    module.connections.forEach(connId => {
      keys.add([hoveredModule, connId].sort().join('-'));
    });
    return keys;
  }, [hoveredModule, systemModules]);

  // Show empty state if no groups
  if (!groups || groups.length === 0) {
    return (
      <div className="relative w-full h-full min-h-[600px] flex items-center justify-center bg-gray-950 rounded-2xl">
        <div className="text-center">
          <p className="text-gray-400 text-lg mb-2">No context groups found</p>
          <p className="text-gray-500 text-sm">
            Create context groups with assigned layer types to see them here
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      className="relative w-full h-full min-h-[600px] overflow-hidden rounded-2xl"
      style={{
        background:
          'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.98) 100%)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Grid lines for structure */}
      <div className="absolute inset-0 pointer-events-none">
        {(Object.keys(LAYER_CONFIG) as ModuleLayer[]).map(layer => (
          <motion.div
            key={layer}
            className="absolute left-0 right-0 h-px"
            style={{
              top: `${LAYER_CONFIG[layer].rowY}%`,
              background: `linear-gradient(90deg, transparent 0%, ${LAYER_CONFIG[layer].color}20 20%, ${LAYER_CONFIG[layer].color}20 80%, transparent 100%)`,
            }}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          />
        ))}
      </div>

      {/* Layer labels */}
      {(Object.keys(LAYER_CONFIG) as ModuleLayer[]).map(layer => (
        <LayerLabel key={layer} layer={layer} config={LAYER_CONFIG[layer]} />
      ))}

      {/* SVG for connections - using actual node positions */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
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
              uniqueId={connKey}
            />
          );
        })}
      </svg>

      {/* Module nodes */}
      <div className="absolute inset-0" style={{ zIndex: 2 }}>
        {positionedModules.map(({ module, position }, index) => (
          <ModuleNode
            key={module.id}
            module={module}
            position={position}
            onSelect={onModuleSelect}
            isHovered={hoveredModule === module.id}
            isSelected={selectedModuleId === module.id}
            onHover={handleModuleHover}
            index={index}
            onPositionChange={handleNodePositionChange}
            connectionCount={module.connections.length}
          />
        ))}
      </div>
    </motion.div>
  );
}

// Re-export types for consumers
export type { SystemMapProps, SystemModule, ModuleLayer } from './types';
