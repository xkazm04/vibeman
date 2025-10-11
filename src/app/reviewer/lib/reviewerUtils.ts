/**
 * Reviewer Utility Functions
 * Pure helper functions for reviewer operations
 */

import { ReviewFile, ReviewSession, LanguageMap } from './reviewerTypes';

/**
 * Language mapping for Monaco editor
 */
const LANGUAGE_MAP: LanguageMap = {
  'ts': 'typescript',
  'tsx': 'typescript',
  'js': 'javascript',
  'jsx': 'javascript',
  'py': 'python',
  'java': 'java',
  'cpp': 'cpp',
  'c': 'c',
  'h': 'c',
  'css': 'css',
  'scss': 'scss',
  'html': 'html',
  'md': 'markdown',
  'json': 'json',
  'yaml': 'yaml',
  'yml': 'yaml',
  'xml': 'xml',
  'sql': 'sql'
};

/**
 * Get Monaco editor language from file path
 */
export function getLanguageFromFilepath(filepath: string): string {
  const extension = filepath.split('.').pop()?.toLowerCase();
  return LANGUAGE_MAP[extension || ''] || 'plaintext';
}

/**
 * Calculate total files across all sessions
 */
export function calculateTotalFiles(sessions: ReviewSession[]): number {
  return sessions.reduce((sum, session) => sum + session.files.length, 0);
}

/**
 * Calculate global file index across all sessions
 */
export function calculateGlobalFileIndex(
  sessions: ReviewSession[],
  currentSessionIndex: number,
  currentFileIndex: number
): number {
  const filesBeforeCurrentSession = sessions
    .slice(0, currentSessionIndex)
    .reduce((sum, session) => sum + session.files.length, 0);
  
  return filesBeforeCurrentSession + currentFileIndex;
}

/**
 * Check if current position is first file
 */
export function isFirstFile(sessionIndex: number, fileIndex: number): boolean {
  return sessionIndex === 0 && fileIndex === 0;
}

/**
 * Check if current position is last file
 */
export function isLastFile(
  sessions: ReviewSession[],
  sessionIndex: number,
  fileIndex: number
): boolean {
  const lastSessionIndex = sessions.length - 1;
  const lastFileIndex = (sessions[sessionIndex]?.files.length || 1) - 1;
  
  return sessionIndex === lastSessionIndex && fileIndex === lastFileIndex;
}

/**
 * Remove file from session and clean up empty sessions
 */
export function removeFileFromSessions(
  sessions: ReviewSession[],
  sessionIndex: number,
  fileIndex: number
): {
  updatedSessions: ReviewSession[];
  newSessionIndex: number;
  newFileIndex: number;
  allSessionsEmpty: boolean;
} {
  const updatedSessions = [...sessions];
  
  // Remove file from current session
  updatedSessions[sessionIndex].files = updatedSessions[sessionIndex].files.filter(
    (_, index) => index !== fileIndex
  );

  let newSessionIndex = sessionIndex;
  let newFileIndex = fileIndex;

  // If session is empty, remove it
  if (updatedSessions[sessionIndex].files.length === 0) {
    updatedSessions.splice(sessionIndex, 1);
    
    // Check if all sessions are gone
    if (updatedSessions.length === 0) {
      return {
        updatedSessions,
        newSessionIndex: 0,
        newFileIndex: 0,
        allSessionsEmpty: true
      };
    }
    
    // Adjust session index if needed
    if (sessionIndex >= updatedSessions.length) {
      newSessionIndex = updatedSessions.length - 1;
    }
    newFileIndex = 0;
  } else {
    // Adjust file index within session if needed
    if (fileIndex >= updatedSessions[sessionIndex].files.length) {
      newFileIndex = updatedSessions[sessionIndex].files.length - 1;
    }
  }

  return {
    updatedSessions,
    newSessionIndex,
    newFileIndex,
    allSessionsEmpty: false
  };
}

/**
 * Format pending count display
 */
export function formatPendingCount(count: number): string {
  return count > 99 ? '99+' : count.toString();
}

/**
 * Get file action label
 */
export function getFileActionLabel(action: 'create' | 'update'): string {
  return action === 'create' ? 'New File' : 'Update File';
}

/**
 * Get content to apply (edited or original generated)
 */
export function getContentToApply(file: ReviewFile): string {
  return file.isEditing ? (file.editedContent || file.generated_content) : file.generated_content;
}

/**
 * Toggle file editing state
 */
export function toggleFileEditing(
  sessions: ReviewSession[],
  sessionIndex: number,
  fileIndex: number
): ReviewSession[] {
  const updatedSessions = [...sessions];
  const file = updatedSessions[sessionIndex].files[fileIndex];
  
  updatedSessions[sessionIndex].files[fileIndex] = {
    ...file,
    isEditing: !file.isEditing,
    editedContent: file.isEditing ? undefined : file.generated_content
  };
  
  return updatedSessions;
}

/**
 * Update file edited content
 */
export function updateFileContent(
  sessions: ReviewSession[],
  sessionIndex: number,
  fileIndex: number,
  content: string
): ReviewSession[] {
  const updatedSessions = [...sessions];
  
  updatedSessions[sessionIndex].files[fileIndex] = {
    ...updatedSessions[sessionIndex].files[fileIndex],
    editedContent: content
  };
  
  return updatedSessions;
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(
  currentFileIndex: number,
  totalFiles: number
): number {
  if (totalFiles === 0) return 0;
  return ((currentFileIndex + 1) / totalFiles) * 100;
}
