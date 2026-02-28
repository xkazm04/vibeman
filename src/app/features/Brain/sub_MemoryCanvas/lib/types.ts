export type SignalType = 'git_activity' | 'api_focus' | 'context_focus' | 'implementation';

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
}

export interface UndoEntry {
  event: BrainEvent;
  timeout: ReturnType<typeof setTimeout>;
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
