/**
 * SystemMap Component - Level 1
 * Structured 4-row layout visualization of context groups
 * Rows: Pages → Client → Server → External
 * Dynamic spacing based on node count per layer
 * Now connected to real context groups from the database
 */

'use client';

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { ModuleLayer } from '../lib/types';
import type { ContextGroup } from '@/stores/contextStore';
import type { ContextGroupRelationship } from '@/lib/queries/contextQueries';

// Extended module type for internal use
interface SystemModule {
  id: string;
  name: string;
  description: string;
  layer: ModuleLayer;
  icon: string;
  color: string;
  connections: string[];
}

interface SystemMapProps {
  onModuleSelect: (moduleId: string) => void;
  groups: ContextGroup[];
  relationships: ContextGroupRelationship[];
}

// Helper to get Lucide icon component by name
function getLucideIcon(iconName: string | null | undefined): React.ElementType {
  if (!iconName) return Code;
  
  // Convert icon name to PascalCase for Lucide icons
  const pascalCase = iconName
    .split(/[-_\s]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
  
  const IconComponent = (LucideIcons as unknown as Record<string, React.ElementType>)[pascalCase];
  return IconComponent || Code;
}

// Convert context groups to system modules
function contextGroupsToModules(
  groups: ContextGroup[],
  relationships: ContextGroupRelationship[]
): SystemModule[] {
  // Build a map of connections from relationships
  const connectionMap = new Map<string, string[]>();
  
  relationships.forEach(rel => {
    // Add bidirectional connections
    if (!connectionMap.has(rel.sourceGroupId)) {
      connectionMap.set(rel.sourceGroupId, []);
    }
    if (!connectionMap.has(rel.targetGroupId)) {
      connectionMap.set(rel.targetGroupId, []);
    }
    connectionMap.get(rel.sourceGroupId)!.push(rel.targetGroupId);
    connectionMap.get(rel.targetGroupId)!.push(rel.sourceGroupId);
  });

  return groups.map(group => {
    // Determine the layer type, default to 'client' if not set
    const layer: ModuleLayer = group.type || 'client';
    
    return {
      id: group.id,
      name: group.name,
      description: `Context group: ${group.name}`,
      layer,
      icon: group.icon || 'code',
      color: group.color,
      connections: connectionMap.get(group.id) || [],
    };
  });
}

// Layer configuration with row positions (percentage from top - evenly distributed)
const LAYER_CONFIG: Record<ModuleLayer, { 
  label: string; 
  color: string;
  gradient: string; 
  rowY: number; // percentage from top
}> = {
  pages: {
    label: 'Pages',
    color: '#f472b6',
    gradient: 'from-pink-500/20 via-pink-500/5 to-transparent',
    rowY: 15,
  },
  client: {
    label: 'Client',
    color: '#06b6d4',
    gradient: 'from-cyan-500/20 via-cyan-500/5 to-transparent',
    rowY: 38,
  },
  server: {
    label: 'Server', 
    color: '#f59e0b',
    gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
    rowY: 61,
  },
  external: {
    label: 'External',
    color: '#8b5cf6',
    gradient: 'from-violet-500/20 via-violet-500/5 to-transparent',
    rowY: 84,
  },
};

// Group modules by layer
function groupModulesByLayer(modules: SystemModule[]) {
  const groups: Record<ModuleLayer, SystemModule[]> = {
    pages: [],
    client: [],
    server: [],
    external: [],
  };
  
  modules.forEach(m => {
    if (groups[m.layer]) {
      groups[m.layer].push(m);
    }
  });
  
  return groups;
}

// Calculate x positions for modules in a row - centered and spreading outward
function calculateRowPositions(modules: SystemModule[], layerConfig: typeof LAYER_CONFIG[ModuleLayer]) {
  const count = modules.length;
  if (count === 0) return [];
  
  const centerX = 55; // Center point (offset slightly for labels)
  
  if (count === 1) {
    // Single node centered
    return [{
      ...modules[0],
      calculatedPosition: { x: centerX, y: layerConfig.rowY }
    }];
  }
  
  // Calculate spacing - more nodes = tighter spacing
  const maxSpread = 60; // Maximum spread from center to edge
  const nodeSpacing = Math.min(18, maxSpread / (count - 1)); // Max 18% between nodes
  const totalWidth = nodeSpacing * (count - 1);
  const startX = centerX - totalWidth / 2;
  
  return modules.map((module, index) => ({
    ...module,
    calculatedPosition: {
      x: startX + (nodeSpacing * index),
      y: layerConfig.rowY,
    }
  }));
}

// Connection line component - uses actual pixel positions from node refs
function ConnectionLine({ 
  fromPos, 
  toPos, 
  isHighlighted,
  uniqueId,
}: { 
  fromPos: { x: number; y: number }; 
  toPos: { x: number; y: number }; 
  isHighlighted: boolean;
  uniqueId: string;
}) {
  // Calculate control points for smooth curved bezier path
  const midY = (fromPos.y + toPos.y) / 2;
  const pathD = `M ${fromPos.x} ${fromPos.y} C ${fromPos.x} ${midY}, ${toPos.x} ${midY}, ${toPos.x} ${toPos.y}`;
  
  return (
    <g>
      <defs>
        <linearGradient id={`gradient-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(6, 182, 212, 0.3)" />
          <stop offset="50%" stopColor="rgba(139, 92, 246, 0.5)" />
          <stop offset="100%" stopColor="rgba(6, 182, 212, 0.3)" />
        </linearGradient>
      </defs>
      
      {/* Base connection line - thin and elegant */}
      <motion.path
        d={pathD}
        stroke={isHighlighted ? 'rgba(139, 92, 246, 0.7)' : `url(#gradient-${uniqueId})`}
        strokeWidth={isHighlighted ? 1.5 : 1}
        fill="none"
        strokeDasharray={isHighlighted ? 'none' : '4 4'}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ 
          pathLength: 1, 
          opacity: isHighlighted ? 0.9 : 0.6,
        }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      />
      
      {/* Animated pulse on highlighted connections */}
      {isHighlighted && (
        <motion.circle
          r="3"
          fill="rgba(6, 182, 212, 0.8)"
          filter="url(#glow)"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path={pathD}
          />
        </motion.circle>
      )}
    </g>
  );
}

// Module node component with ref callback for position tracking
function ModuleNode({
  module,
  position,
  onSelect,
  isHovered,
  onHover,
  index,
  onPositionChange,
}: {
  module: SystemModule;
  position: { x: number; y: number };
  onSelect: (id: string) => void;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  index: number;
  onPositionChange: (id: string, el: HTMLDivElement | null) => void;
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const IconComponent = getLucideIcon(module.icon);

  useEffect(() => {
    onPositionChange(module.id, nodeRef.current);
  }, [module.id, onPositionChange]);

  return (
    <motion.div
      ref={nodeRef}
      className="absolute cursor-pointer"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: isHovered ? 1.1 : 1, 
        opacity: 1,
      }}
      transition={{ 
        type: 'spring', 
        stiffness: 300, 
        damping: 25,
        delay: index * 0.05,
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => onHover(module.id)}
      onHoverEnd={() => onHover(null)}
      onClick={() => onSelect(module.id)}
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `radial-gradient(circle, ${module.color}40 0%, transparent 70%)`,
          transform: 'scale(2)',
        }}
        animate={{
          opacity: isHovered ? 0.8 : 0.3,
          scale: isHovered ? 2.5 : 2,
        }}
        transition={{ duration: 0.25 }}
      />
      
      {/* Main node card */}
      <motion.div
        className="relative flex flex-col items-center justify-center w-24 h-20 rounded-2xl backdrop-blur-md border"
        style={{
          background: `linear-gradient(135deg, ${module.color}25 0%, ${module.color}08 100%)`,
          borderColor: isHovered ? `${module.color}80` : `${module.color}40`,
          boxShadow: isHovered 
            ? `0 0 30px ${module.color}50, inset 0 0 20px ${module.color}15`
            : `0 0 15px ${module.color}20`,
        }}
        animate={{
          borderColor: isHovered ? `${module.color}80` : `${module.color}40`,
        }}
        transition={{ duration: 0.2 }}
      >
        <IconComponent 
          className="w-6 h-6 mb-1" 
          style={{ color: isHovered ? module.color : `${module.color}cc` }}
        />
        <span 
          className="text-[10px] font-medium text-center leading-tight px-2"
          style={{ color: isHovered ? module.color : `${module.color}cc` }}
        >
          {module.name}
        </span>
      </motion.div>

    </motion.div>
  );
}

