// SignalType now lives in the shared Brain lib — re-export for
// backward-compat within Canvas internals.
import type { SignalType } from '../../lib/brainConstants';
export type { SignalType };

export interface BrainEvent {
  id: string;
  type: SignalType;
  context_id: string;
  context_name: string;
  timestamp: number;
  weight: number;
  summary: string;
  x: number;
  y: number;
  /** Present only for session_cluster events */
  cluster?: {
    signalCount: number;
    dominantType: SignalType;
    durationMs: number;
    intensity: number;
    childSignalIds: string[];
  };
}

export interface SpatialIndex {
  cellSize: number;
  cells: Map<string, BrainEvent[]>;
}

export interface Group {
  id: string;
  name: string;
  events: BrainEvent[];
  /** Events pre-sorted by timestamp (computed once at group formation) */
  sortedEvents: BrainEvent[];
  radius: number;
  x: number;
  y: number;
  dominantType: SignalType;
  dominantColor: string;
  spatialIndex?: SpatialIndex;
  /** Semantic sub-clusters within this group (computed by clustering worker) */
  semanticClusters?: SemanticSubCluster[];
}

export interface UndoEntry {
  event: BrainEvent;
  timeout: ReturnType<typeof setTimeout>;
  /** The group the event belonged to at time of deletion (avoids stale-closure restore). */
  groupId: string | null;
}

export interface FilterState {
  visibleTypes: Set<SignalType>;
}

export interface LabelRect {
  x: number;
  y: number;
  width: number;
  height: number;
  priority: number;
  label: string;
}

// ── Semantic Clustering Types ────────────────────────────────────

export interface SemanticSubCluster {
  id: string;
  /** Top TF-IDF terms defining this cluster's concept */
  centroidTerms: string[];
  /** Signal IDs belonging to this cluster */
  signalIds: string[];
  /** Average pairwise similarity within cluster (0-1) */
  coherence: number;
}

export interface ConvergenceEvent {
  /** Shared concept terms across contexts */
  concept: string[];
  /** Context names that converge on this concept */
  contextNames: string[];
  /** All signal IDs involved */
  signalIds: string[];
  /** Cross-context similarity strength (0-1) */
  strength: number;
}

// ── Force Layout Worker Types ────────────────────────────────────

export interface WorkerGroup {
  id: string;
  radius: number;
  x: number;
  y: number;
}

export interface ForceLayoutConfig {
  width: number;
  height: number;
  totalTicks: number;
  progressInterval: number;
}

export interface WorkerInputMessage {
  type: 'run';
  groups: WorkerGroup[];
  config: ForceLayoutConfig;
}

export interface WorkerOutputMessage {
  type: 'progress' | 'complete';
  groups: WorkerGroup[];
  tick: number;
  totalTicks: number;
}
