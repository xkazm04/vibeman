/**
 * Monitor Types
 * Type definitions for monitoring functionality
 */

export interface MonitorCall {
  callId: string;
  userId?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'active' | 'completed' | 'failed' | 'abandoned';
  intent?: string;
  outcome?: string;
  promptVersionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MonitorMessage {
  messageId: string;
  callId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  nodeId?: string;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
  evalOk: boolean;
  reviewOk: boolean;
  evalClass?: string;
  createdAt: string;
}

export interface MonitorMessageClass {
  classId: string;
  className: string;
  description?: string;
  frequency: number;
  createdAt: string;
  updatedAt: string;
}

export interface MonitorPattern {
  patternId: string;
  patternType: 'flow' | 'decision' | 'failure';
  description?: string;
  frequency: number;
  exampleCallIds?: string[];
  detectedAt: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MonitorStatistics {
  total: number;
  completed: number;
  failed: number;
  abandoned: number;
  active: number;
  avgDuration: number | null;
}
