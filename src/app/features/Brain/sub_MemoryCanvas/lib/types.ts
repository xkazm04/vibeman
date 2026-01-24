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

export interface Group {
  id: string;
  name: string;
  events: BrainEvent[];
  radius: number;
  x: number;
  y: number;
  dominantType: SignalType;
  dominantColor: string;
}

export interface UndoEntry {
  event: BrainEvent;
  timeout: ReturnType<typeof setTimeout>;
}
