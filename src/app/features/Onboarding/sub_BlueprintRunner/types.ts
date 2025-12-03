/**
 * Blueprint Runner Types
 * Shared types for all blueprint visualization concepts
 */

export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'waiting';
export type BlueprintNodeType = 'analyzer' | 'processor' | 'executor' | 'tester' | 'decision';

export interface BlueprintNode {
  id: string;
  type: BlueprintNodeType;
  name: string;
  description: string;
  icon: string;
  color: string;
  status: NodeStatus;
  progress: number; // 0-100
  duration?: number; // Simulated duration in ms
}

export interface BlueprintEdge {
  id: string;
  source: string;
  target: string;
}

export interface BlueprintRunnerProps {
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
  isRunning: boolean;
  currentNodeId: string | null;
  onStart: () => void;
  onCancel: () => void;
}

// Timeline node instance - represents a node execution in the scrolling timeline
export interface TimelineNodeInstance {
  instanceId: string; // Unique ID for this instance (e.g., node-1-cycle-3)
  nodeId: string; // Reference to the base node
  cycleNumber: number;
  type: BlueprintNodeType;
  name: string;
  icon: string;
  status: NodeStatus;
  progress: number;
  timestamp: number; // When this instance was created
  position: number; // X position on timeline (0-100, where 100 is rightmost)
}

// Visual concept type
export type VisualizationConcept = 'horizontal' | 'circuit' | 'radial';
