/**
 * Impact Visualization Local Types
 * UI state and component-specific types for impact visualization
 */

import type { ImpactNode, ImpactGraph, ImpactAnalysisResult, RiskAssessment } from '@/lib/impact';

// Re-export for convenience
export type { ImpactNode, ImpactGraph, ImpactAnalysisResult, RiskAssessment };

/**
 * View modes for impact visualization
 */
export type ImpactViewMode = 'graph' | 'list' | 'report';

/**
 * Graph interaction mode
 */
export type GraphInteractionMode = 'pan' | 'select' | 'zoom';

/**
 * Selected node state
 */
export interface SelectedNodeState {
  node: ImpactNode | null;
  showPreview: boolean;
  showDetails: boolean;
}

/**
 * Graph viewport state
 */
export interface GraphViewport {
  x: number;
  y: number;
  scale: number;
}

/**
 * Impact filter state
 */
export interface ImpactFilters {
  showDirect: boolean;
  showIndirect: boolean;
  showPotential: boolean;
  searchTerm: string;
  fileTypes: string[];
}

export const DEFAULT_IMPACT_FILTERS: ImpactFilters = {
  showDirect: true,
  showIndirect: true,
  showPotential: true,
  searchTerm: '',
  fileTypes: [],
};

/**
 * Graph simulation settings
 */
export interface SimulationSettings {
  chargeStrength: number;
  linkDistance: number;
  centerStrength: number;
  collisionRadius: number;
}

export const DEFAULT_SIMULATION_SETTINGS: SimulationSettings = {
  chargeStrength: -300,
  linkDistance: 100,
  centerStrength: 0.05,
  collisionRadius: 30,
};

/**
 * Risk level colors
 */
export const RISK_COLORS = {
  low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
} as const;

/**
 * Impact level colors
 */
export const IMPACT_COLORS = {
  direct: { fill: '#ef4444', stroke: '#b91c1c', label: 'Direct' },
  indirect: { fill: '#f59e0b', stroke: '#d97706', label: 'Indirect' },
  potential: { fill: '#6b7280', stroke: '#4b5563', label: 'Potential' },
} as const;

/**
 * Node status colors
 */
export const STATUS_COLORS = {
  unchanged: { fill: '#374151', stroke: '#4b5563' },
  modified: { fill: '#ef4444', stroke: '#b91c1c' },
  affected: { fill: '#f59e0b', stroke: '#d97706' },
  excluded: { fill: '#1f2937', stroke: '#374151', opacity: 0.5 },
} as const;
