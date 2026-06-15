/**
 * Types for SystemMap components
 */

import type { ContextGroup } from '@/stores/contextStore';
import type { ContextGroupRelationship } from '@/lib/queries/contextQueries';

// Module layer types
export type ModuleLayer = 'pages' | 'client' | 'server' | 'external';

// Cluster position for dynamic grid layout
export interface ClusterPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Extended module type for internal use
export interface SystemModule {
  id: string;
  name: string;
  description: string;
  layer: ModuleLayer;
  icon: string;
  color: string;
  connections: string[];
  count?: number;
}

export interface SystemMapProps {
  onModuleSelect: (moduleId: string) => void;
  groups: ContextGroup[];
  relationships: ContextGroupRelationship[];
  moduleCountData?: Record<string, number>;
  selectedModuleId?: string | null;
  onModuleHover?: (moduleId: string | null) => void;
}

// Layer configuration with row positions
export interface LayerConfig {
  label: string;
  color: string;
  gradient: string;
  /** Tailwind text-color class matching `color` (single source for layer identity). */
  textClass: string;
  /** Tailwind background-color class matching `color` (subtle fill at /20 alpha). */
  bgClass: string;
  rowY: number;
}

export const LAYER_CONFIG: Record<ModuleLayer, LayerConfig> = {
  pages: {
    label: 'Pages',
    color: '#f472b6',
    gradient: 'from-pink-500/20 via-pink-500/5 to-transparent',
    textClass: 'text-pink-400',
    bgClass: 'bg-pink-500/20',
    rowY: 15,
  },
  client: {
    label: 'Client',
    color: '#06b6d4',
    gradient: 'from-cyan-500/20 via-cyan-500/5 to-transparent',
    textClass: 'text-cyan-400',
    bgClass: 'bg-cyan-500/20',
    rowY: 38,
  },
  server: {
    label: 'Server',
    color: '#f59e0b',
    gradient: 'from-amber-500/20 via-amber-500/5 to-transparent',
    textClass: 'text-amber-400',
    bgClass: 'bg-amber-500/20',
    rowY: 61,
  },
  external: {
    label: 'External',
    color: '#8b5cf6',
    gradient: 'from-violet-500/20 via-violet-500/5 to-transparent',
    textClass: 'text-violet-400',
    bgClass: 'bg-violet-500/20',
    rowY: 84,
  },
};

/**
 * Canonical accessor for a layer's Tailwind style classes. Use this instead of
 * re-hardcoding per-layer color maps so "amber = server" reads the same across
 * SystemMap, X-Ray, and ContextDocumentation.
 */
export function getLayerStyle(layer: ModuleLayer): { textClass: string; bgClass: string } {
  const config = LAYER_CONFIG[layer];
  return { textClass: config.textClass, bgClass: config.bgClass };
}
