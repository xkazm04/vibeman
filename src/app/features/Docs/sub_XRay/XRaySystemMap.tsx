/**
 * XRaySystemMap Component
 * Enhanced SystemMap with real-time traffic visualization
 * Shows pulsing connections, hot paths, and latency indicators
 */

'use client';

import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, Activity, AlertTriangle, Zap } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { ModuleLayer } from '../sub_DocsAnalysis/lib/types';
import type { ContextGroup } from '@/stores/contextStore';
import type { ContextGroupRelationship } from '@/lib/queries/contextQueries';
import { useXRayStore, useXRayEdges, useXRayLayers, useXRayAnimations } from '@/stores/xrayStore';
import { createEdgeId } from '../sub_DocsAnalysis/lib/xrayTypes';

// Extended module type for internal use
interface SystemModule {
  id: string;
  name: string;
  description: string;
  layer: ModuleLayer;
  icon: string;
  color: string;
  connections: string[];
  count?: number;
}

interface XRaySystemMapProps {
  onModuleSelect: (moduleId: string) => void;
  groups: ContextGroup[];
  relationships: ContextGroupRelationship[];
  moduleCountData?: Record<string, number>;
  selectedModuleId?: string | null;
  onModuleHover?: (moduleId: string | null) => void;
}

// Helper to get Lucide icon component by name
function getLucideIcon(iconName: string | null | undefined): React.ElementType {
  if (!iconName) return Code;

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
  const connectionMap = new Map<string, string[]>();

  relationships.forEach(rel => {
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

// Layer configuration with X-Ray colors
const LAYER_CONFIG: Record<ModuleLayer, {
  label: string;
  color: string;
  xrayColor: string;
  gradient: string;
  rowY: number;
}> = {
  pages: {
    label: 'Pages',
    color: '#f472b6',
    xrayColor: '#ec4899',
    gradient: 'from-pink-500/20 via-pink-500/5 to-transparent',
    rowY: 15,
  },
  client: {
    label: 'Client',
    color: '#06b6d4',
    xrayColor: '#22d3ee',
    gradient: 'from-cyan-500/20 via-cyan-500/5 to-transparent',
    rowY: 38,
  },
  server: {
    label: 'Server',
    color: '#f59e0b',
    xrayColor: '#fbbf24',
    gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
    rowY: 61,
  },
  external: {
    label: 'External',
    color: '#8b5cf6',
    xrayColor: '#a78bfa',
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

// Calculate x positions for modules in a row
function calculateRowPositions(modules: SystemModule[], layerConfig: typeof LAYER_CONFIG[ModuleLayer]) {
  const count = modules.length;
  if (count === 0) return [];

  const centerX = 55;

  if (count === 1) {
    return [{
      ...modules[0],
      calculatedPosition: { x: centerX, y: layerConfig.rowY }
    }];
  }

  const maxSpread = 60;
  const nodeSpacing = Math.min(18, maxSpread / (count - 1));
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

// X-Ray enhanced connection line
function XRayConnectionLine({
  fromPos,
  toPos,
  isHighlighted,
  uniqueId,
  trafficIntensity,
  avgLatency,
  hasErrors,
}: {
  fromPos: { x: number; y: number };
  toPos: { x: number; y: number };
  isHighlighted: boolean;
  uniqueId: string;
  trafficIntensity: number; // 0-1
  avgLatency: number;
  hasErrors: boolean;
}) {
  const midY = (fromPos.y + toPos.y) / 2;
  const pathD = `M ${fromPos.x} ${fromPos.y} C ${fromPos.x} ${midY}, ${toPos.x} ${midY}, ${toPos.x} ${toPos.y}`;

  // Determine color based on traffic state
  const getStrokeColor = () => {
    if (hasErrors) return 'rgba(239, 68, 68, 0.8)'; // Red for errors
    if (avgLatency > 500) return 'rgba(251, 191, 36, 0.8)'; // Yellow for slow
    if (trafficIntensity > 0.7) return 'rgba(34, 211, 238, 1)'; // Cyan for hot
    if (trafficIntensity > 0.3) return 'rgba(34, 211, 238, 0.7)';
    return 'rgba(34, 211, 238, 0.4)';
  };

  const strokeWidth = 1 + trafficIntensity * 2;
  const particleCount = Math.ceil(trafficIntensity * 5);

  return (
    <g>
      <defs>
        <linearGradient id={`xray-gradient-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={getStrokeColor()} />
          <stop offset="50%" stopColor={hasErrors ? 'rgba(239, 68, 68, 0.5)' : 'rgba(139, 92, 246, 0.5)'} />
          <stop offset="100%" stopColor={getStrokeColor()} />
        </linearGradient>
        <filter id={`xray-glow-${uniqueId}`}>
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Base connection line with traffic-based styling */}
      <motion.path
        d={pathD}
        stroke={getStrokeColor()}
        strokeWidth={strokeWidth}
        fill="none"
        filter={trafficIntensity > 0.5 ? `url(#xray-glow-${uniqueId})` : undefined}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{
          pathLength: 1,
          opacity: trafficIntensity > 0 ? 0.9 : 0.3,
          strokeWidth: [strokeWidth, strokeWidth * 1.2, strokeWidth],
        }}
        transition={{
          pathLength: { duration: 1.2, ease: 'easeInOut' },
          strokeWidth: trafficIntensity > 0.5 ? { duration: 0.5, repeat: Infinity } : undefined,
        }}
      />

      {/* Traffic particles flowing along the path */}
      {trafficIntensity > 0 && Array.from({ length: particleCount }).map((_, i) => (
        <motion.circle
          key={`particle-${uniqueId}-${i}`}
          r={hasErrors ? 4 : 3}
          fill={hasErrors ? 'rgba(239, 68, 68, 0.9)' : 'rgba(34, 211, 238, 0.9)'}
          filter={`url(#xray-glow-${uniqueId})`}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 1.5 - (trafficIntensity * 0.5),
            repeat: Infinity,
            delay: i * (1 / particleCount),
            ease: 'linear',
          }}
        >
          <animateMotion
            dur={`${1.5 - (trafficIntensity * 0.5)}s`}
            repeatCount="indefinite"
            path={pathD}
            begin={`${i * (1 / particleCount)}s`}
          />
        </motion.circle>
      ))}

      {/* Latency indicator at midpoint */}
      {isHighlighted && avgLatency > 0 && (
        <g transform={`translate(${(fromPos.x + toPos.x) / 2}, ${midY})`}>
          <rect
            x="-20"
            y="-10"
            width="40"
            height="20"
            rx="4"
            fill="rgba(0, 0, 0, 0.8)"
            stroke={avgLatency > 500 ? 'rgba(251, 191, 36, 0.6)' : 'rgba(34, 211, 238, 0.6)'}
          />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fill={avgLatency > 500 ? '#fbbf24' : '#22d3ee'}
            fontFamily="monospace"
          >
            {avgLatency < 1000 ? `${Math.round(avgLatency)}ms` : `${(avgLatency / 1000).toFixed(1)}s`}
          </text>
        </g>
      )}
    </g>
  );
}

// X-Ray enhanced module node
function XRayModuleNode({
  module,
  position,
  onSelect,
  isHovered,
  isSelected,
  onHover,
  index,
  onPositionChange,
  connectionCount,
  layerStats,
}: {
  module: SystemModule;
  position: { x: number; y: number };
  onSelect: (id: string) => void;
  isHovered: boolean;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  index: number;
  onPositionChange: (id: string, el: HTMLDivElement | null) => void;
  connectionCount: number;
  layerStats?: { totalRequests: number; avgLatency: number; errorRate: number };
}) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const IconComponent = getLucideIcon(module.icon);
  const isActive = isHovered || isSelected;
  const hasTraffic = layerStats && layerStats.totalRequests > 0;
  const hasErrors = layerStats && layerStats.errorRate > 0;
  const isHot = layerStats && layerStats.totalRequests > 10;

  useEffect(() => {
    onPositionChange(module.id, nodeRef.current);
  }, [module.id, onPositionChange]);

  const xrayColor = LAYER_CONFIG[module.layer].xrayColor;

  return (
    <motion.div
      ref={nodeRef}
      className="absolute cursor-pointer group"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: isActive ? 1.1 : 1,
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
      data-testid={`xray-map-node-${module.id}`}
    >
      {/* X-Ray glow effect based on traffic */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `radial-gradient(circle, ${hasErrors ? '#ef444480' : xrayColor + '60'} 0%, transparent 70%)`,
          transform: 'scale(2)',
        }}
        animate={{
          opacity: hasTraffic ? [0.5, 0.8, 0.5] : 0.3,
          scale: hasTraffic ? [2, 2.5, 2] : 2,
        }}
        transition={hasTraffic ? { duration: 1, repeat: Infinity } : {}}
      />

      {/* Scanning ring animation for hot nodes */}
      {isHot && (
        <motion.div
          className="absolute inset-0 rounded-2xl border-2"
          style={{ borderColor: xrayColor }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.8, 0, 0.8],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      )}

      {/* Main node card */}
      <motion.div
        className={`relative flex flex-col items-center justify-center w-24 h-20 rounded-2xl backdrop-blur-md border ${
          isSelected ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-cyan-500' : ''
        }`}
        style={{
          background: `linear-gradient(135deg, ${module.color}25 0%, ${module.color}08 100%)`,
          borderColor: hasTraffic ? xrayColor : `${module.color}40`,
          boxShadow: hasTraffic
            ? `0 0 30px ${xrayColor}50, inset 0 0 20px ${xrayColor}15`
            : `0 0 15px ${module.color}20`,
        }}
      >
        <IconComponent
          className="w-6 h-6 mb-1"
          style={{ color: hasTraffic ? xrayColor : `${module.color}cc` }}
        />
        <span
          className="text-[10px] font-medium text-center leading-tight px-2"
          style={{ color: hasTraffic ? xrayColor : `${module.color}cc` }}
        >
          {module.name}
        </span>

        {/* Live traffic badge */}
        {hasTraffic && (
          <motion.div
            className="absolute -top-2 -right-2 min-w-[24px] h-[24px]
              rounded-full text-white text-[9px] font-bold
              flex items-center justify-center px-1
              border-2 border-gray-900 shadow-lg"
            style={{
              backgroundColor: hasErrors ? '#ef4444' : isHot ? '#22d3ee' : '#06b6d4',
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            data-testid={`xray-traffic-badge-${module.id}`}
          >
            {hasErrors ? (
              <AlertTriangle className="w-3 h-3" />
            ) : isHot ? (
              <Zap className="w-3 h-3" />
            ) : (
              <Activity className="w-3 h-3" />
            )}
          </motion.div>
        )}

        {/* Stats tooltip on hover */}
        {isActive && layerStats && hasTraffic && (
          <motion.div
            className="absolute -bottom-12 left-1/2 -translate-x-1/2
              bg-gray-900/95 border border-gray-700 rounded-lg px-2 py-1
              text-[9px] font-mono text-gray-300 whitespace-nowrap z-10"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2">
              <span>{layerStats.totalRequests} req</span>
              <span className={layerStats.avgLatency > 500 ? 'text-amber-400' : 'text-cyan-400'}>
                {Math.round(layerStats.avgLatency)}ms
              </span>
              {layerStats.errorRate > 0 && (
                <span className="text-red-400">
                  {(layerStats.errorRate * 100).toFixed(0)}% err
                </span>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

// Layer row label with X-Ray stats
function XRayLayerLabel({
  layer,
  config,
  stats,
}: {
  layer: ModuleLayer;
  config: typeof LAYER_CONFIG[ModuleLayer];
  stats?: { totalRequests: number; avgLatency: number; errorRate: number };
}) {
  return (
    <motion.div
      className="absolute left-3 flex items-center gap-2"
      style={{ top: `${config.rowY}%`, transform: 'translateY(-50%)' }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div
        className="w-2 h-2 rounded-full relative"
        style={{ backgroundColor: config.xrayColor, boxShadow: `0 0 8px ${config.xrayColor}80` }}
      >
        {stats && stats.totalRequests > 0 && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ backgroundColor: config.xrayColor }}
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
      <span
        className="text-xs font-mono tracking-wider uppercase"
        style={{ color: `${config.xrayColor}aa` }}
      >
        {config.label}
      </span>
      {stats && stats.totalRequests > 0 && (
        <span className="text-[10px] font-mono text-gray-500">
          ({stats.totalRequests})
        </span>
      )}
    </motion.div>
  );
}

export default function XRaySystemMap({
  onModuleSelect,
  groups,
  relationships,
  moduleCountData,
  selectedModuleId,
  onModuleHover
}: XRaySystemMapProps) {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // X-Ray data from store
  const edges = useXRayEdges();
  const layers = useXRayLayers();
  const animations = useXRayAnimations();

  const handleModuleHover = useCallback((moduleId: string | null) => {
    setHoveredModule(moduleId);
    if (moduleId && onModuleHover) {
      onModuleHover(moduleId);
    }
  }, [onModuleHover]);

  // Convert context groups to system modules
  const systemModules = useMemo(() => {
    const modules = contextGroupsToModules(groups, relationships);
    if (moduleCountData) {
      return modules.map(m => ({
        ...m,
        count: moduleCountData[m.id] ?? 0
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
      newPositions.set(id, {
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top + rect.height / 2,
      });
    });

    setNodePositions(newPositions);
  }, []);

  useEffect(() => {
    const timer = setTimeout(updateNodePositions, 100);
    window.addEventListener('resize', updateNodePositions);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateNodePositions);
    };
  }, [updateNodePositions, updateTrigger]);

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

  // Generate connections with X-Ray data
  const connections = useMemo(() => {
    const conns: {
      fromPos: { x: number; y: number };
      toPos: { x: number; y: number };
      fromId: string;
      toId: string;
      fromLayer: ModuleLayer;
      toLayer: ModuleLayer;
    }[] = [];
    const processed = new Set<string>();

    positionedModules.forEach(({ module }) => {
      module.connections.forEach((connId) => {
        const connKey = [module.id, connId].sort().join('-');
        if (!processed.has(connKey)) {
          const fromPos = nodePositions.get(module.id);
          const toPos = nodePositions.get(connId);
          const targetModule = systemModules.find(m => m.id === connId);
          if (fromPos && toPos && targetModule) {
            conns.push({
              fromPos,
              toPos,
              fromId: module.id,
              toId: connId,
              fromLayer: module.layer,
              toLayer: targetModule.layer,
            });
            processed.add(connKey);
          }
        }
      });
    });

    return conns;
  }, [positionedModules, nodePositions, systemModules]);

  // Get X-Ray stats for each connection
  const getConnectionXRayData = useCallback((fromLayer: ModuleLayer, toLayer: ModuleLayer) => {
    const edgeId = createEdgeId(fromLayer, toLayer);
    const edgeData = edges[edgeId];
    const animation = animations[edgeId];

    return {
      trafficIntensity: animation?.pulseIntensity || 0,
      avgLatency: edgeData?.avgLatency || 0,
      hasErrors: (edgeData?.errorCount || 0) > 0,
    };
  }, [edges, animations]);

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
        background: 'linear-gradient(180deg, rgba(5, 15, 35, 0.98) 0%, rgba(0, 5, 15, 0.99) 100%)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Scanning grid effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(34, 211, 238, 0.03) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(34, 211, 238, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
        {/* Horizontal scan line */}
        <motion.div
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
          animate={{
            top: ['0%', '100%'],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      {/* Grid lines for structure */}
      <div className="absolute inset-0 pointer-events-none">
        {(Object.keys(LAYER_CONFIG) as ModuleLayer[]).map((layer) => (
          <motion.div
            key={layer}
            className="absolute left-0 right-0 h-px"
            style={{
              top: `${LAYER_CONFIG[layer].rowY}%`,
              background: `linear-gradient(90deg, transparent 0%, ${LAYER_CONFIG[layer].xrayColor}30 20%, ${LAYER_CONFIG[layer].xrayColor}30 80%, transparent 100%)`,
            }}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          />
        ))}
      </div>

      {/* Layer labels with X-Ray stats */}
      {(Object.keys(LAYER_CONFIG) as ModuleLayer[]).map((layer) => (
        <XRayLayerLabel
          key={layer}
          layer={layer}
          config={LAYER_CONFIG[layer]}
          stats={layers[layer]}
        />
      ))}

      {/* SVG for X-Ray connections */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 1 }}
      >
        <defs>
          <filter id="xray-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {connections.map((conn) => {
          const connKey = [conn.fromId, conn.toId].sort().join('-');
          const xrayData = getConnectionXRayData(conn.fromLayer, conn.toLayer);
          return (
            <XRayConnectionLine
              key={connKey}
              fromPos={conn.fromPos}
              toPos={conn.toPos}
              isHighlighted={hoveredModule === conn.fromId || hoveredModule === conn.toId}
              uniqueId={connKey}
              trafficIntensity={xrayData.trafficIntensity}
              avgLatency={xrayData.avgLatency}
              hasErrors={xrayData.hasErrors}
            />
          );
        })}
      </svg>

      {/* Module nodes with X-Ray enhancements */}
      <div className="absolute inset-0" style={{ zIndex: 2 }}>
        {positionedModules.map(({ module, position }, index) => (
          <XRayModuleNode
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
            layerStats={layers[module.layer]}
          />
        ))}
      </div>

      {/* X-Ray legend */}
      <div className="absolute bottom-4 right-4 bg-gray-900/90 border border-gray-700/50 rounded-lg px-3 py-2 text-[10px] font-mono">
        <div className="text-gray-400 mb-1">X-Ray Legend</div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-cyan-400" />
            <span className="text-cyan-400">Active Traffic</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-amber-400" />
            <span className="text-amber-400">High Latency</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-red-400" />
            <span className="text-red-400">Errors</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
