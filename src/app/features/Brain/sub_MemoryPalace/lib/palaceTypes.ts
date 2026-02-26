/**
 * Memory Palace Types
 * Spatial-temporal navigation types for the living memory palace.
 */

import type { SignalType } from '../../sub_MemoryCanvas/lib/types';

/** A "room" in the palace — one per context */
export interface PalaceRoom {
  id: string;
  name: string;
  /** Center position in palace space */
  x: number;
  y: number;
  /** Radius driven by signal count */
  radius: number;
  /** Health score 0-1: activity recency + success rate */
  health: number;
  /** Dominant signal type determines room accent */
  dominantType: SignalType;
  /** Total signal count (used for sizing) */
  signalCount: number;
  /** Most recent signal timestamp */
  lastActivity: number;
  /** Oldest signal timestamp */
  firstActivity: number;
  /** Success rate from implementations */
  successRate: number;
}

/** A connection between two rooms (shared signals, insight chains) */
export interface PalaceConnection {
  sourceId: string;
  targetId: string;
  /** Strength 0-1 based on shared signal density */
  strength: number;
  /** What created this connection */
  reason: 'shared_type' | 'insight_chain' | 'temporal_proximity';
}

/** A signal event positioned within a room */
export interface PalaceSignal {
  id: string;
  roomId: string;
  type: SignalType;
  timestamp: number;
  weight: number;
  summary: string;
}

/** Insight that crystallized from signals */
export interface PalaceInsight {
  id: string;
  roomId: string | null;
  content: string;
  timestamp: number;
  effectiveness: number;
}

/** A reflection cycle event for replay */
export interface PalaceReflection {
  id: string;
  timestamp: number;
  scope: 'project' | 'global';
  insightCount: number;
  signalsBefore: number;
}

/** Temporal snapshot at a point in time */
export interface TemporalSnapshot {
  timestamp: number;
  rooms: PalaceRoom[];
  connections: PalaceConnection[];
  activeSignalCount: number;
}

/** Replay keyframe for animation */
export interface ReplayKeyframe {
  timestamp: number;
  label: string;
  type: 'signal_burst' | 'reflection_start' | 'insight_crystallize' | 'decay_wave';
}

/** Palace view mode */
export type PalaceMode = 'explore' | 'timeline' | 'replay';
