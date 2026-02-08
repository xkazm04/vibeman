/**
 * File operation error classification and handling utilities
 * Provides user-friendly error messages for common file operation failures
 */

import { FilePath } from '../../../../../utils/pathUtils';

export type FileOperationErrorType =
  | 'file_not_found'
  | 'permission_denied'
  | 'write_conflict'
  | 'network_timeout'
  | 'disk_full'
  | 'file_locked'
  | 'invalid_path'
  | 'unknown';

export interface FileOperationError {
  type: FileOperationErrorType;
  title: string;
  message: string;
  suggestions: string[];
  canRetry: boolean;
  canFallbackToReadOnly: boolean;
}

/**
 * Classifies an error response from file operations into a specific error type
 */
export function classifyFileError(
  errorMessage: string,
  statusCode?: number
): FileOperationErrorType {
  const msg = errorMessage.toLowerCase();

  // Check for file not found errors
  if (
    msg.includes('enoent') ||
    msg.includes('not found') ||
    msg.includes('no such file') ||
    msg.includes('does not exist') ||
    statusCode === 404
  ) {
    return 'file_not_found';
  }

  // Check for permission errors
  if (
    msg.includes('eacces') ||
    msg.includes('eperm') ||
    msg.includes('permission denied') ||
    msg.includes('access denied') ||
    msg.includes('not permitted') ||
    statusCode === 403
  ) {
    return 'permission_denied';
  }

  // Check for write conflict/lock errors
  if (
    msg.includes('ebusy') ||
    msg.includes('locked') ||
    msg.includes('in use') ||
    msg.includes('conflict') ||
    msg.includes('being used') ||
    statusCode === 409
  ) {
    return 'write_conflict';
  }

  // Check for network/timeout errors
  if (
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('etimedout') ||
    msg.includes('network') ||
    msg.includes('connection') ||
    msg.includes('fetch failed') ||
    statusCode === 408 ||
    statusCode === 504
  ) {
    return 'network_timeout';
  }

  // Check for disk space errors
  if (
    msg.includes('enospc') ||
    msg.includes('no space') ||
    msg.includes('disk full') ||
    msg.includes('quota exceeded')
  ) {
    return 'disk_full';
  }

  // Check for file locked errors
  if (
    msg.includes('file is locked') ||
    msg.includes('resource busy')
  ) {
    return 'file_locked';
  }

  // Check for invalid path errors
  if (
    msg.includes('einval') ||
    msg.includes('invalid path') ||
    msg.includes('illegal') ||
    msg.includes('malformed')
  ) {
    return 'invalid_path';
  }

  return 'unknown';
}

/**
 * Gets detailed error information for user display
 */
export function getFileOperationErrorDetails(
  errorType: FileOperationErrorType,
  filePath: string,
  operation: 'read' | 'write'
): FileOperationError {
  const fileName = FilePath.from(filePath).fileName;

  switch (errorType) {
    case 'file_not_found':
      return {
        type: errorType,
        title: 'File Not Found',
        message: `The file "${fileName}" could not be found. It may have been moved, renamed, or deleted.`,
        suggestions: [
          'Refresh the file tree to see current files',
          'Check if the file was recently moved or renamed',
          'Verify the file path is correct',
        ],
        canRetry: true,
        canFallbackToReadOnly: false,
      };

    case 'permission_denied':
      return {
        type: errorType,
        title: 'Permission Denied',
        message: operation === 'write'
          ? `You don't have permission to save changes to "${fileName}".`
          : `You don't have permission to read "${fileName}".`,
        suggestions: [
          'Check file permissions in your operating system',
          'Run the application with appropriate privileges',
          'Verify you own the file or have write access',
          operation === 'write' ? 'Try saving to a different location' : '',
        ].filter(Boolean),
        canRetry: false,
        canFallbackToReadOnly: operation === 'write',
      };

    case 'write_conflict':
      return {
        type: errorType,
        title: 'Write Conflict',
        message: `The file "${fileName}" was modified by another process. Your changes may conflict with external changes.`,
        suggestions: [
          'Reload the file to see the latest version',
          'Copy your changes before retrying',
          'Close other applications that may be editing this file',
          'Try again after the other process completes',
        ],
        canRetry: true,
        canFallbackToReadOnly: true,
      };

    case 'network_timeout':
      return {
        type: errorType,
        title: 'Request Timeout',
        message: `The ${operation} operation took too long to complete. The file server may be slow or unreachable.`,
        suggestions: [
          'Check your network connection',
          'Wait a moment and try again',
          'The file may be too large for the current timeout',
          'Verify the local server is running',
        ],
        canRetry: true,
        canFallbackToReadOnly: operation === 'write',
      };

    case 'disk_full':
      return {
        type: errorType,
        title: 'Disk Full',
        message: `Cannot save "${fileName}" because the disk is full or quota exceeded.`,
        suggestions: [
          'Free up disk space by removing unnecessary files',
          'Check available disk space',
          'Save to a different drive with more space',
        ],
        canRetry: false,
        canFallbackToReadOnly: true,
      };

    case 'file_locked':
      return {
        type: errorType,
        title: 'File Locked',
        message: `The file "${fileName}" is currently locked by another application.`,
        suggestions: [
          'Close other applications that may have the file open',
          'Wait for the other process to release the file',
          'Check for any running scripts or builds that use this file',
        ],
        canRetry: true,
        canFallbackToReadOnly: true,
      };

    case 'invalid_path':
      return {
        type: errorType,
        title: 'Invalid Path',
        message: `The file path contains invalid characters or is malformed.`,
        suggestions: [
          'Check for special characters in the file path',
          'Verify the path format is correct for your OS',
          'Avoid using reserved characters in file names',
        ],
        canRetry: false,
        canFallbackToReadOnly: false,
      };

    default:
      return {
        type: errorType,
        title: 'Unexpected Error',
        message: `An unexpected error occurred while trying to ${operation} "${fileName}".`,
        suggestions: [
          'Try the operation again',
          'Refresh the file tree and try again',
          'Check the browser console for more details',
          'Report this issue if it persists',
        ],
        canRetry: true,
        canFallbackToReadOnly: operation === 'write',
      };
  }
}