// Layer row label component
function LayerLabel({ layer, config }: { layer: ModuleLayer; config: typeof LAYER_CONFIG[ModuleLayer] }) {
  return (
    <motion.div
      className="absolute left-3 flex items-center gap-2"
      style={{ top: `${config.rowY}%`, transform: 'translateY(-50%)' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div 
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: config.color, boxShadow: `0 0 8px ${config.color}80` }}
      />
      <span 
        className="text-xs font-mono tracking-wider uppercase"
        style={{ color: `${config.color}aa` }}
      >
        {config.label}
      </span>
    </motion.div>
  );
}

export default function SystemMap({ onModuleSelect, groups, relationships }: SystemMapProps) {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Convert context groups to system modules
  const systemModules = useMemo(() => 
    contextGroupsToModules(groups, relationships),
    [groups, relationships]
  );

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

  // Group modules by layer and calculate positions
  const { positionedModules } = useMemo(() => {
    const groupsByLayer = groupModulesByLayer(systemModules);
    const positioned: { module: SystemModule; position: { x: number; y: number } }[] = [];
    
    (Object.keys(LAYER_CONFIG) as ModuleLayer[]).forEach(layer => {
      const layerModules = groupsByLayer[layer];
      const withPositions = calculateRowPositions(layerModules, LAYER_CONFIG[layer]);
      withPositions.forEach(m => {
        positioned.push({ module: m, position: m.calculatedPosition });
      });
    });
    
    return { modulesByLayer: groupsByLayer, positionedModules: positioned };
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
      module.connections.forEach((connId) => {
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
          <p className="text-gray-500 text-sm">Create context groups with assigned layer types to see them here</p>
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
      {/* Grid lines for structure */}
      <div className="absolute inset-0 pointer-events-none">
        {(Object.keys(LAYER_CONFIG) as ModuleLayer[]).map((layer) => (
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
      {(Object.keys(LAYER_CONFIG) as ModuleLayer[]).map((layer) => (
        <LayerLabel key={layer} layer={layer} config={LAYER_CONFIG[layer]} />
      ))}

      {/* SVG for connections - using actual node positions */}
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none" 
        style={{ zIndex: 1 }}
      >
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {connections.map((conn) => {
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
            onHover={setHoveredModule}
            index={index}
            onPositionChange={handleNodePositionChange}
          />
        ))}
      </div>
    </motion.div>
  );
}
