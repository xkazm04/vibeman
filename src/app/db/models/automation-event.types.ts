/**
 * Automation Session Event Types
 * TypeScript interfaces for real-time event tracking during automation sessions
 */

import type { GoalCandidate, GoalEvaluationResult, AutomationSessionPhase, StructuredEvidence } from '@/lib/standupAutomation/types';

// ============ Event Type Definitions ============

/**
 * All possible event types for automation sessions
 */
export type AutomationEventType =
  | 'file_read'      // Claude Code reading a file
  | 'finding'        // Notable observation during exploration
  | 'progress'       // Progress percentage update
  | 'candidate'      // Draft goal candidate being formed
  | 'evaluation'     // Goal evaluation in progress
  | 'phase_change'   // Session phase transition
  | 'error';         // Error during automation

// ============ Event Data Payloads ============

/**
 * Data for file_read events
 */
export interface FileReadEventData {
  file: string;              // File path relative to project root
  linesRead?: number;        // Number of lines read
  purpose?: string;          // Why this file was read
}

/**
 * Data for finding events
 */
export interface FindingEventData {
  finding: string;           // Description of what was found
  file?: string;             // File path if applicable
  line?: number;             // Line number if applicable
  category?: 'pattern' | 'issue' | 'opportunity' | 'dependency' | 'other';
  severity?: 'info' | 'low' | 'medium' | 'high';
}

/**
 * Data for progress events
 */
export interface ProgressEventData {
  progress: number;          // 0-100
  message: string;           // Human-readable status message
  phase?: AutomationSessionPhase;
  details?: Record<string, unknown>;
}

/**
 * Data for candidate events (draft goal candidates)
 */
export interface CandidateEventData {
  candidate: Partial<GoalCandidate>;
  status: 'draft' | 'refined' | 'finalized';
}

/**
 * Data for evaluation events
 */
export interface EvaluationEventData {
  goalId: string;
  goalTitle: string;
  evaluation: Partial<GoalEvaluationResult>;
  hypothesesChecked?: number;
  hypothesesVerified?: number;
}

/**
 * Data for phase_change events
 */
export interface PhaseChangeEventData {
  previousPhase: AutomationSessionPhase;
  newPhase: AutomationSessionPhase;
  reason?: string;
}

/**
 * Data for error events
 */
export interface ErrorEventData {
  message: string;
  code?: string;
  recoverable: boolean;
  context?: Record<string, unknown>;
}

/**
 * Union type for all event data
 */
export type AutomationEventData =
  | FileReadEventData
  | FindingEventData
  | ProgressEventData
  | CandidateEventData
  | EvaluationEventData
  | PhaseChangeEventData
  | ErrorEventData;

// ============ Database Model ============

/**
 * Database representation of an automation session event
 */
export interface DbAutomationSessionEvent {
  id: string;
  session_id: string;
  event_type: AutomationEventType;
  timestamp: string;
  data: string;              // JSON-serialized event data
}

/**
 * Parsed automation session event with typed data
 */
export interface AutomationSessionEvent<T extends AutomationEventData = AutomationEventData> {
  id: string;
  sessionId: string;
  eventType: AutomationEventType;
  timestamp: string;
  data: T;
}

// ============ API Request Types ============

/**
 * Request payload for submitting an event via API
 */
export interface SubmitEventRequest {
  sessionId: string;
  type: AutomationEventType;
  data: AutomationEventData;
}

/**
 * Response when submitting an event
 */
export interface SubmitEventResponse {
  success: boolean;
  eventId: string;
  timestamp: string;
}

// ============ SSE Stream Types ============

/**
 * SSE message format for streaming events to clients
 */
export interface SSEEventMessage {
  id: string;
  event: AutomationEventType;
  data: AutomationEventData;
  timestamp: string;
  sessionId: string;
}

// ============ Type Guards ============

export function isFileReadEvent(data: AutomationEventData): data is FileReadEventData {
  return 'file' in data && typeof (data as FileReadEventData).file === 'string';
}

export function isFindingEvent(data: AutomationEventData): data is FindingEventData {
  return 'finding' in data && typeof (data as FindingEventData).finding === 'string';
}

export function isProgressEvent(data: AutomationEventData): data is ProgressEventData {
  return 'progress' in data && typeof (data as ProgressEventData).progress === 'number';
}

export function isCandidateEvent(data: AutomationEventData): data is CandidateEventData {
  return 'candidate' in data && 'status' in data;
}

export function isEvaluationEvent(data: AutomationEventData): data is EvaluationEventData {
  return 'goalId' in data && 'evaluation' in data;
}

export function isPhaseChangeEvent(data: AutomationEventData): data is PhaseChangeEventData {
  return 'previousPhase' in data && 'newPhase' in data;
}

export function isErrorEvent(data: AutomationEventData): data is ErrorEventData {
  return 'message' in data && 'recoverable' in data;
}
