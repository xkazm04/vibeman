/**
 * Dummy Data for Blueprint Runner Prototypes
 * 5 nodes: 4 processing nodes + 1 decision node for cycle confirmation
 */

import { BlueprintNode, BlueprintEdge } from './types';

// Base nodes for the pipeline (without decision node for timeline concept)
export const BASE_PIPELINE_NODES: BlueprintNode[] = [
  {
    id: 'node-1',
    type: 'analyzer',
    name: 'Code Scanner',
    description: 'Analyze codebase for issues',
    icon: 'Search',
    color: '#06b6d4', // Cyan
    status: 'pending',
    progress: 0,
    duration: 2500, // 2.5 seconds
  },
  {
    id: 'node-2',
    type: 'processor',
    name: 'Issue Filter',
    description: 'Filter and prioritize findings',
    icon: 'Filter',
    color: '#8b5cf6', // Violet
    status: 'pending',
    progress: 0,
    duration: 1800, // 1.8 seconds
  },
  {
    id: 'node-3',
    type: 'executor',
    name: 'Claude Runner',
    description: 'Execute fixes via Claude Code',
    icon: 'Zap',
    color: '#f59e0b', // Amber
    status: 'pending',
    progress: 0,
    duration: 3200, // 3.2 seconds
  },
  {
    id: 'node-4',
    type: 'tester',
    name: 'Build Verify',
    description: 'Verify build passes',
    icon: 'CheckCircle',
    color: '#10b981', // Emerald
    status: 'pending',
    progress: 0,
    duration: 2000, // 2 seconds
  },
];

// Decision node for cycle confirmation
export const DECISION_NODE: BlueprintNode = {
  id: 'node-decision',
  type: 'decision',
  name: 'Continue?',
  description: 'Confirm to run another cycle',
  icon: 'HelpCircle',
  color: '#ec4899', // Pink
  status: 'pending',
  progress: 0,
  duration: 0, // Waits for user input
};

// Full pipeline with decision node (for Circuit and Radial concepts)
export const DUMMY_NODES: BlueprintNode[] = [
  ...BASE_PIPELINE_NODES,
  DECISION_NODE,
];

// Legacy export for backwards compatibility
export const DUMMY_EDGES: BlueprintEdge[] = [
  { id: 'edge-1', source: 'node-1', target: 'node-2' },
  { id: 'edge-2', source: 'node-2', target: 'node-3' },
  { id: 'edge-3', source: 'node-3', target: 'node-4' },
  { id: 'edge-4', source: 'node-4', target: 'node-decision' },
  { id: 'edge-5', source: 'node-decision', target: 'node-1' }, // Cycle back
];

// Edges without decision node (for timeline that cycles infinitely)
export const PIPELINE_EDGES: BlueprintEdge[] = [
  { id: 'edge-1', source: 'node-1', target: 'node-2' },
  { id: 'edge-2', source: 'node-2', target: 'node-3' },
  { id: 'edge-3', source: 'node-3', target: 'node-4' },
  { id: 'edge-4', source: 'node-4', target: 'node-1' }, // Direct cycle back
];

// Node type colors for consistent theming
export const NODE_TYPE_COLORS: Record<string, { primary: string; secondary: string; glow: string }> = {
  analyzer: {
    primary: '#06b6d4',
    secondary: '#0891b2',
    glow: 'rgba(6, 182, 212, 0.5)',
  },
  processor: {
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    glow: 'rgba(139, 92, 246, 0.5)',
  },
  executor: {
    primary: '#f59e0b',
    secondary: '#d97706',
    glow: 'rgba(245, 158, 11, 0.5)',
  },
  tester: {
    primary: '#10b981',
    secondary: '#059669',
    glow: 'rgba(16, 185, 129, 0.5)',
  },
  decision: {
    primary: '#ec4899',
    secondary: '#db2777',
    glow: 'rgba(236, 72, 153, 0.5)',
  },
};
