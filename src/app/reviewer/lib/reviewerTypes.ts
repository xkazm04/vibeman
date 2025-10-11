/**
 * Reviewer Module Type Definitions
 * Centralized type definitions for code review functionality
 */

/**
 * Review file with editing state
 * Matches DbGeneratedFile structure from codeGenerationDatabase
 */
export interface ReviewFile {
  id: string;
  session_id: string;
  filepath: string;
  action: 'create' | 'update';
  generated_content: string;
  original_content: string | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  applied_at: string | null;
  isEditing?: boolean;
  editedContent?: string;
}

/**
 * Review session grouping files from same task
 */
export interface ReviewSession {
  sessionId: string;
  taskTitle?: string;
  files: ReviewFile[];
}

/**
 * Pending count response
 */
export interface PendingCountResponse {
  count: number;
  success: boolean;
}

/**
 * Pending sessions response
 */
export interface PendingSessionsResponse {
  sessions: ReviewSession[];
  success: boolean;
}

/**
 * File action response
 */
export interface FileActionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Accept file request payload
 */
export interface AcceptFileRequest {
  fileId: string;
  content: string;
}

/**
 * Reject file request payload
 */
export interface RejectFileRequest {
  fileId: string;
}

/**
 * Decline session request payload
 */
export interface DeclineSessionRequest {
  sessionId: string;
}

/**
 * File action types
 */
export type FileAction = 'create' | 'update';

/**
 * Language mapping type
 */
export type LanguageMap = Record<string, string>;
