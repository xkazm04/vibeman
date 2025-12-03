/**
 * Types for SystemMap components
 */

import type { ContextGroup } from '@/stores/contextStore';
import type { ContextGroupRelationship } from '@/lib/queries/contextQueries';

// Module layer types
export type ModuleLayer = 'pages' | 'client' | 'server' | 'external';

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
  rowY: number;
}

export const LAYER_CONFIG: Record<ModuleLayer, LayerConfig> = {
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
